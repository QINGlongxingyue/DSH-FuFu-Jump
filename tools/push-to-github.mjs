/**
 * 用 GitHub REST API 把本地插件包推上去（不依赖 git）。
 *
 * 为什么要走 API：这台机器上 git 的 TLS 走 Windows schannel 会握手失败
 * （`schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS`），
 * 而 Node 自带 OpenSSL，fetch 到 api.github.com 是通的。
 *
 * 用法（一般由 tools/push-to-github.ps1 调起）：
 *   node tools/push-to-github.mjs <payload.json>
 * payload.json: { repo, branch, message, files: [{ path, abs }] }
 * token 从环境变量 GH_TOKEN 读。
 */
import fs from 'node:fs'
import path from 'node:path'

const API = 'https://api.github.com'
const TOKEN = process.env.GH_TOKEN
if (!TOKEN) {
  console.error('缺少 GH_TOKEN 环境变量')
  process.exit(1)
}

const payloadPath = process.argv[2]
if (!payloadPath) {
  console.error('用法: node push-to-github.mjs <payload.json>')
  process.exit(1)
}
const { repo, branch = 'main', message, files } = JSON.parse(fs.readFileSync(payloadPath, 'utf8'))

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'fufu-jump-dsh-push',
  'Content-Type': 'application/json',
}

const api = async (method, url, body) => {
  // 这台机器到 GitHub 的连接偶发超时（ConnectTimeoutError），所以带重试
  let lastErr = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url.startsWith('http') ? url : API + url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const text = await res.text()
      let json = null
      try { json = text ? JSON.parse(text) : null } catch (err) { /* 非 JSON 响应 */ }
      return { status: res.status, ok: res.ok, json, text }
    } catch (err) {
      lastErr = err
      const why = err.cause ? err.cause.message : err.message
      console.log(`  ${method} ${url} 第 ${attempt} 次失败：${why}`)
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1500 * attempt))
    }
  }
  console.error(`请求失败（重试 3 次）：${lastErr && (lastErr.cause ? lastErr.cause.message : lastErr.message)}`)
  process.exit(1)
}

// ── 0. 认证 + 仓库检查 ────────────────────────────────────────────────
const me = await api('GET', '/user')
if (!me.ok) {
  console.error(`token 无效或没权限: HTTP ${me.status} ${me.text.slice(0, 200)}`)
  process.exit(1)
}
console.log(`已认证为 ${me.json.login}`)

const repoInfo = await api('GET', `/repos/${repo}`)
if (!repoInfo.ok) {
  console.error(`拿不到仓库 ${repo}: HTTP ${repoInfo.status} ${repoInfo.text.slice(0, 200)}`)
  process.exit(1)
}
if (!repoInfo.json.permissions || !repoInfo.json.permissions.push) {
  console.error('这个 token 对该仓库没有写权限（需要 repo 权限 / Contents: Read and write）')
  process.exit(1)
}
console.log(`仓库 ${repo}（${repoInfo.json.private ? '私有' : '公开'}），默认分支 ${repoInfo.json.default_branch}`)

// ── 1. 取分支当前 commit 与树 ─────────────────────────────────────────
const refRes = await api('GET', `/repos/${repo}/git/ref/heads/${branch}`)
let baseCommit = null
let baseTree = null
if (refRes.ok) {
  baseCommit = refRes.json.object.sha
  const c = await api('GET', `/repos/${repo}/git/commits/${baseCommit}`)
  baseTree = c.json.tree.sha
  console.log(`分支 ${branch} 当前 commit ${baseCommit.slice(0, 8)}，树 ${baseTree.slice(0, 8)}`)
} else if (refRes.status === 404) {
  console.log(`分支 ${branch} 还不存在，会新建`)
} else {
  console.error(`取分支失败: HTTP ${refRes.status} ${refRes.text.slice(0, 200)}`)
  process.exit(1)
}

// ── 2. 逐个上传 blob ─────────────────────────────────────────────────
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'])
const tree = []
let done = 0
for (const f of files) {
  const buf = fs.readFileSync(f.abs)
  const ext = path.extname(f.abs).toLowerCase()
  const isText = !IMAGE_EXT.has(ext)
  const blob = await api('POST', `/repos/${repo}/git/blobs`, {
    content: isText ? buf.toString('utf8') : buf.toString('base64'),
    encoding: isText ? 'utf-8' : 'base64',
  })
  if (!blob.ok) {
    console.error(`上传 ${f.path} 失败: HTTP ${blob.status} ${blob.text.slice(0, 200)}`)
    process.exit(1)
  }
  tree.push({
    path: f.path,
    mode: '100644',
    type: 'blob',
    sha: blob.json.sha,
  })
  done += 1
  const kb = (buf.length / 1024).toFixed(0)
  console.log(`  [${done}/${files.length}] ${f.path}  (${kb} KB)`)
}

// ── 3. 建树（base_tree 让没提到的文件保留）───────────────────────────
const newTree = await api('POST', `/repos/${repo}/git/trees`, baseTree ? { base_tree: baseTree, tree } : { tree })
if (!newTree.ok) {
  console.error(`建树失败: HTTP ${newTree.status} ${newTree.text.slice(0, 300)}`)
  process.exit(1)
}

// ── 4. 建 commit ─────────────────────────────────────────────────────
const commit = await api('POST', `/repos/${repo}/git/commits`, {
  message,
  tree: newTree.json.sha,
  parents: baseCommit ? [baseCommit] : [],
})
if (!commit.ok) {
  console.error(`建 commit 失败: HTTP ${commit.status} ${commit.text.slice(0, 300)}`)
  process.exit(1)
}

// ── 5. 更新/创建分支引用 ─────────────────────────────────────────────
const upd = baseCommit
  ? await api('PATCH', `/repos/${repo}/git/refs/heads/${branch}`, { sha: commit.json.sha, force: false })
  : await api('POST', `/repos/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: commit.json.sha })
if (!upd.ok) {
  console.error(`更新分支失败: HTTP ${upd.status} ${upd.text.slice(0, 300)}`)
  process.exit(1)
}

console.log('')
console.log(`✅ 推送完成: https://github.com/${repo}/commit/${commit.json.sha}`)
console.log(`   分支 ${branch} -> ${commit.json.sha.slice(0, 8)}，共 ${files.length} 个文件`)

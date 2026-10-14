/** 用 ~/.git-credentials 里的 token 验证仓库改名是否生效。token 只留在内存。 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const credFile = path.join(os.homedir(), '.git-credentials')
const line = fs.readFileSync(credFile, 'utf8').split(/\r?\n/).find((l) => l.includes('github.com'))
const m = /^https?:\/\/([^:]+):([^@]+)@/.exec(line.trim())
if (!m) {
  console.error('解析 .git-credentials 失败')
  process.exit(1)
}
const TOKEN = m[2]

const H = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'dsh-push-check',
}

async function get(url, tries = 3) {
  let last
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { headers: H })
      return { status: r.status, json: await r.json().catch(() => null) }
    } catch (e) {
      last = e
      console.log(`  第 ${i} 次失败：${e.cause ? e.cause.message : e.message}，重试…`)
      await new Promise((res) => setTimeout(res, 1500 * i))
    }
  }
  throw last
}

const me = await get('https://api.github.com/user')
console.log(`token 属于: ${me.json && me.json.login}  (HTTP ${me.status})`)

const repos = await get('https://api.github.com/user/repos?per_page=100&sort=pushed')
if (Array.isArray(repos.json)) {
  console.log('最近推送过的仓库:')
  for (const r of repos.json.slice(0, 10)) {
    console.log(`  - ${r.full_name}  (${r.private ? '私有' : '公开'}, size=${r.size}KB, pushed=${r.pushed_at})`)
  }
}

for (const name of ['QINGlongxingyue/DSH-FuFu-Jump', 'QINGlongxingyue/fufu-jump-DSH']) {
  const r = await get(`https://api.github.com/repos/${name}`)
  console.log(`\n${name} -> HTTP ${r.status}`, r.json && (r.json.full_name || r.json.message))
  if (r.status === 200) {
    const c = await get(`https://api.github.com/repos/${name}/contents/`)
    console.log('  根目录:', Array.isArray(c.json) ? c.json.map((x) => x.name).join(', ') || '(空)' : '?')
    console.log('  permissions:', JSON.stringify(r.json.permissions))
  }
}

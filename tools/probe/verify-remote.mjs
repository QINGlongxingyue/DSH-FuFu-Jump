/**
 * 逐文件比对「远程仓库」和「本机工作区」，并用**下载下来的那份**跑一遍冒烟测试，
 * 回答「直接 Download ZIP 能不能用」。远程文件全部从 GitHub 拉，不用本机文件。
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const WS = 'C:/Users/Starfarer/Desktop/game/DSHsudio/dsh-whale-wallpaper'
const REPO = 'QINGlongxingyue/DSH-FuFu-Jump'
const OUT = 'C:/Users/Starfarer/Desktop/game/DSHsudio/tools/probe/downloaded'

const line = fs.readFileSync(path.join(os.homedir(), '.git-credentials'), 'utf8')
  .split(/\r?\n/).find((l) => l.includes('github.com'))
const TOKEN = /^https?:\/\/[^:]+:([^@]+)@/.exec(line.trim())[1]
const H = { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'verify' }

async function get(url, raw = false, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { headers: raw ? { ...H, Accept: 'application/vnd.github.raw' } : { ...H, Accept: 'application/vnd.github+json' } })
      if (r.status >= 500 && i < tries) { await new Promise((x) => setTimeout(x, 2000 * i)); continue }
      return { status: r.status, raw: raw ? await r.text() : await r.json() }
    } catch (e) {
      if (i === tries) throw e
      await new Promise((x) => setTimeout(x, 1500 * i))
    }
  }
}

const head = await get(`https://api.github.com/repos/${REPO}/commits/main`)
const remoteSha = head.raw.sha
console.log(`远程 main = ${remoteSha}  (${head.raw.commit.author.date})`)
console.log(`   ${head.raw.commit.message.split('\n')[0]}\n`)

// 1) 本地 git HEAD 是不是同一个 commit
const localHead = fs.readFileSync(path.join('C:/Users/Starfarer/Desktop/game/DSHsudio/fufu-jump-DSH/.git/refs/heads/main'), 'utf8').trim()
console.log(`本地 main = ${localHead}  ${localHead === remoteSha ? '✅ 同一个 commit' : '❌ 不一致'}\n`)

// 2) 逐文件：远程内容哈希 vs 工作区
const tree = await get(`https://api.github.com/repos/${REPO}/git/trees/main?recursive=1`)
const blobs = tree.raw.tree.filter((x) => x.type === 'blob')
console.log(`远程 ${blobs.length} 个文件，逐个和线上的插件目录比对：`)
const pairs = [
  ['src/wallpaper.js', `${WS}/src/wallpaper.js`],
  ['src/styles.js', `${WS}/src/styles.js`],
  ['src/client.js', `${WS}/src/client.js`],
  ['lib/index.js', `${WS}/lib/index.js`],
  ['lib/client.js', `${WS}/lib/client.js`],
  ['cordis.patch.yml', `${WS}/cordis.patch.yml`],
  ['assets/wallpaper.jpg', `${WS}/assets/wallpaper.jpg`],
  ['assets/whale-dance-1.webp', `${WS}/assets/whale-dance-1.webp`],
  ['assets/whale-dance-2.webp', `${WS}/assets/whale-dance-2.webp`],
]
let same = 0
for (const [rpath, lpath] of pairs) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${rpath}`, { headers: { ...H, Accept: 'application/vnd.github.raw' } })
  const buf = Buffer.from(await r.arrayBuffer())
  const rHash = createHash('sha256').update(buf).digest('hex').slice(0, 12)
  const lHash = fs.existsSync(lpath)
    ? createHash('sha256').update(fs.readFileSync(lpath)).digest('hex').slice(0, 12)
    : '(本地缺)'
  const ok = rHash === lHash
  if (ok) same++
  console.log(`  ${ok ? '✅' : '❌'} ${rpath.padEnd(26)} 远程 ${String(buf.length).padStart(8)}B ${rHash}   本机 ${lHash}`)
}
console.log(`\n一致 ${same}/${pairs.length}`)

// 3) 把远程那份整个抓下来，落到磁盘（模拟 Download ZIP）
fs.rmSync(OUT, { recursive: true, force: true })
for (const b of blobs) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${b.path}`, { headers: { ...H, Accept: 'application/vnd.github.raw' } })
  if (!r.ok) { console.log(`  ⚠️ 拉取失败 ${b.path}: HTTP ${r.status}`); continue }
  const dest = path.join(OUT, b.path)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()))
}
console.log(`\n已把远程全部内容落到: ${OUT}`)

// 4) 模拟 Download ZIP 之后的结构检查
const need = ['package.json', 'cordis.patch.yml', 'lib/index.js', 'lib/client.js',
  'assets/wallpaper.jpg', 'assets/whale-dance-1.webp', 'assets/whale-dance-2.webp']
console.log('Download ZIP 后的可用性检查:')
for (const f of need) {
  const p = path.join(OUT, f)
  console.log(`  ${fs.existsSync(p) ? '✅' : '❌'} ${f}${fs.existsSync(p) ? `  (${fs.statSync(p).size} B)` : '  缺失'}`)
}
const pkg = JSON.parse(fs.readFileSync(path.join(OUT, 'package.json'), 'utf8'))
const patchPath = path.join(OUT, pkg.dsh.bundle.patch.replace(/^\.\//, ''))
console.log(`  ${fs.existsSync(patchPath) ? '✅' : '❌'} dsh.bundle.patch -> ${pkg.dsh.bundle.patch} 文件存在`)
console.log(`  包名 ${pkg.name} / main ${pkg.main} / 版本 ${pkg.version}`)

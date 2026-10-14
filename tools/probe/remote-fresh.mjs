/** 远程仓库状态 + 逐个文件与本地比对（回答「仓库是不是最新」）。 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const REPO = 'QINGlongxingyue/DSH-FuFu-Jump'
const LOCAL = 'C:/Users/Starfarer/Desktop/game/DSHsudio/fufu-jump-DSH'
const line = fs.readFileSync(path.join(os.homedir(), '.git-credentials'), 'utf8')
  .split(/\r?\n/).find((l) => l.includes('github.com'))
const TOKEN = /^https?:\/\/[^:]+:([^@]+)@/.exec(line.trim())[1]
const H = { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'verify' }

async function j(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { headers: { ...H, Accept: 'application/vnd.github+json' } })
      if (r.status >= 500 && i < tries) { await new Promise((x) => setTimeout(x, 1500 * i)); continue }
      return r.json()
    } catch (e) { if (i === tries) throw e; await new Promise((x) => setTimeout(x, 1500 * i)) }
  }
}
async function raw(p) {
  for (let i = 1; i <= 4; i++) {
    try {
      const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${p}`, { headers: { ...H, Accept: 'application/vnd.github.raw' } })
      if (r.status >= 500 && i < 4) { await new Promise((x) => setTimeout(x, 1500 * i)); continue }
      return Buffer.from(await r.arrayBuffer())
    } catch (e) { if (i === 4) throw e; await new Promise((x) => setTimeout(x, 1500 * i)) }
  }
}

const head = await j(`https://api.github.com/repos/${REPO}/commits/main`)
console.log(`远程 main      = ${head.sha}`)
console.log(`  ${head.commit.message.split('\n')[0]}  @ ${head.commit.author.date}`)

const localHead = fs.readFileSync(path.join(LOCAL, '.git/refs/heads/main'), 'utf8').trim()
console.log(`本地 git HEAD  = ${localHead}   ${localHead === head.sha ? '✅ 一致' : '⬅ 本地还有提交没推'}\n`)

const tree = await j(`https://api.github.com/repos/${REPO}/git/trees/main?recursive=1`)
const blobs = tree.tree.filter((x) => x.type === 'blob')
console.log(`远程文件 ${blobs.length} 个，逐个与本地比对：`)
let same = 0
let diff = 0
for (const b of blobs) {
  const remote = await raw(b.path)
  const lp = path.join(LOCAL, b.path)
  if (!fs.existsSync(lp)) { console.log(`  ⚠️ 本地缺 ${b.path}`); diff++; continue }
  const lh = createHash('sha256').update(fs.readFileSync(lp)).digest('hex')
  const rh = createHash('sha256').update(remote).digest('hex')
  if (lh === rh) same++
  else { console.log(`  ❌ 不一致 ${b.path}  (远程 ${remote.length}B / 本地 ${fs.statSync(lp).size}B)`); diff++ }
}
console.log(`\n一致 ${same} / 不一致 ${diff}`)

// 关键产物自检
const client = (await raw('lib/client.js')).toString('utf8')
console.log('\n产物里的关键点：')
console.log(`  ✅ 含 .dshwv-root 选择器        : ${/\.dshwv-root \.dshwv-bshape/.test(client)}`)
console.log(`  ✅ 不含错误选择器 #dsh-whale-widget: ${!/#dsh-whale-widget \.dshwv/.test(client)}`)
console.log(`  ✅ 含 whaleBubble 三档          : ${/translucent/.test(client) && /fill-opacity/.test(client)}`)
console.log(`  ✅ 含自定义壁纸                 : ${/dshww-custom-wallpaper/.test(client)}`)
console.log(`  ✅ 含弹窗保护                   : ${/keep-opaque/.test(client)}`)
console.log(`  ✅ 含满员停分裂                 : ${/splitPause/.test(client)}`)

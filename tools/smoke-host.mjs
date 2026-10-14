// 宿主半侧冒烟测试：用假的 root 上下文跑 lib/index.js 的 apply/effect，
// 检查注册了哪些路由、注入表里有什么，并把路由当 HTTP handler 真的调一遍。
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// 让插件的自检日志落在工作区里，别去动真实的 $DSH_HOME
const TMP_HOME = path.join(process.cwd(), 'tools', 'probe', 'home')
fs.mkdirSync(TMP_HOME, { recursive: true })
process.env.DSH_HOME = TMP_HOME
// 每次从干净状态跑：删掉上一次留下的日志与设置
for (const f of ['.dshw-wallpaper.log', '.dshw-wallpaper-settings.json']) {
  try { fs.rmSync(path.join(TMP_HOME, f), { force: true }) } catch (err) {}
}

const ENTRY = process.argv[2] || 'dsh-whale-wallpaper/lib/index.js'
const mod = await import(pathToFileURL(ENTRY).href)
const plugin = mod.default
assert.ok(plugin && plugin.name === 'dsh-whale-wallpaper', '默认导出必须是带 name 的插件对象')

// ---- 假 root ---------------------------------------------------------------
const routes = new Map()
const disposers = []
const injectHandlers = new Map()

const fakeRes = () => {
  const chunks = []
  return {
    statusCode: 0,
    headers: null,
    chunks,
    writeHead(code, headers) { this.statusCode = code; this.headers = headers || {} },
    end(body) { if (body !== undefined && body !== null) chunks.push(body) },
    body() {
      const parts = this.chunks.map((c) => (Buffer.isBuffer(c) ? c : Buffer.from(String(c))))
      return Buffer.concat(parts)
    },
  }
}

const webServer = {
  register(route) {
    assert.ok(route && route.kind === 'exact', '只允许 exact 路由')
    assert.ok(!routes.has(route.path), '路由重复注册：' + route.path)
    routes.set(route.path, route)
    const d = () => routes.delete(route.path)
    disposers.push(d)
    return d
  },
}

const root = {
  webServer,                       // 故意也直接挂一份，验证两条取服务的路径都行
  on(name, handler) {
    if (!injectHandlers.has(name)) injectHandlers.set(name, [])
    injectHandlers.get(name).push(handler)
    return () => {
      const list = injectHandlers.get(name) || []
      const i = list.indexOf(handler)
      if (i >= 0) list.splice(i, 1)
    }
  },
  inject(services, cb) {
    assert.deepEqual(services, ['webServer'], '应该只等服务 webServer')
    cb({ webServer })
    return () => {}
  },
  effect(cb) {
    const fn = cb()
    if (typeof fn === 'function') disposers.push(fn)
    return () => {}
  },
  get(name) { return name === 'webServer' ? webServer : undefined },
}

const config = {
  enabled: true,
  fit: 'cover',
  veil: 'rgba(4, 18, 38, 0.18)',
  transparentUI: true,
  pets: true,
  draggable: true,
  characters: [
    { id: 'bowl', src: 'whale-dance-1.webp', h: 28, x: 12, y: 80 },
    { id: 'lace', src: 'whale-dance-2.gif', h: 26, x: 84, y: 78 },
    { src: '../../etc/passwd', h: 10 },          // 必须被拒
    { src: 'nope.exe', h: 10 },                  // 扩展名不在白名单，必须被拒
  ],
}

plugin.apply(root, config)

console.log('注册的路由：')
for (const p of routes.keys()) console.log('  ' + p)

// ---- 注入表 --------------------------------------------------------------
const table = []
const handlers = injectHandlers.get('webserver/index-inject') || []
assert.equal(handlers.length, 1, '必须订阅 webserver/index-inject')
handlers[0](table)
handlers[0](table) // 再来一次，验证去重
console.log('注入表：', table.map((r) => `${r.kind}${r.name ? ':' + r.name : ''}`).join(', '))
assert.equal(table.filter((r) => r.kind === 'global').length, 1, 'global 行只应有一条')
assert.equal(table.filter((r) => r.kind === 'style').length, 1, 'style 行只应有一条')
assert.equal(table.filter((r) => r.kind === 'script').length, 1, 'script 行只应有一条')

const cfgRow = table.find((r) => r.kind === 'global')
assert.equal(cfgRow.name, '__DSH_WHALE_WALLPAPER__')
assert.equal(cfgRow.value.draggable, true, 'draggable 应下发给页面')
assert.equal(cfgRow.value.pets, true)
const names = cfgRow.value.characters.map((c) => c.src)
console.log('下发给页面的挂件：', names.join(', '))
assert.equal(cfgRow.value.characters.length, 2, '恶意/非法资源名必须被过滤掉')
assert.ok(!names.some((n) => n.includes('passwd') || n.includes('..')), '不能带出 assets 目录')
assert.equal(cfgRow.value.characters[0].x, 12, 'x 应原样下发')
assert.equal(cfgRow.value.characters[1].y, 78, 'y 应原样下发')
assert.ok(table.find((r) => r.kind === 'script').text.includes('/dsh-whale-wallpaper/client.js'))
JSON.stringify(table) // 注入行必须能 JSON 序列化（要经 IPC 送到页面）

// ---- 真的调一遍路由 ------------------------------------------------------
async function hit(pathname, method = 'GET') {
  const route = routes.get(pathname)
  assert.ok(route, '路由不存在：' + pathname)
  const res = fakeRes()
  await route.handler({ method, url: pathname, headers: { host: '127.0.0.1:19387' } }, res)
  return res
}

for (const p of ['/dsh-whale-wallpaper/wallpaper', '/dsh-whale-wallpaper/whale-dance-1.webp', '/dsh-whale-wallpaper/whale-dance-2.gif']) {
  const res = await hit(p)
  assert.equal(res.statusCode, 200, p + ' 应返回 200')
  const buf = res.body()
  assert.ok(buf.length > 1000, p + ' 内容太小，可能是错误信息：' + buf.toString('utf8').slice(0, 120))
  console.log(`  ${p} -> ${res.statusCode} ${res.headers['Content-Type']} ${buf.length}B`)
}

const js = await hit('/dsh-whale-wallpaper/client.js')
assert.equal(js.statusCode, 200)
const jsText = js.body().toString('utf8')
assert.ok(jsText.includes('dshww-pets'), 'client.js 里应有挂件层的装配代码')
assert.ok(jsText.includes('pointerdown'), 'client.js 里应有拖动监听')
console.log(`  /dsh-whale-wallpaper/client.js -> 200 ${jsText.length}B`)

const bad = await hit('/dsh-whale-wallpaper/wallpaper', 'POST')
assert.equal(bad.statusCode, 405, '非 GET 必须拒绝')
console.log('  POST /wallpaper -> 405')

// ---- 设置接口 ------------------------------------------------------------
async function call(pathname, method, body, expectBodyRead = true) {
  const route = routes.get(pathname)
  assert.ok(route, '路由不存在：' + pathname)
  const res = fakeRes()
  // 极简的可读流：把 body 塞进 on('data')/on('end')
  let done = false
  const req = {
    method,
    url: pathname,
    headers: { host: '127.0.0.1:19387' },
    setEncoding() {},
    on(type, fn) {
      if (type === 'data' && body) fn(body)
      else if (type === 'end') { done = true; fn() }
      return req
    },
    destroy() {},
  }
  await route.handler(req, res)
  if (expectBodyRead) assert.ok(done, 'handler 应该把请求体读完')
  return res
}

const settingsGet = await hit('/dsh-whale-wallpaper/settings.json')
assert.equal(settingsGet.statusCode, 200)
const settingsBody = JSON.parse(settingsGet.body().toString('utf8'))
assert.equal(settingsBody.ok, true, 'GET settings 应返回 ok')
assert.equal(settingsBody.physics.maxPets, 10, '默认上限应是 10')
assert.ok(settingsBody.defaults && settingsBody.defaults.gravity > 0, '应带上默认值')
console.log('  默认设置：maxPets=' + settingsBody.physics.maxPets + ' gravity=' + settingsBody.physics.gravity + ' floor=' + settingsBody.physics.floor)

const postRes = await call('/dsh-whale-wallpaper/settings.json', 'POST', JSON.stringify({ physics: { maxPets: 6, gravity: 900, floor: 0.9, wallpaper: false } }))
assert.equal(postRes.statusCode, 200)
const postBody = JSON.parse(postRes.body().toString('utf8'))
assert.equal(postBody.ok, true, 'POST 应写成功')
assert.equal(postBody.physics.maxPets, 6)
assert.equal(postBody.physics.gravity, 900)
assert.equal(postBody.physics.floor, 0.9)
assert.equal(postBody.physics.wallpaper, false, '布尔字段应能存 false')
assert.equal(postBody.physics.bounce, settingsBody.defaults.bounce, '没传的字段应沿用当前值')
console.log('  保存后：maxPets=' + postBody.physics.maxPets + ' gravity=' + postBody.physics.gravity
  + ' floor=' + postBody.physics.floor + ' wallpaper=' + postBody.physics.wallpaper)

const settingsFile = path.join(TMP_HOME, '.dshw-wallpaper-settings.json')
assert.ok(fs.existsSync(settingsFile), '设置应落盘到 ' + settingsFile)
console.log('  设置文件：' + settingsFile)

const reread = JSON.parse((await hit('/dsh-whale-wallpaper/settings.json')).body().toString('utf8'))
assert.equal(reread.physics.maxPets, 6, '重新读应拿到存过的值')

const resetRes = await call('/dsh-whale-wallpaper/settings.json', 'POST', JSON.stringify({ reset: true }))
const resetBody = JSON.parse(resetRes.body().toString('utf8'))
assert.equal(resetBody.physics.maxPets, 10, 'reset 应回到默认 10')
console.log('  重置后：maxPets=' + resetBody.physics.maxPets)

const clampRes = await call('/dsh-whale-wallpaper/settings.json', 'POST', JSON.stringify({ physics: { maxPets: 999, bounce: 5, ceiling: 0.9, floor: 0.1 } }))
const clampBody = JSON.parse(clampRes.body().toString('utf8'))
assert.ok(clampBody.physics.maxPets <= 60, 'maxPets 应被夹到上限：' + clampBody.physics.maxPets)
assert.ok(clampBody.physics.bounce <= 1, 'bounce 应被夹到 1：' + clampBody.physics.bounce)
assert.ok(clampBody.physics.floor >= clampBody.physics.ceiling, 'floor 不能低于 ceiling')
console.log('  越界夹取：maxPets=' + clampBody.physics.maxPets + ' bounce=' + clampBody.physics.bounce + ' floor=' + clampBody.physics.floor + ' ceiling=' + clampBody.physics.ceiling)
await call('/dsh-whale-wallpaper/settings.json', 'POST', JSON.stringify({ reset: true }))

// ---- 页面自检回传（桌面端排查靠这条通道）--------------------------------
const diagRes = await call('/dsh-whale-wallpaper/diag.json', 'POST', JSON.stringify({
  tag: 'client-mounted',
  href: 'http://127.0.0.1:1/?token=x',
  viewport: [1600, 900],
  canvasVar: { image: 'url("/dsh-whale-wallpaper/wallpaper")', size: 'cover', filter: 'none' },
  computed: { bodyBg: 'rgba(0, 0, 0, 0) | url(...)' },
  probes: [{ el: '#root', rect: [0, 0, 1600, 900], z: 'auto', bgColor: 'transparent' }],
}))
assert.equal(diagRes.statusCode, 200, 'diag 应回 200')
const diagFile = path.join(TMP_HOME, '.dshw-wallpaper-client.log')
assert.ok(fs.existsSync(diagFile), '自检报告应落盘：' + diagFile)
const diagText = fs.readFileSync(diagFile, 'utf8')
assert.ok(diagText.includes('client-mounted'), '报告里应有 tag')
assert.ok(diagText.includes('canvas 变量'), '报告里应有 canvas 变量')
assert.ok(diagText.includes('#root'), '报告里应有各层几何')
console.log('  页面自检回传 -> ' + diagFile + '（' + diagText.trim().split('\n').length + ' 行）')
const diagGet = await call('/dsh-whale-wallpaper/diag.json', 'GET', '', false)
assert.equal(diagGet.statusCode, 405, 'diag 只接受 POST')

// ---- 自检日志 ------------------------------------------------------------
const logPath = path.join(TMP_HOME, '.dshw-wallpaper.log')
assert.ok(fs.existsSync(logPath), '应写下自检日志：' + logPath)
const logText = fs.readFileSync(logPath, 'utf8')
assert.ok(logText.includes('路由全部就绪'), '日志里应写明路由就绪')
console.log('自检日志：')
for (const line of logText.trim().split('\n')) console.log('  ' + line.replace(/^\S+ /, ''))

// ---- 卸载 ----------------------------------------------------------------
for (const d of disposers) d()
assert.equal(routes.size, 0, '卸载后路由应清空')
assert.equal((injectHandlers.get('webserver/index-inject') || []).length, 0, '卸载后应取消订阅')
console.log('卸载后 routes=' + routes.size + '，订阅已解除')

console.log('\n宿主半侧冒烟测试全部通过 ✓')

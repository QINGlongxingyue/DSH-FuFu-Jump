/**
 * dsh-whale-wallpaper —— 宿主半侧
 *
 * 职责只有四件事：
 *   ① 把 assets/ 下的壁纸与挂件动图通过只读 HTTP 路由发给页面；
 *   ② 往 index 注入一条 global 行（前端配置）与一条 style 行（首屏底色）；
 *   ③ 注入一段内联 bootstrap，它自己去加载 /dsh-whale-wallpaper/client.js；
 *   ④ 写一份启动自检日志到 $DSH_HOME/.dshw-wallpaper.log（排查“装了但没反应”用）。
 *
 * 两条重要约束：
 *   · **所有依赖服务的代码都放进 root.inject(['webServer'], …)**。apply() 本身可能
 *     在 webServer 就绪之前被调用，此时 ctx.webServer 还不存在；直接用它会让整个
 *     插件行加载失败，而桌面端界面**不会有任何提示**，表现就是“装了什么都没有”。
 *   · 注入用“内联 bootstrap + script.src”，不用 script-src 行：官方桌面端的 index
 *     注入解释器对 script-src 是“加载失败即 reject 整个 boot”，路由一旦注销就会变成
 *     整个应用起不来的致命错误；内联行里自己建 script 标签并吞掉 onerror 更安全。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** 包根目录：lib/index.js -> 包根。软链/复制安装都能定位到 assets。 */
const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ASSET_ROOT = path.join(PACKAGE_ROOT, 'assets')
/** 浏览器侧代码：随包构建产物，开发时也可从 assets/client.js 取。 */
const CLIENT_CANDIDATES = [
  path.join(PACKAGE_ROOT, 'lib', 'client.js'),
  path.join(PACKAGE_ROOT, 'assets', 'client.js'),
]

const ROUTE_PREFIX = '/dsh-whale-wallpaper'
const CLIENT_ROUTE = `${ROUTE_PREFIX}/client.js`
const CONFIG_GLOBAL = '__DSH_WHALE_WALLPAPER__'
const SETTINGS_NAME = '.dshw-wallpaper-settings.json'

/** 物理与数量的默认值。y 向（重力/弹跳/上下边界）、壁纸开关、碰撞分裂都能在设置里改。 */
const PHYSICS_DEFAULTS = {
  wallpaper: true,      // 壁纸开关（设置面板里那个勾选框）
  uiClearLevel: 3,      // 界面通透档位：0 不动界面 / 1 只透大面板 / 2 连小块一起透 / 3 全透
  maxPets: 10,          // 上限：撞出来的挂件最多这么多个
  seedCount: 2,         // 清零/复位之后回到几个
  gravity: 1400,        // 重力 px/s²（越大掉得越快）
  bounce: 0.62,         // 落地反弹系数 0~1（1 = 一直弹）
  wallBounce: 0.78,     // 撞左右墙的反弹系数
  friction: 0.995,      // 每帧速度衰减（空气阻力）
  groundFriction: 0.86, // 贴地时的水平摩擦
  minBounce: 60,        // 竖直速度低于它就判定停稳，不再微弹
  splitImpulse: 240,    // 分裂时新挂件拿到的初速度
  splitCooldown: 2,     // 分裂冷却（秒）：撞裂一次之后要过这么久才允许再裂
  splitPause: 120,      // 分裂暂停（秒）：数量到达上限后停这么久不许再裂（默认 2 分钟）
  eliminateDelay: 10,   // 同类对消：数量满员并保持这么久（秒）之后开始消
  eliminateInterval: 2, // 同类对消：每这么久（秒）消掉一对同种布偶
  idleSpawnInterval: 120, // 挂机奖励：连续这么久（秒）没碰键鼠就落一只新布偶（0 = 关闭）
  ceiling: 0.02,        // 上边界（视口高度百分比）
  // 下边界：动图素材底部自带约 4% 空白（角色包围盒），所以默认放到 1.02，
  // 让「元素的底」稍微沉到屏幕外一点，角色脚底才刚好落在地平线上。
  floor: 1.02,
}

/** 只服务的白名单扩展名 -> Content-Type，避免任意目录穿越。 */
const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
}

/** 默认配置；cordis.patch.yml 里的 config 会整体覆盖到上面。 */
const DEFAULTS = {
  enabled: true,
  fit: 'cover',
  veil: 'rgba(4, 18, 38, 0.18)',
  transparentUI: true,
  uiOpacity: 0.94,
  uiSaturate: 1.05,
  pets: true,
  draggable: true,
  characters: [
    { id: 'bowl', src: 'whale-dance-1.webp', h: 28, x: 12, y: 80, fill: 100, mirror: false, bob: 0, period: 2.4, alt: '鲸鱼娘·顶盆' },
    { id: 'lace', src: 'whale-dance-2.webp', h: 26, x: 84, y: 78, fill: 100, mirror: false, bob: 0, period: 2.4, alt: '鲸鱼娘·蕾丝' },
  ],
  brightness: 1,
  blur: 0,
}

const FITS = new Set(['cover', 'contain', 'fill', 'none', 'scale-down'])

function num(value, fallback, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function str(value, fallback, maxLen = 200) {
  if (typeof value !== 'string') return fallback
  const s = value.trim()
  if (!s) return fallback
  return s.slice(0, maxLen)
}

/** 物理设置的规范化依赖 num()，所以放在它下面。 */
function normalizePhysics(raw) {
  const cfg = raw && typeof raw === 'object' ? raw : {}
  const out = {}
  for (const key of Object.keys(PHYSICS_DEFAULTS)) {
    const def = PHYSICS_DEFAULTS[key]
    if (typeof def === 'boolean') out[key] = cfg[key] !== false && cfg[key] !== 0 && cfg[key] !== 'false'
    else if (key === 'uiClearLevel') out[key] = Math.round(num(cfg[key], def, 0, 3))
    else if (key === 'maxPets') out[key] = Math.round(num(cfg[key], def, 1, 60))
    else if (key === 'seedCount') out[key] = Math.round(num(cfg[key], def, 0, 60))
    else if (key === 'gravity') out[key] = num(cfg[key], def, 0, 20000)
    else if (key === 'splitImpulse') out[key] = num(cfg[key], def, 0, 4000)
    else if (key === 'splitCooldown') out[key] = num(cfg[key], def, 0, 30)
    else if (key === 'splitPause') out[key] = num(cfg[key], def, 0, 3600)
    else if (key === 'eliminateDelay') out[key] = num(cfg[key], def, 0, 600)
    else if (key === 'eliminateInterval') out[key] = num(cfg[key], def, 0.1, 120)
    else if (key === 'idleSpawnInterval') out[key] = num(cfg[key], def, 0, 3600)
    else if (key === 'minBounce') out[key] = num(cfg[key], def, 0, 2000)
    else if (key === 'ceiling' || key === 'floor') out[key] = num(cfg[key], def, -0.5, 1.5)
    else out[key] = num(cfg[key], def, 0, 1)
  }
  if (out.seedCount > out.maxPets) out.seedCount = out.maxPets
  if (out.floor < out.ceiling) out.floor = out.ceiling
  return out
}

/** 把任意资源名收敛成「assets 目录下的一层文件名」，挡掉 ../ 与绝对路径。 */
function safeAssetName(raw) {
  const base = path.basename(String(raw == null ? '' : raw).replace(/\\/g, '/'))
  const ext = path.extname(base).toLowerCase()
  if (!base || !MIME[ext]) return null
  return base
}

/**
 * 规范化配置：宿主不知道前端长什么样，只保证下发给页面的东西是安全的、
 * 可 JSON 序列化的，并且数值都在合理范围内（页面上再算样式）。
 */
function normalizeConfig(raw) {
  const cfg = raw && typeof raw === 'object' ? raw : {}
  const out = {
    enabled: cfg.enabled !== false,
    fit: FITS.has(cfg.fit) ? cfg.fit : DEFAULTS.fit,
    veil: str(cfg.veil, DEFAULTS.veil, 120),
    transparentUI: cfg.transparentUI !== false,
    uiOpacity: num(cfg.uiOpacity, DEFAULTS.uiOpacity, 0.2, 1),
    uiSaturate: num(cfg.uiSaturate, DEFAULTS.uiSaturate, 0.2, 3),
    // pets 是新名字，mascots 是旧名字，任一个显式 false 都关掉
    pets: cfg.pets !== false && cfg.mascots !== false,
    draggable: cfg.draggable !== false,
    brightness: num(cfg.brightness, DEFAULTS.brightness, 0.2, 2),
    blur: num(cfg.blur, DEFAULTS.blur, 0, 40),
    base: ROUTE_PREFIX,
    wallpaper: `${ROUTE_PREFIX}/wallpaper`,
    characters: [],
  }
  const list = Array.isArray(cfg.characters) ? cfg.characters : DEFAULTS.characters
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const src = safeAssetName(item.src)
    if (!src) continue
    out.characters.push({
      id: str(item.id, src, 48),
      src: `${ROUTE_PREFIX}/${src}`,
      alt: str(item.alt, '', 60),
      h: num(item.h, 28, 4, 90),
      // x/y 是「角色中心」在视口里的百分比；left/bottom 是旧写法，一并兜住
      x: num(item.x != null ? item.x : item.left, 12, -20, 120),
      y: num(item.y != null ? item.y : item.top, 80, -20, 120),
      fill: num(item.fill, 100, 10, 400),
      mirror: item.mirror === true,
      // bob 只是可选的「挂件呼吸」，动图本身的动作不靠它
      bob: num(item.bob, 0, 0, 20),
      period: num(item.period, 2.4, 0.2, 12),
    })
    if (out.characters.length >= 8) break
  }
  if (out.characters.length === 0) out.pets = false
  return out
}

/* ------------------------------------------------------------------ 可调设置 */

// 设置落在 $DSH_HOME/.dshw-wallpaper-settings.json；包目录是兜底（DSH_HOME 不可写时）。
const SETTINGS_CANDIDATES = [
  path.join(process.env.DSH_HOME || path.join(os.homedir(), '.dsh'), SETTINGS_NAME),
  path.join(PACKAGE_ROOT, SETTINGS_NAME),
]

function makeSettingsStore(log) {
  const read = () => {
    for (const p of SETTINGS_CANDIDATES) {
      try {
        const raw = fs.readFileSync(p, 'utf8')
        const parsed = JSON.parse(raw)
        // ⚠️ 文件结构是 { physics: {...} }，要取里面那层再规范化；
        //    直接把整个对象喂给 normalizePhysics 会读不到字段、全部回落默认值。
        const physics = normalizePhysics(parsed && typeof parsed === 'object' && parsed.physics ? parsed.physics : parsed)
        return { physics, path: p }
      } catch (err) {
        // 文件不存在是正常的（第一次跑），坏文件也按默认值处理
      }
    }
    return { physics: normalizePhysics(null), path: SETTINGS_CANDIDATES[0] }
  }
  const write = (physics) => {
    const body = JSON.stringify({ physics }, null, 2) + '\n'
    for (const p of SETTINGS_CANDIDATES) {
      try {
        fs.writeFileSync(p, body, 'utf8')
        return p
      } catch (err) { /* 换下一个位置 */ }
    }
    log('设置写入失败：两个候选路径都不可写')
    return null
  }
  return { read, write }
}

/* ------------------------------------------------------------------ 自检日志 */

const LOG_NAME = '.dshw-wallpaper.log'
const DIAG_NAME = '.dshw-wallpaper-client.log'

const LOG_CANDIDATES = [
  path.join(process.env.DSH_HOME || path.join(os.homedir(), '.dsh'), LOG_NAME),
  path.join(PACKAGE_ROOT, LOG_NAME),
]

/** 页面回传的自检报告：单独一个文件，别和宿主日志混在一起。 */
function writeDiag(data) {
  const stamp = new Date().toISOString()
  const lines = [`${stamp} ===== 页面自检 tag=${data && data.tag ? data.tag : '?'} =====`]
  try {
    if (data && typeof data === 'object') {
      for (const key of ['href', 'origin', 'viewport', 'readyState', 'ua']) {
        if (data[key] !== undefined) lines.push(`  ${key}: ${JSON.stringify(data[key])}`)
      }
      if (data.canvasVar) lines.push(`  canvas 变量: ${JSON.stringify(data.canvasVar)}`)
      if (data.computed) {
        lines.push('  算出来的样式:')
        for (const [k, v] of Object.entries(data.computed)) lines.push(`    ${k}: ${v}`)
      }
      if (data.pets) lines.push(`  挂件: ${JSON.stringify(data.pets)}`)
      if (data.wallpaper) lines.push(`  壁纸 img: ${JSON.stringify(data.wallpaper)}`)
      if (Array.isArray(data.ancestorChain)) {
        lines.push('  从壁纸往上的祖先链（谁把它变淡就看这里）:')
        for (const n of data.ancestorChain) lines.push(`    ${JSON.stringify(n)}`)
      }
      if (data.themeVars) lines.push(`  主题底色变量: ${JSON.stringify(data.themeVars)}`)
      if (Array.isArray(data.opaqueLayers)) {
        lines.push('  整页里带底色、盖住 ≥1% 屏的元素（cleared=已被清成透明；最上面那个大块就是糊壁纸的元凶）:')
        for (const n of data.opaqueLayers) lines.push(`    ${JSON.stringify(n)}`)
      }
      if (Array.isArray(data.clearedLayers)) {
        lines.push(`  已清成透明的外壳容器(${data.clearedLayers.length}): ${data.clearedLayers.join(', ') || '（无）'}`)
      }
      if (data.lastScan) {
        lines.push(`  最近一次补扫: ${data.lastScan.at}  清了 ${data.lastScan.cleared} 个`)
        for (const n of data.lastScan.sample || []) lines.push(`    ${JSON.stringify(n)}`)
      }
      if (Array.isArray(data.probes)) {
        lines.push('  各层几何:')
        for (const p of data.probes) lines.push(`    ${JSON.stringify(p)}`)
      }
      if (Array.isArray(data.probeNotes) && data.probeNotes.length) {
        lines.push('  ⚠️ 采样备注:')
        for (const n of data.probeNotes) lines.push(`    ${n}`)
      }
      if (data.parseError) lines.push(`  JSON 解析失败: ${data.parseError} 原文=${data.raw}`)
      if (data.diagError) lines.push(`  ⚠️ 页面侧采样失败: ${data.diagError}\n     ${data.stack || ''}`)
    } else {
      lines.push('  (空)')
    }
  } catch (err) {
    lines.push('  报告序列化失败: ' + err)
  }
  const text = lines.join('\n') + '\n'
  for (const dir of [
    process.env.DSH_HOME || path.join(os.homedir(), '.dsh'),
    PACKAGE_ROOT,
  ]) {
    try {
      fs.appendFileSync(path.join(dir, DIAG_NAME), text, 'utf8')
      return
    } catch (err) { /* 换下一个位置 */ }
  }
  try { console.log(text) } catch (err) {}
}

/** 写日志：永远不抛，永远不阻塞启动。 */
function makeLogger() {
  const lines = []
  let flushed = false
  const write = (msg) => {
    const line = `${new Date().toISOString()} ${msg}`
    lines.push(line)
    for (const p of LOG_CANDIDATES) {
      try {
        fs.appendFileSync(p, line + '\n', 'utf8')
        return
      } catch (err) { /* 换下一个位置 */ }
    }
    if (!flushed) {
      flushed = true
      try { console.log('[dsh-whale-wallpaper] ' + msg) } catch (err) {}
    }
  }
  return write
}

/* ------------------------------------------------------------------ 插件 */

export default {
  name: 'dsh-whale-wallpaper',

  /**
   * @param {object} root 宿主根上下文
   * @param {object} rawConfig cordis.patch.yml 里这一行的 config
   */
  apply(root, rawConfig) {
    const config = normalizeConfig(rawConfig)
    const log = makeLogger()
    const settings = makeSettingsStore(log)
    const disposers = []
    let clientCache = null
    let diagSeen = 0

    // 每次启动重置「页面自检」文件，并在 15 秒后落一条结论：
    // 如果页面侧一条回传都没有，就说明注入行没被执行 / client.js 没跑起来。
    try {
      for (const dir of [process.env.DSH_HOME || path.join(os.homedir(), '.dsh'), PACKAGE_ROOT]) {
        try {
          fs.writeFileSync(path.join(dir, DIAG_NAME),
            `${new Date().toISOString()} ===== 宿主启动，等待页面回传（最多等 15 秒）=====\n`, 'utf8')
          break
        } catch (err) { /* 换下一个位置 */ }
      }
      const t = setTimeout(() => {
        try {
          const line = diagSeen > 0
            ? `${new Date().toISOString()} ===== 收到 ${diagSeen} 条页面回传，注入行与 client.js 都正常 =====\n`
            : `${new Date().toISOString()} ===== 一条回传都没收到：注入行很可能没被执行，或者 client.js 没加载成功 =====\n`
          for (const dir of [process.env.DSH_HOME || path.join(os.homedir(), '.dsh'), PACKAGE_ROOT]) {
            try { fs.appendFileSync(path.join(dir, DIAG_NAME), line, 'utf8'); break } catch (err) {}
          }
        } catch (err) {}
      }, 15000)
      if (t && typeof t.unref === 'function') t.unref()
      disposers.push(() => { try { clearTimeout(t) } catch (err) {} })
    } catch (err) {}

    const loadClient = () => {
      for (const p of CLIENT_CANDIDATES) {
        try {
          const st = fs.statSync(p)
          if (clientCache && clientCache.mtimeMs === st.mtimeMs) return clientCache.text
          const text = fs.readFileSync(p, 'utf8')
          clientCache = { text, mtimeMs: st.mtimeMs }
          return text
        } catch (err) { /* 试下一个候选 */ }
      }
      return clientCache ? clientCache.text : ''
    }

    log(`apply() 开始；包目录=${PACKAGE_ROOT}；pets=${config.pets}；角色=${config.characters.length}；bundles 里能看到我说明这行加载成功了`)

    // 把「不依赖任何服务」的自检结果先记下来：能写到这里说明模块 import 是好的
    try {
      log(`assets 存在=${fs.existsSync(ASSET_ROOT)}；client.js 长度=${loadClient().length}`)
    } catch (err) {
      log('assets 检查失败：' + err)
    }

    // —— 第一件事：注册 index 注入行。它不依赖任何服务，越早进表越好 ——
    // 桌面端的注入表是**宿主启动时一次性收集**的，晚订就永远进不去。
    try {
      const bootstrap =
        '(function(){try{' +
        'var d=document.body||document.head||document.documentElement;if(!d){return}' +
        `var s=document.createElement("script");s.src=${JSON.stringify(CLIENT_ROUTE)};` +
        's.async=false;s.onerror=function(){};d.appendChild(s)' +
        '}catch(e){}})()'

      const firstPaintStyle = config.enabled && config.transparentUI
        ? '/*dsh-whale-wallpaper-first-paint*/html,body{background-color:transparent !important}'
        : ''

      const off = root.on('webserver/index-inject', (table) => {
        try {
          if (!Array.isArray(table)) return
          if (!table.some((r) => r && r.kind === 'global' && r.name === CONFIG_GLOBAL)) {
            // 物理设置**不写在注入行里**：注入行对桌面端是启动时收集一次的快照，
            // 页面上要拿最新的值得走 /settings.json（页面侧会去 fetch）。
            table.push({ kind: 'global', name: CONFIG_GLOBAL, value: config })
          }
          if (firstPaintStyle && !table.some((r) => r && r.kind === 'style' && typeof r.text === 'string' && r.text.includes('dsh-whale-wallpaper-first-paint'))) {
            table.push({ kind: 'style', text: firstPaintStyle })
          }
          if (!table.some((r) => r && r.kind === 'script' && typeof r.text === 'string' && r.text.includes(CLIENT_ROUTE))) {
            table.push({ kind: 'script', placement: 'body', text: bootstrap })
          }
        } catch (err) {
          log('注入行出错：' + err)
        }
      })
      disposers.push(() => { try { off() } catch (err) {} })
      log('index 注入行已注册（webserver/index-inject）')
    } catch (err) {
      log('注册注入行失败：' + (err && err.stack ? err.stack : err))
    }

    // —— 第二件事：等服务就绪再挂路由 ——
    // 直接摸 root.webServer 有风险：apply() 可能早于 webServer 服务就绪。
    const startWithWebServer = (scope) => {
      const webServer = (scope && scope.webServer) || root.webServer || (root.get && root.get('webServer'))
      if (!webServer || typeof webServer.register !== 'function') {
        log('webServer 服务不可用：路由没注册，页面拿不到壁纸与动图')
        return
      }

      const readBody = (req) => new Promise((resolve) => {
        let data = ''
        try {
          req.setEncoding('utf8')
          req.on('data', (chunk) => {
            data += chunk
            if (data.length > 64 * 1024) { try { req.destroy() } catch (err) {} }
          })
          req.on('end', () => resolve(data))
          req.on('error', () => resolve(data))
        } catch (err) { resolve('') }
      })

      const route = (routePath, handler, methods) => {
        const allowed = methods || ['GET', 'HEAD']
        disposers.push(webServer.register({
          kind: 'exact',
          path: routePath,
          handler: async (req, res) => {
            try {
              if (!allowed.includes(String(req.method || 'GET').toUpperCase())) {
                res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' })
                res.end('method not allowed')
                return
              }
              await handler(req, res)
            } catch (err) {
              try {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
                res.end('dsh-whale-wallpaper: ' + String((err && err.message) || err))
              } catch (err2) {}
            }
          },
        }))
      }

      const sendFile = (res, file, mime) => {
        const bytes = fs.readFileSync(file)
        res.writeHead(200, {
          'Content-Type': mime,
          'Cache-Control': 'no-cache',
          'Content-Length': String(bytes.length),
        })
        res.end(bytes)
      }

      // ① 壁纸。/wallpaper 是短别名，/wallpaper.jpg 方便在浏览器里直接看原图。
      try {
        const wallpaperPath = path.join(ASSET_ROOT, 'wallpaper.jpg')
        if (config.enabled && fs.existsSync(wallpaperPath)) {
          const handler = (req, res) => sendFile(res, wallpaperPath, 'image/jpeg')
          route(`${ROUTE_PREFIX}/wallpaper`, handler)
          route(`${ROUTE_PREFIX}/wallpaper.jpg`, handler)
          log('壁纸路由已注册')
        } else {
          log('壁纸文件不存在，跳过路由：' + wallpaperPath)
        }
      } catch (err) {
        log('注册壁纸路由失败：' + err)
      }

      // ② 挂件动图（白名单扩展名 + basename，无法越界）
      try {
        if (config.enabled && config.pets) {
          for (const ch of config.characters) {
            const name = path.basename(ch.src)
            const file = path.join(ASSET_ROOT, name)
            if (!fs.existsSync(file)) {
              log('动图文件不存在，跳过：' + name)
              continue
            }
            const mime = MIME[path.extname(name).toLowerCase()] || 'application/octet-stream'
            route(`${ROUTE_PREFIX}/${name}`, (req, res) => sendFile(res, file, mime))
            log('挂件路由已注册：' + name)
          }
        }
      } catch (err) {
        log('注册挂件路由失败：' + err)
      }

      // ③ 浏览器侧本体
      route(CLIENT_ROUTE, (req, res) => {
        res.writeHead(200, {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-cache',
        })
        res.end(loadClient())
      })

      // ④ 设置：读（GET，页面上那个齿轮用）与写（POST，栏里保存用）
      const JSON_HEADERS = {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      }
      route(`${ROUTE_PREFIX}/settings.json`, async (req, res) => {
        const method = String(req.method || 'GET').toUpperCase()
        if (method === 'GET' || method === 'HEAD') {
          const { physics, path: where } = settings.read()
          res.writeHead(200, JSON_HEADERS)
          res.end(JSON.stringify({ ok: true, physics, defaults: PHYSICS_DEFAULTS, path: where }))
          return
        }
        const body = await readBody(req)
        let parsed = {}
        try { parsed = JSON.parse(body || '{}') } catch (err) { parsed = {} }
        if (parsed && parsed.reset === true) {
          const written = settings.write(normalizePhysics(null))
          log('设置已重置为默认值 -> ' + written)
          res.writeHead(200, JSON_HEADERS)
          res.end(JSON.stringify({ ok: true, physics: normalizePhysics(null), defaults: PHYSICS_DEFAULTS }))
          return
        }
        const current = settings.read().physics
        const next = normalizePhysics(Object.assign({}, current, parsed.physics || parsed))
        const written = settings.write(next)
        log('设置已保存 -> ' + (written || '（写入失败）'))
        res.writeHead(200, JSON_HEADERS)
        res.end(JSON.stringify({ ok: !!written, physics: next, defaults: PHYSICS_DEFAULTS }))
      }, ['GET', 'HEAD', 'POST'])

      // ⑤ 页面自检回传：让页面把「实际算出来的样式」写进宿主日志。
      //    桌面端窗口里的真实情况这边看不到，这是唯一可靠的取证通道。
      route(`${ROUTE_PREFIX}/diag.json`, async (req, res) => {
        if (String(req.method || 'GET').toUpperCase() !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end('use POST')
          return
        }
        const body = await readBody(req)
        let data = null
        try { data = JSON.parse(body || '{}') } catch (err) { data = { parseError: String(err), raw: body.slice(0, 500) } }
        diagSeen += 1
        writeDiag(data)
        res.writeHead(200, JSON_HEADERS)
        res.end(JSON.stringify({ ok: true }))
      }, ['POST'])

      log('路由全部就绪')
    }

    try {
      if (typeof root.inject === 'function') {
        root.inject(['webServer'], (scope) => {
          try { startWithWebServer(scope) } catch (err) { log('startWithWebServer 抛异常：' + (err && err.stack ? err.stack : err)) }
        })
        log('已用 root.inject([webServer]) 等待服务')
      } else {
        startWithWebServer(root)
      }
    } catch (err) {
      log('root.inject 失败，直接尝试注册：' + err)
      try { startWithWebServer(root) } catch (err2) { log('直接注册也失败：' + err2) }
    }

    // —— 卸载 ——
    try {
      root.effect(() => () => {
        for (const d of disposers) { try { d() } catch (err) {} }
        disposers.length = 0
        log('插件已卸载，路由已释放')
      })
    } catch (err) {
      log('注册卸载钩子失败（不影响使用）：' + err)
    }
  },
}

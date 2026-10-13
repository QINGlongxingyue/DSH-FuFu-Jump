/**
 * dsh-whale-wallpaper —— 页面侧装配（壁纸 + 带物理的挂件）
 *
 * 分层：
 *   #dshww-layer  z-index:-1   壁纸 + 压暗层，永远在界面下面
 *   #dshww-pets   z-index 拉满  挂件层（pointer-events:none，只有角色判定区接收指针）
 *
 * 挂件是**真的会在屏幕上滚动的**：
 *   · 起步给一点随机水平速度，重力往下拉，落地按 bounce 反弹
 *     （竖直速度掉到 minBounce 以下就停稳，不再微弹）；
 *   · 撞左右墙 / 上边界按 wallBounce 反弹，y 向的上下边界都能在设置里改；
 *   · 两个挂件撞上 ＝ 台球式分裂：各自弹出一份新的（初速度沿碰撞法线 + 随机扰动），
 *     每个挂件只裂一次，总数不超过 maxPets（默认 10 个）；
 *   · 可以按住拖动，拖动期间不受重力影响，松手把手甩出来的速度交还给物理。
 *
 * 参数都存在宿主侧 $DSH_HOME/.dshw-wallpaper-settings.json，
 * 右下角「设置」里改，「清零」把数量恢复成默认的 2 个。
 */
import { PETS_Z, STYLE_ID, canvasCss, stylesheet } from './styles.js'

const LAYER_ID = 'dshww-layer'
const PETS_ID = 'dshww-pets'
const BAR_ID = 'dshww-bar'
const PANEL_ID = 'dshww-panel'
const CANVAS_STYLE_ID = 'dsh-whale-wallpaper-canvas'
const UI_TRANSPARENT_STYLE_ID = 'dsh-whale-wallpaper-ui'
const POS_KEY = 'dshww-pos'

/** 正在拖挂件的数量：>0 时给 body 打标记，整页禁选、光标变抓手。 */
let dragActive = 0

function beginDragMarker() {
  dragActive += 1
  try {
    if (document.body) document.body.setAttribute('data-dshww-dragging', '1')
  } catch (err) {}
}

function endDragMarker() {
  dragActive = Math.max(0, dragActive - 1)
  if (dragActive === 0) {
    try {
      if (document.body) document.body.removeAttribute('data-dshww-dragging')
    } catch (err) {}
  }
}

/**
 * 拖玩偶时清掉当前可能存在的文字选择。
 * 光靠 CSS 的 user-select:none 不够 —— 一次拖拽里浏览器可能已经开始拉选择框了，
 * 这里直接把选择折叠掉（这是"蓝高亮/框选"最直接的解法）。
 */
function clearTextSelection() {
  try {
    const win = globalThis
    if (typeof win.getSelection === 'function') {
      const sel = win.getSelection()
      if (sel && typeof sel.removeAllRanges === 'function' && sel.rangeCount) sel.removeAllRanges()
    }
  } catch (err) {}
  try {
    const doc = document
    if (typeof doc.getSelection === 'function') {
      const sel = doc.getSelection()
      if (sel && typeof sel.removeAllRanges === 'function' && sel.rangeCount) sel.removeAllRanges()
    }
  } catch (err) {}
}

/** 前端兜底默认值（宿主 PHYSICS_DEFAULTS 有一份一样的）。 */
const PHYSICS_FALLBACK = {
  wallpaper: true,      // 壁纸开关（在设置面板里切）
  uiClearLevel: 3,      // 界面通透档位：0 不动 / 1 只透大面板 / 2 连小块 / 3 全透
  maxPets: 10,
  seedCount: 2,
  gravity: 1400,
  bounce: 0.62,
  wallBounce: 0.78,
  friction: 0.995,
  groundFriction: 0.86,
  minBounce: 60,
  splitImpulse: 240,
  // 分裂冷却：两只撞上裂一次之后，要过这么久才允许再裂（用户要求 2 秒）
  splitCooldown: 2,
  // 分裂暂停：数量到达上限后，停这么久（秒）不许再分裂
  splitPause: 120,
  // 同类对消：数量满员并保持这么久（秒）之后，每 eliminateInterval 秒消掉一对同种布偶
  eliminateDelay: 10,
  eliminateInterval: 2,
  // 挂机奖励：连续这么久（秒）没碰键鼠，就落一只新的布偶
  idleSpawnInterval: 120,
  ceiling: 0.02,
  // 动图素材底部自带约 4% 空白（角色包围盒的余量），默认放到 1.02：
  // 「元素的底」略沉到屏幕外，角色脚底正好落在地平线上。
  floor: 1.02,
}

const DEFAULT_CONFIG = {
  enabled: true,
  fit: 'cover',
  veil: 'rgba(4, 18, 38, 0.18)',
  transparentUI: true,
  /** 界面通透程度：0 = 一个底色都不动；1 = 只清铺满视野的大面板；2 = 连小块一起清；3 = 凡是能画出白底的都清。 */
  uiClearLevel: 3,
  uiOpacity: 0.94,
  uiSaturate: 1.05,
  pets: true,
  draggable: true,
  physics: null,
  wallpaper: '/dsh-whale-wallpaper/wallpaper',
  characters: [],
}

/** uiClearLevel 各档的判据（面积占视口的比例门槛 / 底色 alpha 门槛）。 */
const CLEAR_TIERS = {
  0: null,
  1: { area: 0.25, alpha: 0.5 },
  2: { area: 0.02, alpha: 0.15 },
  3: { area: 0.0005, alpha: 0.02 },
}

function clearTier(level) {
  const n = Math.round(Number(level))
  if (!Number.isFinite(n) || n <= 0) return null
  return CLEAR_TIERS[Math.min(3, Math.max(1, n))]
}

/* ---------------------------------------------------------------- 界面透明化 */

/** 界面透明化：把 DSH 自己的底色让开，壁纸才能透出来。 */
const UI_TRANSPARENT_CSS = `
html, body { background-color: transparent !important; }
#root { background-color: transparent !important; }
/* ⚠️ 最后一道保险：凡是**自己带底色、而且铺满视野**的界面容器，一律清成透明。
   为什么需要它：DSH 的应用外壳（AppFrame）自己带 background: var(--dsw-alias-bg-base)，
   只清 #root 盖不住 —— 症状就是「壁纸明明加载成功（自检里 complete:true）但屏幕上一点都看不见」。
   这个规则由 fixOpaqueAppLayers() 打标记；DSH 自己的弹窗/设置面板会被排除在外（见 markOverlaysKeepOpaque）。 */
[data-dshww-clear-bg="1"] { background-color: transparent !important; }
/* 有些容器是「底色 + 一层渐变/图」叠出来的，只清底色还会剩一层白 */
[data-dshww-clear-bgi="1"] { background-image: none !important; }

/* ---------------------------------------------------------------------------
 * 顺手把「小鲸鱼挂件」（另一个插件 dsh-whale-widget）的余额气泡也通透掉。
 *
 * 它的白底**不在 CSS 里** —— 气泡是 SVG 画的，标记写死了：
 *   <path class="dshwv-bshape" fill="#FFFFFF" stroke="#203170" .../>
 *   <ellipse class="dshwv-b1" ... fill="#FFFFFF" .../>
 *   <ellipse class="dshwv-b2" ... fill="#FFFFFF" .../>
 * SVG 的 fill 是**表现属性**，优先级最低，所以 CSS 能压过它（必须带 !important）。
 * 描边留着：不然半透明底上那行深色余额数字没有边界，看着发飘。
 * --------------------------------------------------------------------------- */
#dsh-whale-widget .dshwv-bshape,
#dsh-whale-widget .dshwv-b1,
#dsh-whale-widget .dshwv-b2 {
  fill: transparent !important;
  fill-opacity: 0 !important;
}
`

/**
 * 常驻监听：外壳/主题是**异步上色**的，挂载那一刻各面板往往还没底色，
 * 之后再慢慢刷成白底 —— 所以光在挂载时扫一次根本抓不到。
 * 这里用 MutationObserver 盯着整棵树（属性 + 子树），一发现变化就重扫（100ms 防抖）。
 *
 * （踩过：原来用 setInterval 3 秒轮询，但 keepInPlace 里有 `if (__dshWhaleWallpaperKeep) return`
 *   的一次性守卫，重挂之后那个 interval 根本没建起来，等于完全没补扫。）
 */
function watchOpaqueLayers() {
  try {
    if (globalThis.__dshWhaleWallpaperObserver) return
    const doc = document
    const target = doc.body || doc.documentElement
    if (!target || typeof MutationObserver !== 'function') return
    let timer = 0
    const schedule = () => {
      if (timer) return
      timer = setTimeout(() => {
        timer = 0
        scanAndClear()
      }, 100)
    }
    const observer = new MutationObserver(schedule)
    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    })
    globalThis.__dshWhaleWallpaperObserver = observer
    globalThis.__dshWhaleWallpaperScan = scanAndClear
  } catch (err) {}
}

/** 重扫一次并用 API 记录结果（自检回传要用）。 */
function scanAndClear() {
  try {
    const api = globalThis.__dshWhaleWallpaperApi
    if (api && typeof api.refreshTransparency === 'function') {
      api.refreshTransparency()
      return
    }
  } catch (err) {}
  try { fixOpaqueAppLayers() } catch (err) {}
}

/* ---------------------------------------------------------------- 挂机奖励 */

/**
 * 挂机奖励的一次「判定」：够久没交互就落一只。
 *
 * 抽成纯函数是为了能直接单测（页面侧的 setInterval 在测试环境里是假的，
 * 没法等真实定时器触发）。
 * @param {{last:number,spawns:number,lastSpawnAt:number}} st 挂机状态（会被就地更新）
 * @param {number} seconds 需要挂机多久（秒）；<= 0 表示关闭
 * @param {() => boolean} spawnIdle 真正去落一只，返回是否成功
 * @param {number} now 当前时刻（毫秒）
 * @returns {boolean} 这次有没有落下新的一只
 */
function stepIdle(st, seconds, spawnIdle, now) {
  if (!st) return false
  const secs = Number(seconds)
  if (!Number.isFinite(secs) || secs <= 0) return false
  if (now - st.last < secs * 1000) return false
  if (spawnIdle()) {
    st.spawns += 1
    st.lastSpawnAt = now
    st.last = now                 // 落一只之后重新计时，不然一直挂着会每秒加一只
    return true
  }
  // 到上限了：等到能加为止，别每秒都重试
  st.last = now - secs * 1000 + 5000
  return false
}

/**
 * 连续一段时间没碰键鼠 → 落一只新布偶。
 *
 * 用「全局最后一次交互时刻 + 1 秒轮询」实现，不用 setTimeout 重置：
 * mousemove 一秒能来几十次，每次 clearTimeout/setTimeout 太吵。
 * 键鼠都用 capture + passive 监听（passive 保证绝不影响页面原本的交互）。
 */
function watchIdle(engine) {
  if (globalThis.__dshWhaleWallpaperIdle) return
  const win = globalThis
  const doc = document
  globalThis.__dshWhaleWallpaperIdle = {
    last: Date.now(),
    spawns: 0,
    lastSpawnAt: 0,
    step: (now) => {
      const cfg = globalThis.__dshWhaleWallpaperConfig
      if (!cfg || cfg.pets === false) return false
      const st = globalThis.__dshWhaleWallpaperIdle
      return stepIdle(st, cfg.physics && cfg.physics.idleSpawnInterval, () => engine.spawnIdle(), now)
    },
  }

  const bump = () => { globalThis.__dshWhaleWallpaperIdle.last = Date.now() }
  for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'keydown', 'keyup']) {
    try { win.addEventListener(ev, bump, { passive: true, capture: true }) } catch (err) {
      try { win.addEventListener(ev, bump, true) } catch (err2) {}
    }
  }
  try { doc.addEventListener('visibilitychange', bump) } catch (err) {}

  setInterval(() => {
    try {
      const st = globalThis.__dshWhaleWallpaperIdle
      if (st && typeof st.step === 'function') st.step(Date.now())
    } catch (err) {}
  }, 1000)
}

/**
 * 给「DSH 自己的弹窗 / 设置面板 / 插件管理」打标记：
 * `fixOpaqueAppLayers()` 会跳过这些元素及其后代 —— 不然把面板底也清成透明，
 * 设置里的插件列表就糊在壁纸上、字都看不清了。
 *
 * 为什么不用写死类名：DSH 的样式类带构建期 hash（`_dialog_o6lrb_33`），
 * 每次发版都会变。这里按**功能特征**认：
 *   ① `[role="dialog"]` / `[aria-modal]` —— 标准无障碍标记，最可靠
 *   ② 屏幕级遮罩：铺满视口 + 有 `backdrop-filter`（DSH 的 mask 就是 `inset:0` + 模糊）
 */
const KEEP_OPAQUE_ATTR = 'data-dshww-keep-opaque'

function markOverlaysKeepOpaque() {
  const marked = []
  try {
    const doc = document
    const css = globalThis.getComputedStyle
    if (typeof css !== 'function') return marked
    const vw = globalThis.innerWidth || doc.documentElement.clientWidth || 1
    const vh = globalThis.innerHeight || doc.documentElement.clientHeight || 1

    const nodes = []
    const collect = (node) => {
      if (!node) return
      nodes.push(node)
      if (typeof node.querySelectorAll === 'function') {
        for (const n of node.querySelectorAll('*')) nodes.push(n)
      } else {
        for (const c of node.children || []) collect(c)
      }
    }
    collect(doc.body || doc.documentElement)

    for (const node of nodes) {
      if (!node || typeof node.getAttribute !== 'function') continue
      if (node.getAttribute(KEEP_OPAQUE_ATTR) === '1') continue
      let keep = false
      try {
        if (node.getAttribute('role') === 'dialog') keep = true
        if (node.getAttribute('aria-modal') === 'true') keep = true
      } catch (err) {}
      if (!keep) {
        try {
          const cs = css(node)
          const bf = String((cs && (cs.backdropFilter || cs.webkitBackdropFilter)) || 'none')
          if (bf && bf !== 'none') {
            const r = node.getBoundingClientRect()
            // 屏幕级遮罩：铺满 ≥90% 视口
            if (r.width * r.height >= vw * vh * 0.9) keep = true
          }
        } catch (err) {}
      }
      if (!keep) continue
      node.setAttribute(KEEP_OPAQUE_ATTR, '1')
      marked.push((node.id ? '#' + node.id : String(node.tagName || '?').toLowerCase())
        + (node.className ? '.' + String(node.className).split(/\s+/).slice(0, 2).join('.') : ''))
    }
  } catch (err) {}
  return marked
}

/** 这个节点是不是「要保持不透明」的弹窗/设置面板（自己或被祖先标记过）。 */
function insideKeptOverlay(node) {
  try {
    let n = node
    let depth = 0
    while (n && depth < 20) {
      if (typeof n.getAttribute === 'function' && n.getAttribute(KEEP_OPAQUE_ATTR) === '1') return true
      n = n.parentNode
      depth += 1
    }
  } catch (err) {}
  return false
}

/**
 * 把「会把壁纸糊掉的界面底色」清成透明，返回被处理的元素描述（给自检回传）。
 *
 * 为什么需要它：DSH 的外壳和各个面板自己都带底色 —— AppFrame 是
 * `background: var(--dsw-alias-bg-base)`（纯白/纯黑），侧栏和内容区还常常是
 * `rgba(255,255,255,.7x)` 这种**半透明白**。壁纸在 z-index:-1 那层，
 * 面板一盖上去就被糊成「几乎看不见」（实测用户截图里整屏平均 RGB 都是 229~245 的接近纯白）。
 *
 * 判据（够狠，但不误伤正文）：
 *   ① 不属于 #dshww-layer / #dshww-pets
 *   ② 自己有不透明或较实的底色（alpha > 0.15）
 *   ③ 铺满 ≥0.4% 视口
 *
 * 面积门槛为什么压这么低：侧栏的分组项（「默认工作区 / 未分组 / 未命名对话」）
 * 自己带小白底，一块块糊在壁纸上，看着像贴了几张白纸。
 * 反正「露出壁纸」就是这个插件的全部目的，UI 容器底色一律让开才是对的。
 *
 * ⚠️ 扫的是**整页**，不是只扫 `#root`：实测侧栏面板可能挂在 `#root` 外面，
 *    只扫 `#root` 就会漏掉它 —— 表现正是「对话栏透了，侧栏还是白板」。
 */
function fixOpaqueAppLayers() {
  const fixed = []
  try {
    const doc = document
    const rootEl = doc.getElementById('root')
    if (!rootEl) return fixed
    // 档位从「全局设置」读：设置面板改完立即生效，不用重挂
    const tier = clearTier(globalThis.__dshWhaleWallpaperClearLevel || 3)
    if (!tier) return fixed
    const css = globalThis.getComputedStyle
    if (typeof css !== 'function') return fixed
    const vw = globalThis.innerWidth || doc.documentElement.clientWidth || 1
    const vh = globalThis.innerHeight || doc.documentElement.clientHeight || 1

    const nodes = []
    const collect = (node) => {
      if (!node) return
      nodes.push(node)
      if (typeof node.querySelectorAll === 'function') {
        for (const n of node.querySelectorAll('*')) nodes.push(n)
      } else {
        for (const c of node.children || []) collect(c)
      }
    }
    collect(doc.body || doc.documentElement)
    // 先把「DSH 自己的弹窗/设置面板」标记出来，下面遇到就跳过
    markOverlaysKeepOpaque()

    /** 解析 'rgba(r, g, b, a)' / 'rgb(...)' 的 alpha；不确定就当成 1（保守：宁可清）。 */
    const alphaOf = (bg) => {
      const s = String(bg || '')
      if (!s || s === 'transparent') return 0
      const m = /rgba?\(([^)]+)\)/.exec(s)
      if (!m) return 1
      const parts = m[1].split(',').map((v) => v.trim())
      if (parts.length < 4) return 1
      const a = Number(parts[3])
      return Number.isFinite(a) ? a : 1
    }

    /**
     * 渐变里有没有「实色」。
     *
     * 为什么要单独判这个：底部输入区那条白（`div.Dc7zOa_composerSeat`）是
     * **底色完全透明 + 一条 `linear-gradient(transparent, #fff)`** 叠出来的。
     * 只看 backgroundColor 的话它 alpha=0 会被直接跳过 —— 白条就一直在。
     * 这里要求渐变里出现 `rgb(...)`/`#fff` 这类实色；全是 transparent / `0 0 0 / 0` 的才算"没有颜色"。
     */
    const gradientHasColor = (bi) => {
      const s = String(bi || '')
      if (!s || s === 'none') return false
      if (!/gradient\(/i.test(s)) return false
      // 去掉透明的色标：color(srgb 0 0 0 / 0) 或 rgba(...,0)
      const withoutClear = s
        .replace(/color\([^)]*\/\s*0(?:\.0+)?\s*\)/gi, '')
        .replace(/rgba\([^)]*,\s*0(?:\.0+)?\s*\)/gi, '')
        .replace(/transparent/gi, '')
      return /rgb|#[0-9a-f]{3}/i.test(withoutClear)
    }

    for (const node of nodes) {
      if (!node || node.id === LAYER_ID || node.id === PETS_ID) continue
      if (typeof node.closest === 'function'
        && (node.closest('#' + LAYER_ID) || node.closest('#' + PETS_ID))) continue
      // ⚠️ DSH 自己的弹窗/设置面板要保持不透明，不然设置里的插件列表糊在壁纸上、字都看不见
      if (insideKeptOverlay(node)) continue
      let cs = null
      try { cs = css(node) } catch (err) { continue }
      if (!cs) continue
      const bg = String(cs.backgroundColor || '')
      const bi = String(cs.backgroundImage || 'none')
      const solidBg = alphaOf(bg) > tier.alpha
      const solidGradient = gradientHasColor(bi)
      if (!solidBg && !solidGradient) continue
      let r = null
      try { r = node.getBoundingClientRect() } catch (err) { continue }
      if (!r || r.width * r.height < vw * vh * tier.area) continue
      if (solidBg) node.setAttribute('data-dshww-clear-bg', '1')
      // 底色半透明 + 叠一层渐变/图的，只清底色还会剩一层白
      if (bi !== 'none' && bi !== '') node.setAttribute('data-dshww-clear-bgi', '1')
      // 把「被清的到底是谁」直接写进 DOM 属性：下次截图一放大就能读出类名，
      // 不用再猜是哪个元素在挡（像素采样只能看到白块，看不到身份）。
      try {
        const shortCls = String(node.className || '').split(/\s+/).slice(0, 2).join('.')
        node.setAttribute('data-dshww-was', (
          String(node.tagName || '?').toLowerCase() + (shortCls ? '.' + shortCls : '')
          + '|' + bg + '|' + Math.round(r.width) + 'x' + Math.round(r.height)
        ).slice(0, 90))
      } catch (err) {}
      fixed.push({
        el: (node.id ? '#' + node.id : String(node.tagName || '?').toLowerCase())
          + (node.className ? '.' + String(node.className).split(/\s+/).slice(0, 2).join('.') : ''),
        areaPct: Number((r.width * r.height / (vw * vh) * 100).toFixed(1)),
        wasBg: bg,
        wasBgImage: solidGradient ? bi.slice(0, 60) : undefined,
        size: `${Math.round(r.width)}x${Math.round(r.height)}`,
        at: `${Math.round(r.left)},${Math.round(r.top)}`,
      })
    }
  } catch (err) {}
  return fixed
}

/* ---------------------------------------------------------------- 小工具 */

function merge(user) {
  const out = Object.assign({}, DEFAULT_CONFIG, user && typeof user === 'object' ? user : {})
  if (!Array.isArray(out.characters)) out.characters = []
  return out
}

function resolvePhysics(raw) {
  const p = Object.assign({}, PHYSICS_FALLBACK, raw && typeof raw === 'object' ? raw : {})
  p.wallpaper = p.wallpaper !== false
  p.uiClearLevel = Math.max(0, Math.min(3, Math.round(Number(p.uiClearLevel) || 0)))
  p.maxPets = Math.max(1, Math.round(p.maxPets))
  p.seedCount = Math.max(0, Math.min(p.maxPets, Math.round(p.seedCount)))
  return p
}

function appendStyle(id, css) {
  const existing = document.getElementById(id)
  if (existing) existing.textContent = css
  else {
    const el = document.createElement('style')
    el.id = id
    el.textContent = css
    ;(document.head || document.documentElement).appendChild(el)
  }
}

function removeEl(id) {
  const el = document.getElementById(id)
  if (el && el.parentNode) el.parentNode.removeChild(el)
}

function readSaved() {
  try {
    const raw = globalThis.localStorage && globalThis.localStorage.getItem(POS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (err) { return {} }
}

function writeSaved(map) {
  try {
    if (globalThis.localStorage) globalThis.localStorage.setItem(POS_KEY, JSON.stringify(map))
  } catch (err) {}
}

/* ---------------------------------------------------------------- 物理 */

function createEngine(state) {
  const pets = []
  let raf = 0
  let last = 0
  let saveAt = 0
  let simTime = 0
  // 全局分裂冷却：到这一时刻之前，任何一对都不许再裂。
  // 只用「每只的 splitCd」不够 —— 玩偶一多，同一帧里会有很多对同时接触，
  // 每对都能各自裂一份，看起来就是「一瞬间召唤一大堆布偶」。全局锁才是对的。
  let splitLockUntil = 0
  // 「到达上限」的计时：满了这么久之后开始允许同类对消
  let fullSince = 0
  // 下一次允许对消的时刻（对消最多每 eliminateInterval 一次）
  let nextEliminateAt = 0
  // 分裂暂停到这一刻为止（数量一到上限就设，默认停 2 分钟）
  let splitPausedUntil = 0
  /**
   * 环形调试日志：玩法分支（分裂/对消/暂停/挂机）的关键决策都记一笔。
   * 排「为什么没触发」这种问题时，靠它比反复插临时 console.log 强得多。
   * 通过 `api.debugLog()` 读，或 `api.debugLogClear()` 清空。
   */
  const log = []
  const pushLog = (tag, extra) => {
    try {
      log.push(Object.assign({ t: Math.round(simTime), tag }, extra || {}))
      if (log.length > 200) log.shift()
    } catch (err) {}
  }

  const vw = () => globalThis.innerWidth || document.documentElement.clientWidth || 1
  const vh = () => globalThis.innerHeight || document.documentElement.clientHeight || 1

  function render(pet) {
    pet.el.style.transform = `translate3d(${pet.x - pet.w / 2}px, ${pet.y - pet.h / 2}px, 0)`
  }

  function clampX(pet, x) {
    const half = pet.w / 2
    return Math.min(vw() - half, Math.max(half, x))
  }

  function spawn(spec, x, y, vx, vy) {
    const doc = document
    const hPct = Math.max(2, Number(spec.h) || 28)
    const fill = Number(spec.fill) || 100
    const mirror = spec.mirror === true

    const el = doc.createElement('div')
    el.className = 'dshww-pet'
    el.setAttribute('data-src', String(spec.src))
    el.title = spec.alt ? String(spec.alt) : '按住拖动'
    el.style.setProperty('--dshww-flip', mirror ? '-1' : '1')
    const petH = Math.max(20, hPct / 100 * vh())
    const petW = Math.max(20, petH * (fill / 100))
    el.style.width = `${petW}px`
    el.style.height = `${petH}px`

    const img = doc.createElement('img')
    img.className = 'dshww-anim'
    img.src = String(spec.src)
    img.alt = spec.alt ? String(spec.alt) : ''
    img.draggable = false
    img.decoding = 'async'

    const hit = doc.createElement('div')
    hit.className = 'dshww-hit'
    hit.style.width = '54%'
    hit.style.height = '70%'
    el.appendChild(img)
    el.appendChild(hit)

    const pet = {
      el, img, spec, w: petW, h: petH,
      x: Number.isFinite(x) ? x : vw() * 0.3,
      y: Number.isFinite(y) ? y : vh() * 0.4,
      vx: Number.isFinite(vx) ? vx : 0,
      vy: Number.isFinite(vy) ? vy : 0,
      dragging: false, splitCd: 0, onGround: false,
    }

    // 图片读进来之后才知道真实宽高比，这时再修正盒子尺寸
    img.addEventListener('load', () => {
      try {
        const nw = img.naturalWidth || 1
        const nh = img.naturalHeight || 1
        pet.h = Math.max(20, hPct / 100 * vh())
        pet.w = Math.max(16, pet.h * (nw / nh) * (fill / 100))
        el.style.width = `${pet.w}px`
        el.style.height = `${pet.h}px`
        render(pet)
      } catch (err) {}
    })
    img.addEventListener('error', () => {
      el.hidden = true
      warn('动图加载失败：' + spec.src)
    })

    pet.x = clampX(pet, pet.x)
    pet.y = Math.min(vh() - pet.h / 2, Math.max(pet.h / 2, pet.y))
    if (state.config.draggable !== false) attachDrag(pet)

    state.layer.appendChild(el)
    pets.push(pet)
    render(pet)
    return pet
  }

  function clear() {
    for (const pet of pets) if (pet.el.parentNode) pet.el.parentNode.removeChild(pet.el)
    pets.length = 0
    splitLockUntil = 0
    fullSince = 0
    nextEliminateAt = 0
    splitPausedUntil = 0
  }

  function seed() {
    const specs = state.config.characters
    if (!specs.length) return 0
    const n = Math.max(0, Math.min(state.physics.seedCount, specs.length))
    const saved = readSaved()
    for (let i = 0; i < n; i++) {
      const spec = specs[i % specs.length]
      const key = spec.id || spec.src
      const at = saved[key]
      const pet = spawn(
        spec,
        at ? at.x * vw() : vw() * (0.1 + 0.18 * i),
        at ? at.y * vh() : vh() * (0.55 + 0.08 * i),
        (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 90),
        0,
      )
      pet.splitCd = 0.6      // 刚生成时先别立刻被撞裂
    }
    return pets.length
  }

  /**
   * 台球式分裂：每一方各弹出一份新的，沿碰撞法线分开。
   * 「一只只裂一次」这件事**不在这里管** —— 由调用方的 pet.splitCd 冷却控制。
   * （老代码在这里留了个 src.split 布尔锁，导致第一次裂成 4 个之后再也不会裂，
   *   这就是「撞到 4 个就不分裂了」的根因。）
   * @returns 真正新增的数量
   */
  function trySplit(a, b, nx, ny) {
    const P = state.physics
    const angle = Math.atan2(ny, nx)
    let added = 0
    for (const src of [a, b]) {
      if (pets.length >= P.maxPets) break
      const impulse = P.splitImpulse * (0.7 + Math.random() * 0.6)
      const jitter = (Math.random() - 0.5) * 0.9
      const dx = Math.cos(angle + jitter)
      const dy = Math.sin(angle + jitter)
      const child = spawn(
        src.spec,
        src.x + dx * (src.w * 0.5 + 6),
        src.y + dy * (src.h * 0.5 + 6),
        dx * impulse,
        dy * impulse - 140,
      )
      added += 1
      child.el.setAttribute('data-spawn', '1')
      setTimeout(() => { try { child.el.removeAttribute('data-spawn') } catch (err) {} }, 260)
      // 母体吃一点反向冲量，看着才像撞开
      src.vx -= dx * impulse * 0.35
      src.vy -= dy * impulse * 0.35
    }
    return added
  }

  /** 真正推进物理的一帧：dt 单位秒。rAF 与自检都走这里，逻辑只有一份。 */
  /**
   * 同类对消（玩法）：数量**到达上限**并保持 `eliminateDelay` 秒之后，
   * 每 `eliminateInterval` 秒消掉**一对同种**布偶；消掉之后空出名额，
   * 于是又能继续撞、继续裂 —— 数量在上限附近来回呼吸，不会死锁在满员状态。
   *
   * 「同种」按 `src` 判定（同一张动图 = 同一种）。
   * @returns 消掉的只数（0 或 2）
   */
  function tryEliminate() {
    const P = state.physics
    const byKind = {}
    for (const pet of pets) {
      if (pet.dragging) continue                    // 手上拖着的那只不消，免得突然消失
      const kind = String(pet.spec && pet.spec.src || '')
      if (!byKind[kind]) byKind[kind] = []
      byKind[kind].push(pet)
    }
    for (const kind of Object.keys(byKind)) {
      const group = byKind[kind]
      if (group.length < 2) continue
      // 挑距离最近的一对，看着最像"碰在一起消掉了"
      let best = null
      let bestD = Infinity
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const dx = group[i].x - group[j].x
          const dy = group[i].y - group[j].y
          const d = dx * dx + dy * dy
          if (d < bestD) { bestD = d; best = [group[i], group[j]] }
        }
      }
      if (!best) continue
      for (const pet of best) eliminate(pet)
      return 2
    }
    return 0
  }

  /** 消掉一只：留个"噗"的渐隐克隆再摘掉 DOM。 */
  function eliminate(pet) {
    try {
      const ghost = pet.el.cloneNode(true)
      ghost.removeAttribute('id')
      ghost.removeAttribute('data-dshww-clear-bg')
      ghost.removeAttribute('data-dshww-was')
      ghost.setAttribute('data-dshww-pop', '1')
      ghost.style.transform = `translate3d(${pet.x - pet.w / 2}px, ${pet.y - pet.h / 2}px, 0)`
      state.layer.appendChild(ghost)
      setTimeout(() => {
        try { if (ghost.parentNode) ghost.parentNode.removeChild(ghost) } catch (err) {}
      }, 320)
    } catch (err) {}
    const i = pets.indexOf(pet)
    if (i >= 0) pets.splice(i, 1)
    if (pet.el.parentNode) pet.el.parentNode.removeChild(pet.el)
  }

  function integrate(dt) {
    simTime += dt * 1000
    const P = state.physics
    const W = vw()
    const H = vh()

    for (const pet of pets) {
      if (pet.splitCd > 0) pet.splitCd -= dt
      if (pet.dragging) continue
      pet.vy += P.gravity * dt
      pet.vx *= Math.pow(P.friction, dt * 60)
      pet.x += pet.vx * dt
      pet.y += pet.vy * dt

      const halfW = pet.w / 2
      const halfH = pet.h / 2

      // 左右墙
      if (pet.x - halfW < 0) {
        pet.x = halfW
        pet.vx = Math.abs(pet.vx) * P.wallBounce
      } else if (pet.x + halfW > W) {
        pet.x = W - halfW
        pet.vx = -Math.abs(pet.vx) * P.wallBounce
      }

      // 上边界
      const ceil = P.ceiling * H + halfH
      if (pet.y < ceil) {
        pet.y = ceil
        pet.vy = Math.abs(pet.vy) * P.wallBounce
      }

      // 地面
      const ground = P.floor * H - halfH
      pet.onGround = false
      if (pet.y >= ground) {
        pet.y = ground
        if (pet.vy > 0) pet.vy = pet.vy > P.minBounce ? -pet.vy * P.bounce : 0
        pet.onGround = true
        pet.vx *= Math.pow(P.groundFriction, dt * 60)
        if (Math.abs(pet.vx) < 4) pet.vx = 0
      }

      // 两两碰撞（台球）
      for (const other of pets) {
        if (other === pet) continue
        const dx = other.x - pet.x
        const dy = other.y - pet.y
        const minDx = (pet.w + other.w) / 2 * 0.78
        const minDy = (pet.h + other.h) / 2 * 0.86
        if (Math.abs(dx) > minDx || Math.abs(dy) > minDy) continue

        // 沿「重叠更浅」的那条轴分开，法线方向朝对方
        const px = 1 - Math.abs(dx) / (minDx || 1)
        const py = 1 - Math.abs(dy) / (minDy || 1)
        let nx = 0
        let ny = 0

        // ⚠️ 台球式分裂要按**碰撞前**的相对速度判「是否相向」。
        //    一旦在下面交换完速度，relative 就变成 0 了，再判永远不成立 ——
        //    这就是「撞到 4 个之后再也不裂」的真正原因（接触帧里 closing 全是 0）。
        const isX = px < py
        if (isX) {
          nx = dx === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(dx)
        } else {
          ny = dy === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(dy)
        }
        const approach = isX ? (pet.vx - other.vx) * nx : (pet.vy - other.vy) * ny

        // 分离 + 交换法线上的动量
        if (isX) {
          pet.x -= nx * px * minDx * 0.5
          other.x += nx * px * minDx * 0.5
          const rel = other.vx - pet.vx
          if (rel * nx < 0) {
            const exchange = rel * 0.5
            pet.vx += nx * exchange
            other.vx -= nx * exchange
          }
        } else {
          pet.y -= ny * py * minDy * 0.5
          other.y += ny * py * minDy * 0.5
          const rel = other.vy - pet.vy
          if (rel * ny < 0) {
            const exchange = rel * 0.5
            pet.vy += ny * exchange
            other.vy -= ny * exchange
          }
        }

        // 并排撞上（横向接触）＋ 相向而来 ＋ 双方都过了冷却 → 各弹一份新的
        const sideBySide = Math.abs(dy) < (pet.h + other.h) * 0.35
        if (
          sideBySide && isX && approach > 0
          && simTime >= splitLockUntil          // 全局冷却：一次只允许裂一对
          && simTime >= splitPausedUntil        // 满员后的暂停期：一律不裂
          && pets.length < state.physics.maxPets
        ) {
          splitLockUntil = simTime + P.splitCooldown * 1000
          // 被撞的这一对也各记一份冷却，免得它们俩黏在一起反复触发
          pet.splitCd = P.splitCooldown
          other.splitCd = P.splitCooldown
          pushLog('split', { from: pets.length, to: pets.length + 2 })
          trySplit(pet, other, nx, ny)
        }
      }

      render(pet)
    }

    // 满员计时 + 同类对消（玩法）：满了 eliminateDelay 秒之后，每 eliminateInterval 秒消一对同种
    if (pets.length >= P.maxPets) {
      if (!fullSince) {
        fullSince = simTime
        nextEliminateAt = simTime + P.eliminateDelay * 1000
        // 一到上限就停分裂：停 P.splitPause 秒（默认 2 分钟）
        splitPausedUntil = simTime + P.splitPause * 1000
        pushLog('cap-reached', { n: pets.length, pauseS: P.splitPause, delayS: P.eliminateDelay })
      } else if (simTime >= nextEliminateAt) {
        if (tryEliminate() > 0) {
          pushLog('eliminate', { n: pets.length })
          // 空出名额了；下次对消再过 eliminateInterval 秒
          nextEliminateAt = simTime + P.eliminateInterval * 1000
        } else {
          pushLog('eliminate-skip', { n: pets.length, nextIn: 200 })
          // 没有同类可消：退一步继续等，别每帧都算一遍
          nextEliminateAt = simTime + 200
        }
      }
    } else {
      fullSince = 0
      nextEliminateAt = 0
      // 掉到上限以下（对消掉过）就把暂停一并解除：不然会一直锁着
      splitPausedUntil = 0
    }

    if (simTime - saveAt > 1500) {
      saveAt = simTime
      const map = {}
      const specs = state.config.characters
      for (let i = 0; i < Math.min(state.physics.seedCount, pets.length, specs.length); i++) {
        const key = specs[i].id || specs[i].src
        map[key] = { x: +(pets[i].x / W).toFixed(4), y: +(pets[i].y / H).toFixed(4) }
      }
      writeSaved(map)
    }
    updateCount()
  }

  /** rAF 驱动：算 dt -> integrate -> 再排下一帧。 */
  function step(now) {
    raf = globalThis.requestAnimationFrame(step)
    if (!last) { last = now; return }
    const dt = (now - last) / 1000
    last = now
    if (!(dt > 0)) return
    integrate(Math.min(0.033, dt))       // 页面切回来时别一次跳一大步
  }

  function tick() {
    if (raf) return
    last = 0
    raf = globalThis.requestAnimationFrame(step)
  }

  function stop() {
    if (raf) {
      try { globalThis.cancelAnimationFrame(raf) } catch (err) {}
      raf = 0
    }
  }

  function updateCount() {
    if (state.countEl) state.countEl.textContent = `${pets.length}/${state.physics.maxPets}`
  }

  function attachDrag(pet) {
    const hit = pet.el.querySelector('.dshww-hit') || pet.el
    let sx = 0
    let sy = 0
    let lx = 0
    let ly = 0
    let ltime = 0

    const onDown = (ev) => {
      if (ev.button !== undefined && ev.button !== 0) return
      pet.dragging = true
      pet.el.setAttribute('data-dragging', '1')
      sx = ev.clientX
      sy = ev.clientY
      lx = ev.clientX
      ly = ev.clientY
      ltime = performance.now()
      pet.vx = 0
      pet.vy = 0
      // 按下的这一刻浏览器可能已经开始拉选择框了：清掉它，并且整页禁选直到松手
      clearTextSelection()
      beginDragMarker()
      try { hit.setPointerCapture && hit.setPointerCapture(ev.pointerId) } catch (err) {}
      ev.preventDefault()
      ev.stopPropagation()
    }
    const onMove = (ev) => {
      if (!pet.dragging) return
      // 拖的过程中每帧再清一次：有些浏览器是先起选择框、后发 pointermove 的
      clearTextSelection()
      pet.x = clampX(pet, pet.x + (ev.clientX - sx))
      pet.y = Math.min(vh() - pet.h / 2, Math.max(pet.h / 2, pet.y + (ev.clientY - sy)))
      sx = ev.clientX
      sy = ev.clientY
      const now = performance.now()
      const dt = Math.max(8, now - ltime)
      pet.vx = (ev.clientX - lx) / dt * 1000
      pet.vy = (ev.clientY - ly) / dt * 1000
      lx = ev.clientX
      ly = ev.clientY
      ltime = now
      render(pet)
      ev.preventDefault()
      ev.stopPropagation()
    }
    const onUp = (ev) => {
      if (!pet.dragging) return
      pet.dragging = false
      pet.el.removeAttribute('data-dragging')
      endDragMarker()
      try { hit.releasePointerCapture && hit.releasePointerCapture(ev.pointerId) } catch (err) {}
      const cap = 2400
      pet.vx = Math.max(-cap, Math.min(cap, pet.vx))
      pet.vy = Math.max(-cap, Math.min(cap, pet.vy))
      clearTextSelection()
      ev.preventDefault()
      ev.stopPropagation()
    }

    hit.addEventListener('pointerdown', onDown)
    hit.addEventListener('pointermove', onMove)
    hit.addEventListener('pointerup', onUp)
    hit.addEventListener('pointercancel', onUp)
    hit.addEventListener('dragstart', (ev) => ev.preventDefault())
    hit.addEventListener('contextmenu', (ev) => ev.preventDefault())
    // 双击也不该选中/放大
    hit.addEventListener('dblclick', (ev) => { clearTextSelection(); ev.preventDefault() })
    // 兜底：交互被系统打断（比如切窗口）时也要把禁选状态收回来
    hit.addEventListener('lostpointercapture', () => {
      if (!pet.dragging) return
      pet.dragging = false
      pet.el.removeAttribute('data-dragging')
      endDragMarker()
    })
  }

  return {
    pets, spawn, seed, clear, tick, stop, updateCount, render, integrate,
    /** 引擎真正在用的那份物理参数（自检/测试用）。 */
    physics: () => state.physics,
    /** 把「满员后停分裂」的截止时刻清零，立刻解除暂停（自检/测试用）。 */
    releaseSplitPause: () => { splitPausedUntil = 0; return true },
    /** 分裂暂停的剩余秒数（自检/测试用）。 */
    splitPauseLeft: () => Math.max(0, (splitPausedUntil - simTime) / 1000),
    /**
     * 把模拟状态清干净并重新播下种子挂件（自检/测试用）。
     *
     * 为什么需要：分裂/对消/暂停这些玩法会改 `simTime`、`fullSince`、`splitPausedUntil`
     * 和挂件数量，用例之间会互相污染（测试飘过好几次，全是这个原因）。
     * 有了它，每个用例都能从确定的初始状态起跑。
     */
    debugReset: () => {
      clear()
      simTime = 0
      saveAt = 0
      last = 0
      log.length = 0
      seed()
      updateCount()
      return pets.length
    },
    /** 环形调试日志（自检/测试用）。 */
    debugLog: () => log.slice(),
    debugLogClear: () => { log.length = 0; return true },
    /** 挂机奖励：随便落一只新的（已经到上限就不加）。 */
    spawnIdle: () => {
      try {
        if (pets.length >= state.physics.maxPets) return false
        const specs = state.config.characters || []
        if (!specs.length) return false
        const spec = specs[Math.floor(Math.random() * specs.length)]
        const pet = spawn(
          spec,
          vw() * (0.12 + Math.random() * 0.76),
          vh() * 0.12,
          (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 80),
          0,
        )
        pet.splitCd = 0.6
        return true
      } catch (err) { return false }
    },
  }
}

/* ---------------------------------------------------------------- 设置面板 */

const FIELDS = [
  ['maxPets', '数量上限', 1, 30, 1, '个'],
  ['seedCount', '清零后回到', 0, 10, 1, '个'],
  ['gravity', '重力', 0, 4000, 50, 'px/s²'],
  ['bounce', '落地反弹', 0, 1, 0.02, ''],
  ['wallBounce', '撞墙反弹', 0, 1, 0.02, ''],
  ['minBounce', '停稳阈值', 0, 400, 10, 'px/s'],
  ['splitImpulse', '分裂冲量', 0, 900, 20, 'px/s'],
  ['splitCooldown', '碰撞冷却', 0.2, 10, 0.1, 's'],
  ['splitPause', '满员后停分裂', 0, 600, 10, 's'],
  ['eliminateDelay', '满员多久后对消', 0, 120, 1, 's'],
  ['eliminateInterval', '对消间隔', 0.5, 30, 0.5, 's'],
  ['idleSpawnInterval', '挂机多久加一只', 0, 1800, 10, 's'],
  ['friction', '空气阻力', 0.8, 1, 0.005, ''],
  ['groundFriction', '地面摩擦', 0.5, 1, 0.01, ''],
  ['ceiling', '上边界', -0.1, 0.5, 0.01, ''],
  ['floor', '下边界', 0.5, 1.2, 0.01, ''],
]

/** 布尔型设置（勾选框）。 */
const BOOL_FIELDS = [
  ['wallpaper', '显示壁纸', true],
]

/** 界面通透档位（下拉框）。 */
const LEVEL_FIELDS = [
  ['uiClearLevel', '界面通透', 3, [
    [1, '1 · 只透大面板'],
    [2, '2 · 连小块一起透'],
    [3, '3 · 全透（默认）'],
    [0, '0 · 不动界面'],
  ]],
]

function buildPanel(state, api) {
  const doc = document
  const panel = doc.createElement('div')
  panel.id = PANEL_ID
  panel.className = 'dshww-panel'

  const title = doc.createElement('h4')
  title.textContent = '挂件设置'
  panel.appendChild(title)

  // —— 清零：放在最上面，做成竖排按钮 ——
  const actionsTop = doc.createElement('div')
  actionsTop.className = 'dshww-actions dshww-actions-vertical'
  const clear = doc.createElement('button')
  clear.className = 'dshww-btn'
  clear.textContent = '清零'
  actionsTop.appendChild(clear)
  panel.appendChild(actionsTop)

  const note = doc.createElement('p')
  note.className = 'dshww-note'
  note.textContent = '点保存写进 $DSH_HOME/.dshw-wallpaper-settings.json；打开面板时物理会冻结，方便调参'
  panel.appendChild(note)

  // —— 渲染：壁纸开关（布尔字段）+ 数量 + 物理 ——
  const inputs = {}

  const groupRender = doc.createElement('div')
  groupRender.className = 'dshww-group'
  groupRender.textContent = '渲染'
  panel.appendChild(groupRender)

  const boolRows = {}
  for (const [key, label, def] of BOOL_FIELDS) {
    const row = doc.createElement('div')
    row.className = 'dshww-field'
    const lab = doc.createElement('label')
    lab.textContent = label
    const cb = doc.createElement('input')
    cb.type = 'checkbox'
    cb.checked = def
    row.appendChild(lab)
    row.appendChild(cb)
    panel.appendChild(row)
    boolRows[key] = cb
  }

  // 界面通透档位（下拉框）：改完立刻重扫一遍
  const levelRows = {}
  for (const [key, label, def, options] of LEVEL_FIELDS) {
    const row = doc.createElement('div')
    row.className = 'dshww-field'
    const lab = doc.createElement('label')
    lab.textContent = label
    const sel = doc.createElement('select')
    for (const [val, text] of options) {
      const opt = doc.createElement('option')
      opt.value = String(val)
      opt.textContent = text
      sel.appendChild(opt)
    }
    sel.value = String(def)
    row.appendChild(lab)
    row.appendChild(sel)
    panel.appendChild(row)
    levelRows[key] = sel
  }

  const groupCount = doc.createElement('div')
  groupCount.className = 'dshww-group'
  groupCount.textContent = '数量'
  panel.appendChild(groupCount)

  let inPhysics = false
  for (const [key, label, min, max, step, unit] of FIELDS) {
    if (key === 'gravity' && !inPhysics) {
      inPhysics = true
      const g = doc.createElement('div')
      g.className = 'dshww-group'
      g.textContent = '物理'
      panel.appendChild(g)
    }
    const row = doc.createElement('div')
    row.className = 'dshww-field'
    const lab = doc.createElement('label')
    lab.textContent = label
    const range = doc.createElement('input')
    range.type = 'range'
    range.min = String(min)
    range.max = String(max)
    range.step = String(step)
    const numInput = doc.createElement('input')
    numInput.type = 'number'
    numInput.min = String(min)
    numInput.max = String(max)
    numInput.step = String(step)
    const unitEl = doc.createElement('span')
    unitEl.className = 'dshww-unit'
    unitEl.textContent = unit

    range.addEventListener('input', () => { numInput.value = range.value })
    numInput.addEventListener('input', () => { range.value = numInput.value })

    row.appendChild(lab)
    row.appendChild(range)
    row.appendChild(numInput)
    row.appendChild(unitEl)
    panel.appendChild(row)
    inputs[key] = {
      set(v) {
        const val = Number(v)
        if (!Number.isFinite(val)) return
        range.value = String(val)
        numInput.value = String(+val.toFixed(4))
      },
      get: () => Number(numInput.value),
    }
  }

  const status = doc.createElement('p')
  status.className = 'dshww-note'
  status.style.margin = '10px 0 0'
  panel.appendChild(status)

  const actions = doc.createElement('div')
  actions.className = 'dshww-actions'
  const save = doc.createElement('button')
  save.className = 'dshww-btn'
  save.dataset.primary = '1'
  save.textContent = '保存'
  const reset = doc.createElement('button')
  reset.className = 'dshww-btn'
  reset.textContent = '恢复默认'
  actions.appendChild(save)
  actions.appendChild(reset)
  panel.appendChild(actions)

  const fill = (physics) => {
    for (const key of Object.keys(inputs)) inputs[key].set(physics[key])
    for (const key of Object.keys(boolRows)) boolRows[key].checked = physics[key] !== false
    for (const key of Object.keys(levelRows)) {
      const v = physics[key]
      if (v !== undefined && v !== null) levelRows[key].value = String(v)
    }
  }
  fill(state.physics)

  // 界面通透档位：换一档立刻重扫（不用保存、不用重启）
  if (levelRows.uiClearLevel) {
    levelRows.uiClearLevel.addEventListener('change', () => {
      const v = Number(levelRows.uiClearLevel.value)
      globalThis.__dshWhaleWallpaperClearLevel = v
      api.refreshTransparency()
      status.textContent = `界面通透 = ${v}（已立即生效，点保存落盘）`
    })
  }

  // 壁纸开关：勾/去勾立刻看到效果（保存才落盘）
  if (boolRows.wallpaper) {
    const box = boolRows.wallpaper
    box.addEventListener('change', () => {
      api.applyWallpaper(box.checked)      // 用勾选框当前值，别用 state 里那份（可能还没更新）
      status.textContent = box.checked ? '壁纸已开（点保存落盘）' : '壁纸已关（点保存落盘）'
    })
  }

  save.addEventListener('click', async () => {
    const physics = {}
    for (const key of Object.keys(inputs)) physics[key] = inputs[key].get()
    for (const key of Object.keys(boolRows)) physics[key] = boolRows[key].checked
    for (const key of Object.keys(levelRows)) physics[key] = Number(levelRows[key].value)
    status.textContent = '正在保存…'
    const res = await api.save(physics)
    if (res && res.ok) {
      fill(res.physics)
      state.physics = resolvePhysics(res.physics)
      api.applyPhysics()
      status.textContent = `已保存（${new Date().toLocaleTimeString()}）`
    } else {
      status.textContent = '保存失败：宿主没写成功，看下 .dshw-wallpaper.log'
    }
  })

  reset.addEventListener('click', async () => {
    const res = await api.reset()
    if (res && res.ok) {
      fill(res.physics)
      state.physics = resolvePhysics(res.physics)
      api.applyPhysics()
      status.textContent = '已恢复默认值'
    } else status.textContent = '恢复失败'
  })

  clear.addEventListener('click', () => {
    api.clearCount()
    status.textContent = `已清零：现在 ${state.physics.seedCount} 个`
  })

  return { panel, fill, status }
}

/* ---------------------------------------------------------------- 入口 */

export function injectWallpaper(userConfig) {
  const config = merge(userConfig)
  const doc = document
  globalThis.__dshWhaleWallpaper = true
  // 允许按最新配置重新挂载（设置面板保存后、自检脚本里都要用）
  globalThis.__dshWhaleWallpaperMount = (next) => mount(next ? merge(next) : config)

  if (!doc || !(doc.body || doc.documentElement)) {
    let tries = 0
    const timer = setInterval(() => {
      tries += 1
      if (doc && (doc.body || doc.documentElement)) {
        clearInterval(timer)
        try { mount(config) } catch (err) { warn(err) }
      } else if (tries > 200) clearInterval(timer)
    }, 100)
    return
  }
  mount(config)
}

/** 从资源 URL 推出接口前缀（配置里给的其实就是一个 assets 路径）。 */
function apiBase(config) {
  const s = String(config.wallpaper || '')
  const cut = s.lastIndexOf('/')
  return cut > 0 ? s.slice(0, cut) : '/dsh-whale-wallpaper'
}

function mount(config) {
  const doc = document

  if (globalThis.__dshWhaleWallpaperApi) {
    try { globalThis.__dshWhaleWallpaperApi.dispose() } catch (err) {}
  }
  globalThis.__dshWhaleWallpaperKeep = false
  removeEl(LAYER_ID)
  removeEl(PETS_ID)
  removeEl(BAR_ID)
  removeEl(PANEL_ID)
  removeEl(CANVAS_STYLE_ID)
  appendStyle(STYLE_ID, stylesheet())

  if (!config.enabled) {
    removeEl(UI_TRANSPARENT_STYLE_ID)
    return
  }

  if (config.transparentUI) appendStyle(UI_TRANSPARENT_STYLE_ID, UI_TRANSPARENT_CSS)
  else removeEl(UI_TRANSPARENT_STYLE_ID)

  const root = doc.getElementById('root')
  if (root) {
    const parts = []
    if (config.transparentUI && config.uiOpacity < 1) parts.push(`opacity(${config.uiOpacity})`)
    if (config.transparentUI && config.uiSaturate !== 1) parts.push(`saturate(${config.uiSaturate})`)
    root.style.filter = parts.join(' ')
  }

  // 把「自己带底色」的界面元素清成透明 —— 不然壁纸会被糊住
  // （见 UI_TRANSPARENT_CSS / fixOpaqueAppLayers 上面那段注释）
  globalThis.__dshWhaleWallpaperClearLevel = config.uiClearLevel
  globalThis.__dshWhaleWallpaperConfig = config      // 挂机监听要靠它读当前配置
  const clearedLayers = config.transparentUI ? fixOpaqueAppLayers() : []
  config.clearedLayers = clearedLayers
  // 外壳是异步上色的：挂载时扫不到东西很正常，得盯着树一直补
  if (config.transparentUI) watchOpaqueLayers()

  const parent = doc.body || doc.documentElement

  // ① 壁纸：用一个真 <img> 铺满，**不要用 CSS 背景图**。
  //
  // 为什么（这是「背景只闪一下就没」的根因）：
  //   桌面端外壳把页面放在自定义协议 dsh-app://app 下，它的协议处理器里写着
  //     const origin = request.headers.get('origin')
  //     if (origin !== null && origin !== 'dsh-app://app') return new Response(null, { status: 403 })
  //   CSS background-image 的请求**带 Origin 头** → 被挡掉，图永远取不到
  //   （于是计算样式里有 url(...)、画面上却是空的，只在样式刚应用那一瞬间看得到）；
  //   而 <img> 的图片请求不带 Origin → 畅通（挂件一直正常就是这个原因）。
  appendStyle(CANVAS_STYLE_ID, canvasCss())
  const canvasVars = doc.documentElement
  const canvasUrl = String(config.wallpaper).replace(/"/g, '%22')
  const canvasFilters = []
  if (config.brightness !== 1) canvasFilters.push(`brightness(${config.brightness})`)
  if (config.blur > 0) canvasFilters.push(`blur(${config.blur}px)`)
  canvasVars.style.setProperty('--dshww-canvas-filter', canvasFilters.length ? canvasFilters.join(' ') : 'none')
  // 尺寸变量给 <img> 的 object-fit 用（cover / contain / 100% 100%）
  canvasVars.style.setProperty('--dshww-canvas-size', config.fit === 'fill' ? '100% 100%' : String(config.fit))
  // 画布层背景变量留 none：CSS 背景那条路不再走，免得同一个图被请求两遍
  canvasVars.style.setProperty('--dshww-canvas-image', 'none')

  const layer = doc.createElement('div')
  layer.id = LAYER_ID
  layer.className = 'dshww-layer'
  layer.setAttribute('aria-hidden', 'true')
  layer.style.zIndex = '-1'

  const wallpaperImg = doc.createElement('img')
  wallpaperImg.className = 'dshww-wallpaper'
  wallpaperImg.alt = ''
  wallpaperImg.draggable = false
  wallpaperImg.decoding = 'async'
  wallpaperImg.src = canvasUrl
  wallpaperImg.addEventListener('error', () => {
    wallpaperImg.hidden = true          // 取不到就藏掉，别留个破图占位
    warn('壁纸图加载失败：' + canvasUrl)
  })
  layer.appendChild(wallpaperImg)

  if (config.veil) {
    layer.style.setProperty('--dshww-veil', String(config.veil))
    const veil = doc.createElement('div')
    veil.className = 'dshww-veil'
    veil.style.background = String(config.veil)
    layer.appendChild(veil)
  }
  parent.appendChild(layer)

  if (config.pets === false || !config.characters.length) return

  // ② 挂件层 + 物理
  const petsLayer = doc.createElement('div')
  petsLayer.id = PETS_ID
  petsLayer.className = 'dshww-pets'
  petsLayer.style.zIndex = String(PETS_Z)
  parent.appendChild(petsLayer)

  const state = {
    config,
    physics: resolvePhysics(config.physics),
    layer: petsLayer,
    countEl: null,
  }
  // 引擎读的是 state.config.physics，这里绑成同一个对象，设置面板一改两边都变
  const canvasState = { on: config.physics ? config.physics.wallpaper !== false : true }
  config.physics = state.physics

  const bar = doc.createElement('div')
  bar.id = BAR_ID
  bar.className = 'dshww-bar'
  const countEl = doc.createElement('span')
  countEl.className = 'dshww-count'
  const settingsBtn = doc.createElement('button')
  settingsBtn.className = 'dshww-btn'
  settingsBtn.textContent = '设置'
  bar.appendChild(countEl)
  bar.appendChild(settingsBtn)
  parent.appendChild(bar)
  state.countEl = countEl

  const engine = createEngine(state)
  const base = apiBase(config)

  /** 开关壁纸（设置面板里那个勾选框，勾/去勾立刻生效）。 */
  const applyWallpaper = (on) => {
    canvasState.on = on !== false
    try {
      // 用 hidden 属性而不是 .hidden 属性：样式表里有 [hidden] 规则，属性更不容易被别处覆盖
      if (canvasState.on) {
        wallpaperImg.removeAttribute('hidden')
        layer.removeAttribute('hidden')
      } else {
        wallpaperImg.setAttribute('hidden', '')
        layer.setAttribute('hidden', '')
      }
    } catch (err) {}
  }

  // 物理参数以宿主侧文件为准：注入行里那份是启动时的快照，这里补一次最新值。
  const pullSettings = async () => {
    try {
      const res = await fetch(`${base}/settings.json`, { headers: { 'Cache-Control': 'no-store' } })
      const data = await res.json()
      if (data && data.ok && data.physics) {
        state.physics = resolvePhysics(data.physics)
        config.physics = state.physics
        globalThis.__dshWhaleWallpaperClearLevel = state.physics.uiClearLevel
        for (const pet of engine.pets) pet.sp = state.physics
        engine.updateCount()
        applyWallpaper(state.physics.wallpaper)
        api.refreshTransparency()
      }
    } catch (err) { /* 拿不到就用注入的那份 */ }
  }

  const api = {
    save: async (physics) => {
      try {
        const res = await fetch(`${base}/settings.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ physics }),
        })
        return await res.json()
      } catch (err) { return { ok: false } }
    },
    reset: async () => {
      try {
        const res = await fetch(`${base}/settings.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reset: true }),
        })
        return await res.json()
      } catch (err) { return { ok: false } }
    },
    clearCount: () => {
      engine.clear()
      engine.seed()
      engine.tick()
      engine.updateCount()
      writeSaved({})
    },
    refreshSettings: () => pullSettings(),
    applyPhysics: () => engine.updateCount(),
    /** 壁纸开关（设置面板里的勾选框）。 */
    applyWallpaper,
    /** 界面重渲染后重新清一遍「糊住壁纸」的底色（MutationObserver 会一直叫它）。 */
    refreshTransparency: () => {
      if (state.config.transparentUI) {
        const list = fixOpaqueAppLayers()
        state.config.clearedLayers = list
        globalThis.__dshWhaleWallpaperLastScan = {
          at: new Date().toISOString(),
          cleared: list.length,
          sample: list.slice(0, 6),
        }
      }
    },
    /** 给自检/调试用：拿到内部挂件列表（每个对象含 x/y/vx/vy/w/h 与 DOM 节点）。 */
    debugPets: () => engine.pets,
    /** 给自检用：手动推进一帧物理（dt 秒）。 */
    debugStep: (dt) => engine.integrate(dt),
    /** 给自检用：挂机奖励的状态对象（含 step(now)，可以直接喂时间戳测）。 */
    debugIdle: () => globalThis.__dshWhaleWallpaperIdle,
    /** 给自检用：引擎**真正在用**的那份物理参数（注意不是启动快照）。 */
    debugPhysics: () => engine.physics(),
    /** 给自检用：把「满员后停分裂」的截止时刻清零，立刻解除暂停。 */
    debugReleaseSplitPause: () => engine.releaseSplitPause(),
    /** 给自检用：读分裂暂停的剩余秒数（0 表示已解除）。 */
    debugSplitPauseLeft: () => engine.splitPauseLeft(),
    /** 给自检用：清干净模拟状态并重新播种（每个用例从确定状态起跑）。 */
    debugReset: () => engine.debugReset(),
    /** 给自检用：读环形调试日志（玩法分支的关键决策）。 */
    debugLog: () => engine.debugLog(),
    /** 给自检用：清空调试日志。 */
    debugLogClear: () => engine.debugLogClear(),
    dispose: () => {
      engine.stop()
      removeEl(BAR_ID)
      removeEl(PANEL_ID)
    },
  }
  globalThis.__dshWhaleWallpaperApi = api

  let panelApi = null
  settingsBtn.addEventListener('click', () => {
    if (doc.getElementById(PANEL_ID)) {
      removeEl(PANEL_ID)
      engine.tick()
      return
    }
    panelApi = buildPanel(state, api)
    parent.appendChild(panelApi.panel)
    engine.stop()          // 打开面板先冻结，方便调参看效果
  })

  engine.seed()
  engine.updateCount()
  engine.tick()
  keepInPlace(engine)
  watchIdle(engine)
  pullSettings()
  reportDiag(base)
}

/**
 * 把页面里「实际算出来的样式」回传给宿主写进日志。
 *
 * 为什么需要这个：桌面端窗口里的真实情况我这边看不到，也不方便让你一直开 DevTools。
 * 这段回传能一次性回答：注入行到底执行了没有、壁纸 URL 有没有被解析、
 * 外壳的底色清掉没有、壁纸图片有没有真的解码出来、各层算出来的 z-index 是多少。
 */
function reportDiag(base) {
  const send = (tag) => {
    const post = (payload) => {
      try {
        const f = globalThis.fetch
        if (typeof f !== 'function') return
        f.call(globalThis, `${base}/diag.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {})
      } catch (err) {}
    }
    try {
      const doc = document
      // 注意：打包成 IIFE 之后不要裸写 innerWidth/location/getComputedStyle，
      // 一律从 globalThis 取，这样在浏览器和自检环境里行为一致
      const view = globalThis
      const css = view.getComputedStyle || (() => null)
      const bodyCs = css(doc.body) || {}
      const htmlCs = css(doc.documentElement) || {}
      const rootEl = doc.getElementById('root')
      const rootCs = rootEl ? (css(rootEl) || {}) : null
      const cache = new Map()
      const csOf = (el) => {
        if (!cache.has(el)) cache.set(el, css(el) || {})
        return cache.get(el)
      }
      const canvas = doc.getElementById(CANVAS_STYLE_ID)
      const canvasVarSource = doc.documentElement.style
      const innerW = view.innerWidth || (doc.documentElement && doc.documentElement.clientWidth) || 0
      const innerH = view.innerHeight || (doc.documentElement && doc.documentElement.clientHeight) || 0
      const probes = []
      const probeNotes = []
      for (const el of [doc.documentElement, doc.body, rootEl, doc.getElementById(LAYER_ID), doc.getElementById(PETS_ID)]) {
        if (!el) continue
        const label = el.id ? '#' + el.id : String(el.tagName || '?').toLowerCase()
        let r = null
        if (typeof el.getBoundingClientRect === 'function') {
          r = el.getBoundingClientRect()
        } else {
          probeNotes.push(label + ': 没有 getBoundingClientRect（ctor=' + String(el.constructor && el.constructor.name) + '）')
        }
        let cs = null
        try { cs = csOf(el) } catch (err) { probeNotes.push(label + ': getComputedStyle 失败 ' + err) }
        probes.push({
          el: label,
          rect: r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null,
          z: cs ? cs.zIndex : '?',
          pos: cs ? cs.position : '?',
          bgColor: cs ? cs.backgroundColor : '?',
          bgImage: cs ? String(cs.backgroundImage).slice(0, 200) : '?',
          opacity: cs ? cs.opacity : '?',
        })
      }
      const loc = view.location || {}
      const payload = {
        tag,
        href: String(loc.href || '').slice(0, 200),
        origin: String(loc.origin || ''),
        viewport: [innerW, innerH],
        readyState: doc.readyState,
        ua: String((view.navigator && view.navigator.userAgent) || '').slice(0, 160),
        canvasVar: canvas ? {
          image: canvasVarSource.getPropertyValue('--dshww-canvas-image'),
          size: canvasVarSource.getPropertyValue('--dshww-canvas-size'),
          filter: canvasVarSource.getPropertyValue('--dshww-canvas-filter'),
        } : null,
        computed: {
          htmlBg: String(htmlCs.backgroundColor) + ' | ' + String(htmlCs.backgroundImage).slice(0, 200),
          bodyBg: String(bodyCs.backgroundColor) + ' | ' + String(bodyCs.backgroundImage).slice(0, 200),
          bodyFilter: bodyCs.filter,
          bodySize: String(bodyCs.backgroundSize) + ' ' + String(bodyCs.backgroundAttachment),
          rootBg: rootCs ? rootCs.backgroundColor : '(没有 #root)',
        },
        pets: {
          count: doc.getElementById(PETS_ID) ? doc.getElementById(PETS_ID).children.length : 0,
          bar: !!doc.getElementById(BAR_ID),
        },
        // 壁纸现在是一个 <img>：把它的真实状态报上去（src / 是否隐藏 / 有没有解码出尺寸）
        wallpaper: (() => {
          try {
            const el = doc.getElementById(LAYER_ID)
            const img = el ? el.querySelector('.dshww-wallpaper') : null
            if (!img) return null
            return {
              src: String(img.getAttribute('src') || img.src || '').slice(0, 200),
              hidden: !!img.hidden,
              complete: !!img.complete,
              natural: [img.naturalWidth || 0, img.naturalHeight || 0],
              layerHidden: !!(el && el.hidden),
            }
          } catch (err) { return { error: String(err && err.message || err) } }
        })(),
        // 从壁纸往上每一层的「会把它变淡」的属性都报上来：
        // opacity / filter / backdrop-filter / mix-blend-mode / 背景色
        // （「背景很淡」这种问题只能这么定位 —— 逐层看谁在动它）
        ancestorChain: (() => {
          const out = []
          try {
            let node = doc.getElementById(LAYER_ID)
            let depth = 0
            while (node && depth < 14) {
              const cs = csOf(node) || {}
              out.push({
                el: (node.id ? '#' + node.id : String(node.tagName || '?').toLowerCase())
                  + (node.className ? '.' + String(node.className).split(/\s+/)[0] : ''),
                opacity: cs.opacity,
                filter: cs.filter,
                backdrop: cs.backdropFilter,
                blend: cs.mixBlendMode,
                bg: cs.backgroundColor,
                z: cs.zIndex,
                pos: cs.position,
              })
              node = node.parentElement
              depth += 1
            }
          } catch (err) { out.push({ error: String(err && err.message || err) }) }
          return out
        })(),
        probeNotes,
        // 最近一次「补扫」的结果 —— 用来确认 MutationObserver 到底有没有在工作
        lastScan: globalThis.__dshWhaleWallpaperLastScan || null,
        // 主题里跟底色有关的 CSS 变量当前值 —— 界面面板大多直接用它们，
        // 想「从根上」让界面透明就得先知道这几个值。
        themeVars: (() => {
          const out = {}
          try {
            const cs0 = csOf(doc.documentElement) || {}
            const names = [
              '--dsw-alias-bg-base', '--dsw-alias-bg-elevated', '--dsw-alias-bg-layer',
              '--dsw-alias-bg-container', '--dsw-alias-bg-mask', '--dsw-alias-bg-popup',
              '--dsw-alias-border-l1', '--dsw-alias-border-l2',
            ]
            for (const n of names) {
              const v = cs0.getPropertyValue ? cs0.getPropertyValue(n) : ''
              if (v) out[n] = String(v).trim()
            }
          } catch (err) { out.error = String(err && err.message || err) }
          return out
        })(),
        // 这次启动被清掉的不透明外壳容器（有这个动作壁纸才透得出来）
        clearedLayers: (() => {
          try {
            const out = []
            const rootEl3 = doc.getElementById('root')
            if (rootEl3 && typeof rootEl3.querySelectorAll === 'function') {
              const list = rootEl3.querySelectorAll('[data-dshww-clear-bg="1"]')
              for (const n of list) {
                out.push((n.id ? '#' + n.id : String(n.tagName || '?').toLowerCase())
                  + (n.className ? '.' + String(n.className).split(/\s+/).slice(0, 2).join('.') : ''))
              }
            }
            return out
          } catch (err) { return [] }
        })(),
        // 「壁纸被界面盖住」的定位器：在**整页**里找出盖住 ≥5% 屏、且带底色的元素，
        // 按面积从大到小排 —— 最上面那个大块就是糊住壁纸的元凶。
        opaqueLayers: (() => {
          const out = []
          try {
            const rootEl2 = doc.getElementById('root')
            if (!rootEl2) return [{ note: '没有 #root' }]
            const all = []
            const collect2 = (node) => {
              if (!node) return
              all.push(node)
              if (typeof node.querySelectorAll === 'function') {
                for (const n of node.querySelectorAll('*')) all.push(n)
              } else {
                for (const c of node.children || []) collect2(c)
              }
            }
            collect2(doc.body || doc.documentElement)
            const vw2 = innerW || 1
            const vh2 = innerH || 1
            for (const node of all) {
              if (node.id === LAYER_ID || node.id === PETS_ID) continue
              const cs = csOf(node) || {}
              const bg = String(cs.backgroundColor || '')
              const bi = String(cs.backgroundImage || 'none')
              const hasBg = (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') || (bi && bi !== 'none')
              if (!hasBg) continue
              const r = typeof node.getBoundingClientRect === 'function' ? node.getBoundingClientRect() : null
              const area = r ? r.width * r.height : 0
              if (area < vw2 * vh2 * 0.01) continue         // 只看盖住 1% 屏以上的
              out.push({
                el: (node.id ? '#' + node.id : String(node.tagName || '?').toLowerCase())
                  + (node.className ? '.' + String(node.className).split(/\s+/).slice(0, 2).join('.') : ''),
                areaPct: Number((area / (vw2 * vh2) * 100).toFixed(1)),
                at: r ? `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}` : '?',
                bg,
                bgImage: bi === 'none' ? 'none' : bi.slice(0, 60),
                cleared: node.getAttribute('data-dshww-clear-bg') === '1',
                keepOpaque: node.getAttribute('data-dshww-keep-opaque') === '1',
                opacity: cs.opacity,
                z: cs.zIndex,
              })
            }
            out.sort((a, b) => (b.areaPct || 0) - (a.areaPct || 0))
          } catch (err) { out.push({ error: String(err && err.message || err) }) }
          return out.slice(0, 15)
        })(),
        probes,
      }
      post(payload)
    } catch (err) {
      // 采样式失败也要回传：不然这边永远不知道为什么没收到报告
      post({ tag, diagError: String((err && err.message) || err), stack: String((err && err.stack) || '').slice(0, 600) })
    }
  }

  send('client-mounted')
  // 用探针 Image 单独验证「这张图到底能不能解码」——比读 computed style 更硬
  const probeUrl = (() => {
    try {
      // 变量现在设在 documentElement 上
      const raw = doc.documentElement.style.getPropertyValue('--dshww-canvas-image')
      const m = /url\(["']?(.*?)["']?\)/.exec(raw)
      return m ? m[1] : ''
    } catch (err) { return '' }
  })()
  const probe = new Image()
  probe.onload = () => { try { send('wallpaper-image-loaded ' + probe.naturalWidth + 'x' + probe.naturalHeight) } catch (err) {} }
  probe.onerror = () => { try { send('wallpaper-image-FAILED') } catch (err) {} }
  probe.src = probeUrl
  const t2 = setTimeout(() => send('after-2s'), 2000)
  // 自检用的定时器不该拖着进程（Node 里跑测试时尤其明显）
  if (t2 && typeof t2.unref === 'function') t2.unref()

  const onKey = (ev) => {
    try {
      if (ev.altKey && ev.shiftKey && (ev.key === 'D' || ev.key === 'd')) send('manual-hotkey')
    } catch (err) {}
  }
  try {
    globalThis.addEventListener('keydown', onKey)
    setTimeout(() => { try { globalThis.removeEventListener('keydown', onKey) } catch (err) {} }, 120000)
  } catch (err) {}
}

/** 层被别的插件或框架摘掉时补回来（低频检查，不做 MutationObserver）。 */
function keepInPlace(engine) {
  if (globalThis.__dshWhaleWallpaperKeep) return
  globalThis.__dshWhaleWallpaperKeep = true
  setInterval(() => {
    try {
      const doc = document
      if (!doc.body) return
      for (const id of [LAYER_ID, PETS_ID, BAR_ID]) {
        const el = doc.getElementById(id)
        if (el && !el.parentNode) doc.body.appendChild(el)
      }
      engine.tick()          // 标签页切回来时 rAF 会被暂停，补一次
    } catch (err) {}
  }, 3000)
}

function warn(err) {
  try { console.warn('[dsh-whale-wallpaper] ' + err) } catch (err2) {}
}

// 页面半侧冒烟测试：自己糊一个最小 DOM + localStorage + rAF + 可控时钟，
// 把打包好的 lib/client.js 当 classic script 跑一遍，检查：
//   ① 两个层都在；壁纸必须是真 <img>（CSS 背景图会被 dsh-app 协议挡掉）
//   ② 起步生成 seedCount 个挂件
//   ③ 物理：会往下掉、停在地面（floor）上
//   ④ 分裂：撞上会各裂一份，一路能到 maxPets，超过上限不再涨
//   ④b 同类对消：满员保持 eliminateDelay 后每 eliminateInterval 消一对同种
//   ④c 挂机奖励：连续一段时间没键鼠就落一只（间隔设 0 可关）
//   ⑤ 拖动：跟着指针走、松手留下速度、不许拖出屏幕
//   ⑥ 设置面板：清零竖排在顶部、壁纸开关、字段齐全、面板清零有效
//   ⑦ 幂等 / enabled=false 清理
import assert from 'node:assert/strict'
import fs from 'node:fs'

const CLIENT = process.argv[2] || 'dsh-whale-wallpaper/lib/client.js'
const code = fs.readFileSync(CLIENT, 'utf8')

/* ---------------------------------------------------------------- 最小 DOM */
class CssStyle {
  constructor() { this.props = new Map(); this._cssText = '' }
  setProperty(k, v) { this.props.set(k, String(v)) }
  getPropertyValue(k) { return this.props.get(k) || '' }
  set cssText(v) { this._cssText = String(v) }
  get cssText() { return this._cssText }
}
for (const key of ['background', 'backgroundImage', 'backgroundSize', 'filter', 'transform',
  'opacity', 'zIndex', 'width', 'height', 'position']) {
  Object.defineProperty(CssStyle.prototype, key, {
    get() { return this.props.get(key) || '' },
    set(v) { this.props.set(key, String(v)) },
  })
}

const registry = new Map()
class El {
  constructor(tag) {
    this.tagName = String(tag || 'div').toUpperCase()
    this.children = []
    this.parentNode = null
    this.attributes = {}
    this.dataset = {}
    this.style = new CssStyle()
    this.listeners = {}
    this.textContent = ''
    this.hidden = false
    this.title = ''
    this.type = ''
    this.value = ''
    this.src = ''
    this.alt = ''
    this.draggable = true
    this.decoding = ''
    this.naturalWidth = 0
    this.naturalHeight = 0
    this.captured = null
    this._id = ''
  }
  get id() { return this._id }
  set id(v) { this._id = String(v); this.attributes.id = this._id; registry.set(this._id, this) }
  get className() { return this.attributes.class || '' }
  set className(v) { this.attributes.class = v }
  get firstChild() { return this.children[0] || null }
  setAttribute(k, v) {
    this.attributes[k] = String(v)
    if (k === 'id') {
      const old = registry.get(String(v))
      if (old && old !== this && old.parentNode) old._id = ''
      this._id = String(v)
      registry.set(this._id, this)
    }
    if (k.startsWith('data-')) {
      this.dataset[k.slice(5).replace(/-([a-z])/g, (m, c) => c.toUpperCase())] = String(v)
    }
  }
  getAttribute(k) { return k in this.attributes ? this.attributes[k] : null }
  removeAttribute(k) {
    delete this.attributes[k]
    if (k.startsWith('data-')) delete this.dataset[k.slice(5).replace(/-([a-z])/g, (m, c) => c.toUpperCase())]
  }
  appendChild(node) {
    if (node.parentNode) node.parentNode.removeChild(node)
    node.parentNode = this
    this.children.push(node)
    if (node.id) registry.set(node.id, node)
    return node
  }
  removeChild(node) {
    const i = this.children.indexOf(node)
    if (i >= 0) this.children.splice(i, 1)
    node.parentNode = null
    // 真 DOM 里被摘掉的节点不再被 getElementById 找到，这里也照做
    if (node.id && registry.get(node.id) === node) registry.delete(node.id)
    return node
  }
  insertBefore(node, ref) {
    const i = ref ? this.children.indexOf(ref) : -1
    if (node.parentNode) node.parentNode.removeChild(node)
    node.parentNode = this
    if (i < 0) this.children.push(node)
    else this.children.splice(i, 0, node)
    if (node.id) registry.set(node.id, node)
    return node
  }
  querySelector(sel) {
    // ⚠️ 真 DOM 的 querySelectorAll('*') 是「所有后代」，不是类名匹配。
    //    引擎扫整页就靠这个选择器，之前这里没实现，导致测试里引擎根本扫不到新加的节点。
    if (String(sel) === '*') return this.descendants
    const cls = String(sel).replace(/^\./, '')
    return this.findByClass(cls)[0] || null
  }
  querySelectorAll(sel) {
    if (String(sel) === '*') return this.descendants
    return this.findByClass(String(sel).replace(/^\./, ''))
  }
  closest(sel) {
    const cls = String(sel).replace(/^[.#]/, '')
    let n = this
    while (n) {
      if (n.id === cls || String(n.className).split(/\s+/).includes(cls)) return n
      n = n.parentNode
    }
    return null
  }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn) }
  removeEventListener(type, fn) {
    const list = this.listeners[type] || []
    const i = list.indexOf(fn)
    if (i >= 0) list.splice(i, 1)
  }
  setPointerCapture(id) { this.captured = id }
  releasePointerCapture() { this.captured = null }
  /** 极简 getBoundingClientRect：有内联宽高就用，否则按视口大小算。 */
  getBoundingClientRect() {
    const num = (v, fallback) => {
      const m = /^([\d.]+)px$/.exec(String(v || ''))
      return m ? Number(m[1]) : fallback
    }
    return {
      left: 0, top: 0,
      width: num(this.style.width, 1600),
      height: num(this.style.height, 900),
    }
  }
  fire(type, ev = {}) {
    const event = Object.assign({
      type, target: this, clientX: 0, clientY: 0, button: 0, pointerId: 1,
      preventDefault() {}, stopPropagation() {},
    }, ev)
    for (const fn of [...(this.listeners[type] || [])]) fn(event)
    return event
  }
  click() { return this.fire('click') }
  findByClass(cls, out = []) {
    for (const c of this.children) {
      if (String(c.className).split(/\s+/).includes(cls)) out.push(c)
      c.findByClass(cls, out)
    }
    return out
  }
  get descendants() {
    const out = []
    const walk = (n) => { for (const c of n.children) { out.push(c); walk(c) } }
    walk(this)
    return out
  }
}

const body = new El('body')
const head = new El('head')
const rootEl = new El('div')
rootEl.id = 'root'
const composer = new El('div')
composer.setAttribute('data-composer-input', 'true')
rootEl.appendChild(composer)
body.appendChild(rootEl)

const document = {
  body,
  head,
  documentElement: head,
  createElement: (tag) => new El(tag),
  getElementById: (id) => registry.get(id) || null,
  querySelector: () => null,
}

/** 极简 getComputedStyle：从内联样式取值，够「自检回传」那段用。 */
const getComputedStyle = (el) => ({
  backgroundColor: el.style.getPropertyValue('backgroundColor') || 'rgba(0, 0, 0, 0)',
  backgroundImage: el.style.getPropertyValue('backgroundImage') || 'none',
  backgroundSize: el.style.getPropertyValue('backgroundSize') || 'auto',
  backgroundAttachment: 'fixed',
  filter: el.style.getPropertyValue('filter') || 'none',
  zIndex: el.style.getPropertyValue('zIndex') || 'auto',
  position: el.style.getPropertyValue('position') || 'static',
  display: 'block',
  opacity: el.style.getPropertyValue('opacity') || '1',
})

/** 假的 FileReader：readAsDataURL 之后同步回调 onload，用来测自定义壁纸那条路。 */
class FakeFileReader {
  readAsDataURL() {
    this.result = 'data:image/png;base64,AAAA'
    if (typeof this.onload === 'function') this.onload()
  }
}

/**
 * 假的 Image：设 src 之后**同步**触发 onload。
 *
 * ⚠️ 必须同步！原来用真 setTimeout 异步触发，发火时机会在不同 await 点之间乱跳，
 *    挂件尺寸/碰撞结果跟着变，测试就飘了（三次跑出三个不同断言失败，全是这个原因）。
 *    引擎在 spawn 里是先 addEventListener('load') 再 appendChild，所以同步触发来得及。
 */
class FakeImage {
  constructor() { this.naturalWidth = 1919; this.naturalHeight = 1079; this.hidden = false }
  set src(v) {
    this._src = v
    if (typeof this.onload === 'function') this.onload()
  }
  get src() { return this._src }
}

/* -------------------------------------------------------------- localStorage */
const store = new Map()
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

/* ------------------------------------------------------------------ shim */
let rafId = 0
let fakeClock = 1000
const frames = new Map()
const diagPosts = []
const shim = {
  document,
  localStorage,
  console,
  Image: FakeImage,
  FileReader: FakeFileReader,
  getComputedStyle,
  addEventListener: () => {},
  removeEventListener: () => {},
  location: { href: 'file:///preview/index.html', origin: 'file://' },
  navigator: { userAgent: 'smoke-test' },
  innerWidth: 1600,
  innerHeight: 900,
  setInterval: () => 0,
  clearInterval: () => {},
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  // 自己控时的 performance：拖动算速度要用它，别让真实墙钟把速度算飞
  performance: { now: () => fakeClock },
  fetch: async (url, init) => {
    if (String(url).includes('diag.json') && init && init.body) diagPosts.push(JSON.parse(init.body))
    return { json: async () => ({ ok: true, physics: {} }) }
  },
  requestAnimationFrame: (fn) => { frames.set(++rafId, fn); return rafId },
  cancelAnimationFrame: (id) => { frames.delete(id) },
  __DSH_WHALE_WALLPAPER__: {
    enabled: true,
    fit: 'cover',
    veil: 'rgba(4, 18, 38, 0.18)',
    transparentUI: true,
    uiOpacity: 0.94,
    uiSaturate: 1.05,
    pets: true,
    draggable: true,
    wallpaper: '/dsh-whale-wallpaper/wallpaper',
    brightness: 1,
    blur: 0,
    physics: {
      maxPets: 10, seedCount: 2, gravity: 1400, bounce: 0.62, floor: 1.02, ceiling: 0.02,
      splitImpulse: 240, splitCooldown: 2, splitPause: 120,
      eliminateDelay: 10, eliminateInterval: 2,
      idleSpawnInterval: 120, autoGen: true,
    },
    characters: [
      { id: 'bowl', src: '/dsh-whale-wallpaper/whale-dance-1.webp', h: 28, x: 12, y: 20, fill: 100, mirror: false },
      { id: 'lace', src: '/dsh-whale-wallpaper/whale-dance-2.webp', h: 26, x: 84, y: 20, fill: 100, mirror: true },
    ],
  },
}
shim.globalThis = shim
shim.window = shim

const runner = new Function(
  'globalThis', 'window', 'document', 'console', 'Image', 'getComputedStyle',
  'location', 'navigator', 'FileReader', 'MutationObserver',
  'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'performance', 'fetch', 'setTimeout', code,
)
const run = () => runner(
  shim, shim, document, console, shim.Image, shim.getComputedStyle,
  shim.location, shim.navigator, shim.FileReader, undefined,
  shim.setInterval, shim.clearInterval, shim.requestAnimationFrame, shim.cancelAnimationFrame,
  shim.performance, shim.fetch, shim.setTimeout,
)

/** 推进 n 帧物理（走 api.debugStep，确定性，不受 rAF 时序影响）。 */
let apiRef = null
const pump = (n) => { for (let i = 0; i < n; i++) apiRef.debugStep(1 / 60) }
/** 推进 seconds 秒（用来跨过各种冷却）。 */
const pumpSeconds = (seconds) => pump(Math.ceil(seconds * 60))
void frames
void rafId

run()

/* ---------------------------------------------------------------- 断言 */
assert.equal(shim.__dshWhaleWallpaper, true, '应落下幂等哨兵')
// ⚠️ 重挂之后 DOM 节点会换新，所以每次都要按 id 重新取，别缓存节点
const petsNow = () => document.getElementById('dshww-pets')
const barNow = () => document.getElementById('dshww-bar')
const countNow = () => barNow().findByClass('dshww-count')[0].textContent

// ① 两个层 + 壁纸（必须是真 <img>）
const layer = document.getElementById('dshww-layer')
assert.ok(layer, '应挂出 #dshww-layer')
assert.equal(layer.style.zIndex, '-1', '壁纸层要在界面之下')
const canvasStyle = document.getElementById('dsh-whale-wallpaper-canvas')
assert.ok(canvasStyle, '应注入画布层样式')
// 壁纸必须是 <img>，不能是 CSS 背景图：
// 桌面端页面在 dsh-app:// 下，协议处理器会拒掉带 Origin 头的请求，而 CSS 背景图带 Origin、<img> 不带
const wallImg = layer.findByClass('dshww-wallpaper')[0]
assert.ok(wallImg, '壁纸层里应有一个 .dshww-wallpaper 的 <img>')
assert.ok(String(wallImg.src).includes('/dsh-whale-wallpaper/wallpaper'), '壁纸 img 的 src 不对：' + wallImg.src)
assert.ok(canvasStyle.textContent.includes('background-image:none !important'),
  '画布层不该再放 CSS 背景图（会被 dsh-app 协议挡掉）')
assert.ok(canvasStyle.textContent.includes('background-color:transparent !important'), '画布层应把外壳底色清成透明')
assert.ok(canvasStyle.textContent.includes('body{ filter:var(--dshww-canvas-filter) }'), '亮度/模糊应挂在 body 上')
assert.equal(head.style.getPropertyValue('--dshww-canvas-image'), 'none', '画布背景变量应留 none')
assert.equal(head.style.getPropertyValue('--dshww-canvas-size'), 'cover')
const petsLayer = document.getElementById('dshww-pets')
assert.ok(petsLayer, '应挂出 #dshww-pets')
assert.ok(Number(petsLayer.style.zIndex) > 100000, '挂件层 z-index 应拉到最前')
console.log('壁纸 <img>：' + wallImg.src + '  object-fit 变量=' + head.style.getPropertyValue('--dshww-canvas-size')
  + ' | 挂件层 z-index=' + petsLayer.style.zIndex)

// ② 起步数量
let petEls = petsLayer.findByClass('dshww-pet')
assert.equal(petEls.length, 2, '应生成 2 个挂件，实际 ' + petEls.length)
assert.equal(countNow(), '2/10', '计数应显示 2/10')
assert.ok(petEls[0].findByClass('dshww-anim')[0], '每个挂件里应有 .dshww-anim')
assert.ok(petEls[0].findByClass('dshww-hit')[0], '每个挂件里应有 .dshww-hit 判定区')
const anims = petEls.map((el) => el.findByClass('dshww-anim')[0])
assert.ok(anims[0].src !== anims[1].src, '两个挂件应分别用不同的动图')
console.log('计数：', countNow())

// 取引擎 API（挂载时写在 shim 上）
const api = shim.__dshWhaleWallpaperApi
assert.ok(api, '应暴露 __dshWhaleWallpaperApi（调试用）')
assert.ok(typeof api.debugStep === 'function', 'api 应带 debugStep')
apiRef = api

/** readPos 读 transform 的 translate3d —— 那是**左上角**（render 里减了半个高度）。 */
function readPos(el) {
  const m = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(el.style.transform || '')
  return m ? { x: Number(m[1]), y: Number(m[2]) } : { x: 0, y: 0 }
}

// ③ 物理：往下掉 + 停在地面
// ⚠️ 先 debugReset（会换掉整个挂件数组），然后**每次都用 live 接口重新取** —— 别缓存引用，
//    debugPets() 返回的是快照，reset 之后就成孤儿了（这条坑踩过两次）
api.debugReset()
const petsLive = () => api.debugPetsLive()
assert.equal(petsLive().length, 2, '引擎内部列表应有 2 只')
/** 一帧一帧推到条件成立为止（避免"推固定帧数"踩到边界）。 */
const pumpUntil = (cond, maxSeconds = 20) => {
  const limit = Math.ceil(maxSeconds * 60)
  let n = 0
  while (n < limit && !cond()) { pump(1); n++ }
  return n
}
const groundY0 = petsLive()[0].y
pumpUntil(() => petsLive()[0].y > groundY0 + 40, 5)
const groundY1 = petsLive()[0].y
assert.ok(groundY1 > groundY0, `应往下掉：${groundY0.toFixed(0)} -> ${groundY1.toFixed(0)}`)
// 推到贴地为止
pumpUntil(() => petsLive()[0].onGround === true, 20)
const settled = petsLive()[0].y
const elH = petsLive()[0].h
const expectedGround = 1.02 * 900 - elH / 2
assert.ok(Math.abs(settled - expectedGround) < 2,
  `应停在地面：y=${settled.toFixed(0)}，期望 ${expectedGround.toFixed(0)}（h=${elH}）`)
assert.equal(petsLive()[0].onGround, true, '落地后应标记 onGround')
const settledTop = readPos(petsLive()[0].el).y
console.log(`下落 ${groundY0.toFixed(0)} -> ${groundY1.toFixed(0)}，停稳 y=${settled.toFixed(0)}（translateY=${settledTop.toFixed(0)}），onGround=1`)

// ④ 分裂：两只对撞应各裂一份（从确定状态起跑）
api.debugReset()
const inner2 = api.debugPets()
const before = inner2.length
inner2[0].splitCd = 0
inner2[1].splitCd = 0
inner2[0].x = 520; inner2[0].y = 500; inner2[0].vx = 420; inner2[0].vy = 0
inner2[1].x = 760; inner2[1].y = 500; inner2[1].vx = -420; inner2[1].vy = 0
pump(40)
const after = petsNow().findByClass('dshww-pet').length
assert.ok(after > before, '两个挂件相撞应该分裂出新的一份')
assert.ok(after <= shim.__DSH_WHALE_WALLPAPER__.physics.maxPets, '不能超过 maxPets')
console.log(`分裂：碰撞前 ${before} 个 -> 现在 ${after} 个（上限 ${shim.__DSH_WHALE_WALLPAPER__.physics.maxPets}）`)

// 上限：反复让它们对撞，一路裂到上限
const target = shim.__DSH_WHALE_WALLPAPER__.physics.maxPets
for (let round = 0; round < 20 && petsNow().findByClass('dshww-pet').length < target; round++) {
  const list = api.debugPets()
  for (let k = 0; k + 1 < list.length; k += 2) {
    list[k].x = 600 + k * 4; list[k].y = 500; list[k].vx = 400; list[k].vy = 0
    list[k + 1].x = 900 + k * 4; list[k + 1].y = 500; list[k + 1].vx = -400; list[k + 1].vy = 0
  }
  pumpSeconds(2.4)        // 跨过分裂冷却
}
const capped = petsNow().findByClass('dshww-pet').length
// 关键回归：冷却式分裂要能一路裂到上限，不能被「锁死」在 4 个（老 bug）
assert.equal(capped, target, `反复对撞应该一路裂到上限 ${target}，实际 ${capped}`)
assert.equal(countNow(), `${capped}/${target}`, '计数应显示 当前/上限')

// ④a-2 满员后「分裂暂停」：到上限就停 splitPause 秒（默认 120s）
const P0 = api.debugPhysics()
assert.ok(P0.splitPause > 0, '应存在「满员后停分裂」参数')
const maxKeep = P0.maxPets
const slam = () => {
  const list = api.debugPets()
  for (let k = 0; k + 1 < list.length; k += 2) {
    list[k].x = 600 + k * 4; list[k].y = 500; list[k].vx = 400
    list[k + 1].x = 900 + k * 4; list[k + 1].y = 500; list[k + 1].vx = -400
  }
}
/** 把挂件数量砍到 n（多出来的从列表和 DOM 一起摘掉），方便每个用例从干净状态开始。 */
const resetPets = (n) => {
  const list = api.debugPets()
  while (list.length > n) {
    const p = list.pop()
    if (p && p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el)
  }
  return list.length
}
/** 从 n 个重新撞到真满员（先砍到 n，再把上限调回 target，免得被上一步改过）。 */
const slamToCap = (n = 4) => {
  resetPets(n)
  P0.maxPets = target
  for (let round = 0; round < 20 && api.debugPets().length < target; round++) {
    slam()
    pumpSeconds(2.4)
  }
  return api.debugPets().length
}
P0.splitPause = 120
const atCap = slamToCap()
assert.ok(atCap <= target, `数量不该超过上限：${atCap}`)
// 暂停期内猛撞 3 秒（远小于 120s）：不该多出来
slam()
pumpSeconds(3)
assert.equal(api.debugPets().length, atCap,
  `满员后 ${P0.splitPause}s 内不该再裂（猛撞 3 秒还是 ${atCap} 个，实际 ${api.debugPets().length}）`)
console.log(`分裂暂停：满员后猛撞 3s 仍是 ${atCap} 个（暂停 ${P0.splitPause}s）`)
// 暂停解除（截止时刻是武装时算好的，只能显式放行）：剩余时间应该归零
assert.equal(typeof api.debugReleaseSplitPause, 'function', '应有解除分裂暂停的调试接口')
assert.equal(typeof api.debugSplitPauseLeft, 'function', '应有读暂停剩余时间的调试接口')
assert.ok(api.debugSplitPauseLeft() > 0, `暂停期内剩余时间应大于 0，实际 ${api.debugSplitPauseLeft()}`)
api.debugReleaseSplitPause()
assert.equal(api.debugSplitPauseLeft(), 0, '解除后暂停剩余时间应为 0')
// 解除 + 抬高上限腾出名额 → 应该又能裂
P0.maxPets = atCap + 8
slam()
pumpSeconds(2.4)
assert.ok(api.debugPets().length > atCap, `暂停解除且有名额后应该又能裂：${atCap} -> ${api.debugPets().length}`)
console.log(`分裂暂停解除后：${atCap} -> ${api.debugPets().length} 个`)
P0.splitPause = 120
P0.maxPets = maxKeep
P0.splitPause = 120
P0.maxPets = maxKeep

// ④b 同类对消：满员保持 eliminateDelay 后，每 eliminateInterval 消一对同种
const P = api.debugPhysics()
assert.ok(P, '应能拿到引擎在用的物理参数（debugPhysics）')
assert.ok(P.eliminateDelay > 0 && P.eliminateInterval > 0, '对消的两个时间参数应存在')
// 对消要在「真的满员」状态下测，所以重新撞到满员，别用上一步遗留的数量
const capNow = slamToCap()
assert.ok(capNow <= target, `不该超过上限：${capNow}`)
const kindsAtCap = {}
for (const p of api.debugPets()) {
  const k = String(p.spec && p.spec.src)
  kindsAtCap[k] = (kindsAtCap[k] || 0) + 1
}
assert.ok(Object.values(kindsAtCap).some((n) => n >= 2),
  '满员时应该有同种布偶可消，实际情况：' + JSON.stringify(kindsAtCap))
// 还差一点没到 eliminateDelay：不该消
pumpSeconds(P.eliminateDelay * 0.5)
assert.equal(api.debugPets().length, capNow, `满员不到 ${P.eliminateDelay}s 时不该对消`)
// 越过 eliminateDelay：应该一次消掉一对（-2）
// ⚠️ 不能用「绝对时间」推：满员时刻本身就不固定（分裂带随机抖动，可能落在 7s 也可能 17s），
//    对消窗口 = 满员时刻 + eliminateDelay，拿固定秒数去撞必然偶尔差几十毫秒。
//    所以改成**看状态推**：一帧一帧走到只数真的变化为止。
let elimFrames = 0
const elimLimit = Math.ceil((P.eliminateDelay + 3) * 60)
while (api.debugPets().length === capNow && elimFrames < elimLimit) {
  pump(1)
  elimFrames++
}
const afterElim = api.debugPets().length
if (afterElim !== capNow - 2) {
  console.log('⚠️ 对消没按预期发生，引擎日志如下：')
  console.log(`   期望 ${capNow} -> ${capNow - 2}，实际 ${afterElim}（推了 ${elimFrames} 帧）`)
  for (const l of api.debugLog()) console.log('   ', JSON.stringify(l))
}
assert.equal(afterElim, capNow - 2, `满员 ${P.eliminateDelay}s 后应消掉一对同种：${capNow} -> ${afterElim}`)
console.log(`同类对消：满员 ${capNow} 个，${P.eliminateDelay}s 后 -> ${afterElim} 个（一次消一对）`)
// 对消后空出名额，能重新裂回来
pumpSeconds(P.eliminateInterval + 0.5)
const listE = api.debugPets()
for (let k = 0; k + 1 < listE.length; k += 2) {
  listE[k].x = 600 + k * 4; listE[k].y = 500; listE[k].vx = 400
  listE[k + 1].x = 900 + k * 4; listE[k + 1].y = 500; listE[k + 1].vx = -400
}
pumpSeconds(1.5)
assert.ok(api.debugPets().length >= afterElim, '对消空出名额后应该还能再裂')
console.log('对消后名额回收：现在', api.debugPets().length, '个（上限仍是', P.maxPets, '）')

// ④c 挂机奖励：连续一段时间没碰键鼠就落一只新布偶
const idleApi = api.debugIdle()
assert.ok(idleApi && typeof idleApi.step === 'function', '应能拿到挂机状态（debugIdle）')
const savedMax = P.maxPets
P.maxPets = 30                      // 先抬高上限，才看得出「加了一只」
const before4c = api.debugPets().length
const fakeNow = 1000000
idleApi.last = fakeNow
// 还没到时间：不该加
idleApi.step(fakeNow + 60 * 1000)
assert.equal(api.debugPets().length, before4c, '挂机不到设定时间不该加')
// 到点了：加一只
idleApi.step(fakeNow + 121 * 1000)
assert.equal(api.debugPets().length, before4c + 1, '挂机超时应该落一只新布偶')
assert.equal(idleApi.spawns, 1, '挂机计数应该记上')
// 刚加完要重新计时：紧接着再判定不该又加
const atNow = fakeNow + 121 * 1000
idleApi.step(atNow + 1000)
assert.equal(api.debugPets().length, before4c + 1, '加完应重新计时，不能连着加')
// 间隔设 0 = 关掉这个功能
const cfgPhysics = shim.__dshWhaleWallpaperConfig.physics
const keepIdle = cfgPhysics.idleSpawnInterval
cfgPhysics.idleSpawnInterval = 0
idleApi.last = atNow
idleApi.step(atNow + 999 * 1000)
assert.equal(api.debugPets().length, before4c + 1, '挂机间隔设 0 应彻底关闭')
cfgPhysics.idleSpawnInterval = keepIdle
console.log(`挂机奖励：120s 后 +1 只（${before4c} -> ${before4c + 1}），加完重新计时，设 0 可关闭`)
P.maxPets = savedMax
// 挂机那条用例往顶上落了一只，会把拖动/面板两组断言带偏：重播一次，从确定状态继续
api.debugReset()

// 自检回传：挂载后应立刻回传，且采样不能抛
assert.ok(diagPosts.length >= 1, '挂载后应回传一条页面自检')
const firstDiag = diagPosts.find((d) => d.tag === 'client-mounted') || diagPosts[0]
assert.ok(!firstDiag.diagError, '自检采样不该抛异常：' + firstDiag.diagError)
assert.ok(firstDiag.computed && firstDiag.computed.bodyBg !== undefined, '自检里应带上 body 的算出来的样式')
assert.ok(Array.isArray(firstDiag.probes) && firstDiag.probes.length >= 2, '自检里应带上各层几何')
assert.ok(firstDiag.wallpaper && String(firstDiag.wallpaper.src).includes('wallpaper'), '自检里应带上壁纸 <img> 的状态')
console.log('页面自检：已回传', diagPosts.length, '条，tag =', diagPosts.map((d) => d.tag).join(', '))

// ⑤ 拖动：按住判定区拖走，松手把速度交给物理
petsNow()                                   // 重新取一次，别用旧引用
const dragTarget = petsNow().findByClass('dshww-pet')[0]
const hit = dragTarget.findByClass('dshww-hit')[0]
assert.ok(hit, '每个挂件应有判定区 .dshww-hit')
const dragBefore = readPos(dragTarget)
hit.fire('pointerdown', { clientX: 300, clientY: 300 })
fakeClock += 16
hit.fire('pointermove', { clientX: 380, clientY: 220 })
fakeClock += 16
// 不再 pump：拖动位置是 pointermove 同步写好的，多推一帧重力会加进来，断言会飘
const dragDuring = readPos(dragTarget)
assert.ok(Math.abs((dragDuring.x - dragBefore.x) - 80) < 1,
  `拖动时应跟手移动 80px：${dragBefore.x} -> ${dragDuring.x}`)
// 纵向容差放宽：物理的地面钳制会把界内的少量位移抹掉
assert.ok((dragBefore.y - dragDuring.y) > 70 && (dragBefore.y - dragDuring.y) < 90,
  `拖动时应向上跟手约 80px：${dragBefore.y} -> ${dragDuring.y}`)
// 拖动期间整页禁选（不许唤起框选/蓝高亮）
assert.equal(document.body.getAttribute('data-dshww-dragging'), '1', '拖动时应给 body 打上禁选标记')
hit.fire('pointerup', { clientX: 380, clientY: 220 })
assert.equal(dragTarget.getAttribute('data-dragging'), null, '松手后应清掉 dragging 标记')
assert.equal(document.body.getAttribute('data-dshww-dragging'), null, '松手后应收回禁选标记')
const draggedPet = api.debugPets().find((p) => p.el === dragTarget)
assert.ok(draggedPet, '应该能在内部列表里找到被拖的那个')
assert.ok(Number.isFinite(draggedPet.vx) && Number.isFinite(draggedPet.vy), '速度必须是有限数')
assert.ok(Math.abs(draggedPet.vx) <= 2400.001 && Math.abs(draggedPet.vy) <= 2400.001,
  `松手速度应被限制在 ±2400：vx=${draggedPet.vx} vy=${draggedPet.vy}`)
console.log(`拖动：(${dragBefore.x.toFixed(0)},${dragBefore.y.toFixed(0)}) -> 拖动中 (${dragDuring.x.toFixed(0)},${dragDuring.y.toFixed(0)})，松手速度 vx=${draggedPet.vx.toFixed(0)} vy=${draggedPet.vy.toFixed(0)}`)

// 地面边界：往下拖不该穿出屏幕
hit.fire('pointerdown', { clientX: 300, clientY: 300 })
hit.fire('pointermove', { clientX: 300, clientY: 5000 })
hit.fire('pointerup', { clientX: 300, clientY: 5000 })
const bottom = readPos(dragTarget)
const halfH = Number(dragTarget.style.height.replace('px', '')) / 2
assert.ok(bottom.y + halfH <= 900 + 1, `往下拖不应穿出屏底：底边 ${(bottom.y + halfH).toFixed(0)}`)
console.log('地面钳制：底边', (bottom.y + halfH).toFixed(0), '<= 900')

// ⑥ 设置面板：清零在最上面、竖排；带壁纸开关和界面通透档位
const barButtons = barNow().findByClass('dshww-btn')
const settingsBtn = barButtons.find((b) => b.textContent === '设置')
assert.ok(settingsBtn, '操作条上应有设置按钮')
assert.ok(!barButtons.some((b) => b.textContent === '清零'), '清零不该再挂在右下角操作条上')
settingsBtn.fire('click')
let panel = document.getElementById('dshww-panel')
assert.ok(panel, '点设置应弹出面板')

const topActions = panel.findByClass('dshww-actions-vertical')[0]
assert.ok(topActions, '面板顶部应有竖排按钮组')
const panelClear = topActions.findByClass('dshww-btn')[0]
assert.equal(panelClear.textContent, '清零', '竖排按钮组里应是清零')

const fieldLabels = panel.findByClass('dshww-field').map((r) => r.children[0].textContent)
for (const want of ['显示壁纸', '界面通透', '数量上限', '重力', '落地反弹', '上边界', '下边界',
  '碰撞冷却', '满员多久后对消', '对消间隔', '挂机多久加一只']) {
  assert.ok(fieldLabels.includes(want), '设置面板缺少字段：' + want)
}
console.log('设置面板字段：', fieldLabels.join(' / '))

// 壁纸开关：去勾立刻把壁纸层藏起来
// ⚠️ 每次都要按 id 重新取节点：重挂之后缓存的引用是旧树上的孤儿
const wallField = panel.findByClass('dshww-field').find((r) => r.children[0].textContent === '显示壁纸')
const wallpaperBox = wallField.children[1]
assert.equal(wallpaperBox.type, 'checkbox', '壁纸开关应是勾选框')
assert.equal(wallpaperBox.checked, true, '默认应勾上')
wallpaperBox.checked = false
wallpaperBox.fire('change')
assert.equal(document.getElementById('dshww-layer').getAttribute('hidden'), '', '去勾后壁纸层应隐藏')
wallpaperBox.checked = true
wallpaperBox.fire('change')
assert.equal(document.getElementById('dshww-layer').getAttribute('hidden'), null, '重新勾上应恢复')
console.log('壁纸开关：去勾 -> 隐藏，勾回 -> 显示')

// 面板里的清零
panelClear.fire('click')
const afterClear = petsNow().findByClass('dshww-pet').length
assert.equal(afterClear, shim.__DSH_WHALE_WALLPAPER__.physics.seedCount, '清零后应回到 seedCount 个')
console.log('清零（面板里）：', afterClear, '个')

// ⑥c 自定义壁纸 + 关闭自动生成
{
  // 自定义壁纸：选一张图 -> img.src 换成 data URL
  const files = panel.findByClass('dshww-btn')
  const pick = files.find((b) => b.textContent === '选择图片')
  const clearW = files.find((b) => b.textContent === '清除')
  assert.ok(pick, '壁纸区应有「选择图片」按钮')
  assert.ok(clearW, '壁纸区应有「清除」按钮')
  const fileInput = panel.descendants.find((n) => n.type === 'file')
  assert.ok(fileInput, '应有隐藏的 file input')
  const layerNow = () => document.getElementById('dshww-layer')
  fileInput.files = [{ type: 'image/png', size: 1024, name: 'a.png' }]
  fileInput.fire('change')
  const imgAfter = layerNow().findByClass('dshww-wallpaper')[0]
  assert.ok(String(imgAfter.src).startsWith('data:image/'), '应用后壁纸 src 应变成 data URL：' + imgAfter.src)
  assert.ok(String(localStorage.getItem('dshww-custom-wallpaper')).startsWith('data:image/'), '自定义壁纸应存进 localStorage')
  // 清除：回到默认那张
  clearW.fire('click')
  const imgBack = layerNow().findByClass('dshww-wallpaper')[0]
  assert.equal(imgBack.src, '/dsh-whale-wallpaper/wallpaper', '清除后应回到默认壁纸')
  assert.equal(localStorage.getItem('dshww-custom-wallpaper'), null, '清除后 localStorage 里不该还留着')
  console.log('自定义壁纸：选图 -> data URL 生效，清除 -> 回默认')

  // 关闭自动生成：自带那张默认壁纸不显示
  const autoBox = panel.findByClass('dshww-field')
    .find((r) => r.children[0].textContent === '自动生成壁纸').children[1]
  assert.equal(autoBox.type, 'checkbox', '「自动生成壁纸」应是勾选框')
  assert.equal(autoBox.checked, true, '默认应勾上')
  autoBox.checked = false
  autoBox.fire('change')
  assert.equal(document.getElementById('dshww-layer'), null, '关闭自动生成后不该再显示自带壁纸')
  autoBox.checked = true
  autoBox.fire('change')
  assert.ok(document.getElementById('dshww-layer'), '重新勾上后壁纸层应回来')
  console.log('关闭自动生成：去勾 -> 自带壁纸撤掉，勾回 -> 恢复')

  // 小鲸鱼余额气泡档位：默认半透明底（不能全透，否则余额数字看不见）
  const bubbleSel = panel.findByClass('dshww-field')
    .find((r) => r.children[0].textContent === '小鲸鱼余额气泡').children[1]
  assert.equal(bubbleSel.tagName, 'SELECT', '小鲸鱼气泡应是下拉框')
  assert.equal(bubbleSel.value, 'translucent', '默认应是「半透明底」')
  const whaleStyle = () => document.getElementById('dsh-whale-wallpaper-ui-whale')
  assert.ok(whaleStyle(), '应注入小鲸鱼气泡的样式')
  assert.ok(whaleStyle().textContent.includes('dshwv-bshape'), '样式应作用在气泡 SVG 上')
  assert.ok(/rgba\(255, 255, 255, \.78\)/.test(whaleStyle().textContent),
    '半透明档应该是半透明白底：' + whaleStyle().textContent.slice(0, 120))
  // 切到「全透」：fill 变 transparent，并且给文字补白描边
  bubbleSel.value = 'clear'
  bubbleSel.fire('change')
  assert.ok(whaleStyle().textContent.includes('fill: transparent'), '全透档 fill 应为 transparent')
  assert.ok(whaleStyle().textContent.includes('text-stroke'), '全透档应给文字补白描边（否则看不见余额）')
  // 切到「原样」：样式整个撤掉
  bubbleSel.value = 'opaque'
  bubbleSel.fire('change')
  assert.equal(whaleStyle(), null, '原样档应把小鲸鱼样式撤掉')
  bubbleSel.value = 'translucent'
  bubbleSel.fire('change')
  console.log('小鲸鱼气泡：半透明底 / 全透+白描边 / 原样 三档都生效')
}

settingsBtn.fire('click')
assert.equal(document.getElementById('dshww-panel'), null, '再点设置应关闭面板')

// ⑥b DSH 自己的弹窗/设置面板要保持不透明（不能连它一起清，不然插件列表糊在壁纸上看不见）
{
  const modal = new El('div')
  modal.setAttribute('role', 'dialog')
  modal.setAttribute('aria-label', '插件管理')
  modal.style.width = '1600px'
  modal.style.height = '900px'
  modal.style.setProperty('backgroundColor', 'rgb(255, 255, 255)')
  const inner = new El('div')
  inner.style.width = '800px'
  inner.style.height = '600px'
  inner.style.setProperty('backgroundColor', 'rgb(250, 250, 250)')
  modal.appendChild(inner)
  const plain = new El('div')
  plain.style.width = '1600px'
  plain.style.height = '900px'
  plain.style.setProperty('backgroundColor', 'rgb(255, 255, 255)')
  document.body.appendChild(modal)
  document.body.appendChild(plain)
  api.refreshTransparency()
  assert.equal(modal.getAttribute('data-dshww-clear-bg'), null, 'DSH 弹窗自己不该被清成透明')
  assert.equal(inner.getAttribute('data-dshww-clear-bg'), null, 'DSH 弹窗内部也不该被清')
  assert.equal(modal.getAttribute('data-dshww-keep-opaque'), '1', '弹窗应被标记为「保持不透明」')
  assert.equal(plain.getAttribute('data-dshww-clear-bg'), '1', '普通大白底仍然该被清（对照）')
  console.log('弹窗保护：role=dialog 的面板保持不透明，普通大白底照清')
  document.body.removeChild(modal)
  document.body.removeChild(plain)
}

// ⑦ 幂等 / enabled=false
run()
assert.equal(body.findByClass('dshww-layer').length, 1, '不能堆叠出第二层壁纸层')
assert.equal(body.findByClass('dshww-pets').length, 1, '不能堆叠出第二层挂件层')
console.log('幂等：重跑一次各 1 层')

shim.__DSH_WHALE_WALLPAPER__.enabled = false
run()
assert.equal(document.getElementById('dshww-layer'), null, 'enabled=false 应清掉壁纸层')
assert.equal(document.getElementById('dshww-pets'), null, 'enabled=false 应清掉挂件层')
assert.equal(document.getElementById('dsh-whale-wallpaper-ui'), null, 'enabled=false 应清掉透明化样式')
console.log('enabled=false：壁纸层、挂件层、透明化样式都已清掉')

console.log('\n页面半侧冒烟测试全部通过 ✓')

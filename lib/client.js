(() => {
  // fufu-jump-DSH/src/styles.js
  var STYLE_ID = "dsh-whale-wallpaper-style";
  var PETS_Z = 2147482e3;
  var CANVAS_SIZE_VAR = "--dshww-canvas-size";
  var CANVAS_FILTER_VAR = "--dshww-canvas-filter";
  function canvasCss() {
    return `
:root{ ${CANVAS_SIZE_VAR}:cover; ${CANVAS_FILTER_VAR}:none }
html, body{
  background-color:transparent !important;
  background-image:none !important;
  background-attachment:scroll !important;
}
/* \u58C1\u7EB8\u662F <img>\uFF08\u89C1 .dshww-wallpaper\uFF09\uFF1B\u753B\u5E03\u5C42\u53EA\u8D1F\u8D23\u900F\u660E\uFF0C\u4E0D\u518D\u653E\u80CC\u666F\u56FE */
body{ filter:var(${CANVAS_FILTER_VAR}) }
`.trim();
  }
  function stylesheet() {
    return `
.dshww-layer{
  position:fixed; inset:0; z-index:-1; overflow:hidden;
  pointer-events:none; user-select:none;
  background:none;
}
.dshww-layer[hidden]{ display:none !important }

/* \u58C1\u7EB8\u672C\u4F53\uFF1A\u771F <img>\uFF08\u4E0D\u80FD\u7528 CSS \u80CC\u666F\u56FE\uFF0C\u539F\u56E0\u89C1 wallpaper.js \u91CC\u90A3\u6BB5\u6CE8\u91CA\uFF09 */
.dshww-wallpaper{
  position:absolute; inset:0;
  width:100%; height:100%;
  object-fit:var(--dshww-canvas-size, cover);
  object-position:center bottom;
  filter:var(--dshww-canvas-filter, none);
  pointer-events:none; user-select:none;
  -webkit-user-drag:none;
}
.dshww-wallpaper[hidden]{ display:none !important }

/* \u538B\u6697\u5C42\uFF1A\u94FA\u5728\u58C1\u7EB8\u4E0A\u3001\u754C\u9762\u4E4B\u4E0B */
.dshww-veil{ position:absolute; inset:0 }

.dshww-pets{
  position:fixed; inset:0; z-index:${PETS_Z};
  pointer-events:none; overflow:hidden;
  /* \u6302\u4EF6\u5C42\u91CC\u7EDD\u5BF9\u4E0D\u8981\u6709\u6587\u5B57\u9009\u62E9\uFF1A\u62D6\u73A9\u5076\u65F6\u4E0D\u8BE5\u62C9\u8D77\u6846\u9009 / \u84DD\u8272\u9AD8\u4EAE */
  user-select:none !important; -webkit-user-select:none !important;
}
.dshww-pets[hidden]{ display:none !important }

.dshww-pet{
  position:absolute; left:0; top:0;
  transform:translate3d(0,0,0);
  will-change:transform;
  filter:drop-shadow(0 10px 16px rgba(6,20,40,.30));
  user-select:none !important; -webkit-user-select:none !important;
  -webkit-user-drag:none; -webkit-touch-callout:none;
}
.dshww-pet[hidden]{ display:none !important }
.dshww-pet[data-dragging="1"]{ filter:drop-shadow(0 14px 22px rgba(6,20,40,.45)) brightness(1.05) }

.dshww-anim{
  display:block; width:100%; height:100%;
  object-fit:contain; object-position:50% 50%;
  transform:scaleX(var(--dshww-flip, 1));
  pointer-events:none; -webkit-user-drag:none;
  user-select:none !important; -webkit-user-select:none !important;
}
.dshww-pet[data-spawn="1"] .dshww-anim{ animation:dshww-pop .22s ease-out }
@keyframes dshww-pop{
  0%   { transform:scaleX(var(--dshww-flip, 1)) scale(.82) }
  70%  { transform:scaleX(var(--dshww-flip, 1)) scale(1.06) }
  100% { transform:scaleX(var(--dshww-flip, 1)) scale(1) }
}

/* \u540C\u7C7B\u5BF9\u6D88\uFF1A\u7559\u4E00\u4E2A"\u5657"\u7684\u6E10\u9690\u514B\u9686\uFF0C\u7136\u540E\u6458\u6389 */
.dshww-pet[data-dshww-pop="1"]{
  pointer-events:none !important;
  animation:dshww-vanish .32s ease-out forwards;
}
@keyframes dshww-vanish{
  0%   { opacity:1; filter:brightness(1.6) drop-shadow(0 0 12px rgba(255,255,255,.9)) }
  100% { opacity:0; filter:brightness(2.2) drop-shadow(0 0 26px rgba(255,255,255,0)); scale:1.35 }
}

/* \u53EA\u6709\u8FD9\u4E00\u5C0F\u5757\u63A5\u6536\u6307\u9488\uFF1A\u6BD4\u89D2\u8272\u7565\u5C0F\uFF0C\u5C3D\u91CF\u5C11\u6321\u754C\u9762 */
.dshww-hit{
  position:absolute; left:50%; top:50%;
  transform:translate(-50%,-50%);
  width:62%; height:78%;
  pointer-events:auto; cursor:grab; touch-action:none;
  user-select:none !important; -webkit-user-select:none !important;
  -webkit-user-drag:none; -webkit-touch-callout:none;
}
.dshww-pet[data-dragging="1"] .dshww-hit{ cursor:grabbing }

/* \u62D6\u52A8\u671F\u95F4\u6574\u9875\u7981\u9009\uFF0C\u907F\u514D"\u6846\u9009"\u628A\u754C\u9762\u6587\u5B57\u4E5F\u62C9\u6210\u84DD\u5E95 */
body[data-dshww-dragging="1"], body[data-dshww-dragging="1"] *{
  user-select:none !important; -webkit-user-select:none !important;
  cursor:grabbing !important;
}
body[data-dshww-dragging="1"] ::selection{ background:transparent }

/* \u53F3\u4E0B\u89D2\u64CD\u4F5C\u6761 */
.dshww-bar{
  position:fixed; right:14px; bottom:14px; z-index:${PETS_Z};
  display:flex; gap:8px; align-items:center;
  pointer-events:auto;
  font:12px/1.7 var(--dsw-font-family, system-ui, sans-serif);
}
.dshww-btn{
  padding:4px 12px; border-radius:999px; cursor:pointer;
  color:#fff; background:rgba(12,26,46,.62); border:1px solid rgba(255,255,255,.22);
  opacity:.62; font:inherit;
}
.dshww-btn:hover{ opacity:1 }
.dshww-count{ color:#fff; opacity:.6; text-shadow:0 1px 3px rgba(0,0,0,.6) }

/* \u8BBE\u7F6E\u9762\u677F */
.dshww-panel{
  position:fixed; right:14px; bottom:52px; z-index:${PETS_Z};
  width:292px; max-height:74vh; overflow:auto;
  padding:14px 16px 12px; border-radius:14px;
  color:#eaf2ff; background:rgba(10,20,34,.92);
  border:1px solid rgba(255,255,255,.16);
  box-shadow:0 18px 48px rgba(0,0,0,.45);
  font:13px/1.6 var(--dsw-font-family, system-ui, sans-serif);
  backdrop-filter:blur(10px); pointer-events:auto;
}
.dshww-panel h4{ margin:0 0 4px; font-size:14px; font-weight:600 }
.dshww-panel .dshww-note{ margin:0 0 8px; font-size:11px; opacity:.62 }
.dshww-field{ display:flex; align-items:center; gap:8px; margin:6px 0 }
.dshww-field label{ flex:1; font-size:12px; opacity:.88 }
.dshww-field input[type=range]{ width:104px }
.dshww-field input[type=number]{
  width:68px; padding:2px 6px; border-radius:6px; font:inherit;
  color:#eaf2ff; background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.18);
}
.dshww-field .dshww-unit{ width:26px; font-size:11px; opacity:.6 }
.dshww-actions{ display:flex; gap:8px; margin-top:12px }
.dshww-actions .dshww-btn{ flex:1; text-align:center; opacity:.9 }
.dshww-actions .dshww-btn[data-primary="1"]{ background:rgba(77,107,254,.85); border-color:rgba(160,190,255,.5) }
/* \u7AD6\u6392\u6309\u94AE\u7EC4\uFF08\u6E05\u96F6\u90A3\u4E00\u4E2A\u5C31\u662F\u7AD6\u7740\u653E\u7684\uFF09 */
.dshww-actions-vertical{ flex-direction:column; margin:4px 0 10px }
.dshww-actions-vertical .dshww-btn{ width:100%; padding:7px 12px; font-size:13px; opacity:.95 }
.dshww-field input[type=checkbox]{ width:16px; height:16px; accent-color:#4d6bfe; cursor:pointer }
.dshww-group{ margin:12px 0 2px; font-size:11px; letter-spacing:.06em; opacity:.55 }

@media (prefers-reduced-motion: reduce){
  .dshww-pet[data-spawn="1"] .dshww-anim{ animation:none }
}
`.trim();
  }

  // fufu-jump-DSH/src/wallpaper.js
  var LAYER_ID = "dshww-layer";
  var PETS_ID = "dshww-pets";
  var BAR_ID = "dshww-bar";
  var PANEL_ID = "dshww-panel";
  var CANVAS_STYLE_ID = "dsh-whale-wallpaper-canvas";
  var UI_TRANSPARENT_STYLE_ID = "dsh-whale-wallpaper-ui";
  var POS_KEY = "dshww-pos";
  var dragActive = 0;
  function beginDragMarker() {
    dragActive += 1;
    try {
      if (document.body) document.body.setAttribute("data-dshww-dragging", "1");
    } catch (err) {
    }
  }
  function endDragMarker() {
    dragActive = Math.max(0, dragActive - 1);
    if (dragActive === 0) {
      try {
        if (document.body) document.body.removeAttribute("data-dshww-dragging");
      } catch (err) {
      }
    }
  }
  function clearTextSelection() {
    try {
      const win = globalThis;
      if (typeof win.getSelection === "function") {
        const sel = win.getSelection();
        if (sel && typeof sel.removeAllRanges === "function" && sel.rangeCount) sel.removeAllRanges();
      }
    } catch (err) {
    }
    try {
      const doc2 = document;
      if (typeof doc2.getSelection === "function") {
        const sel = doc2.getSelection();
        if (sel && typeof sel.removeAllRanges === "function" && sel.rangeCount) sel.removeAllRanges();
      }
    } catch (err) {
    }
  }
  var PHYSICS_FALLBACK = {
    wallpaper: true,
    // 壁纸开关（在设置面板里切）
    autoGen: true,
    // false = 不显示自带那张默认壁纸（自定义壁纸/配置指定的照常显示）
    uiClearLevel: 3,
    // 界面通透档位：0 不动 / 1 只透大面板 / 2 连小块 / 3 全透
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
    floor: 1.02
  };
  var DEFAULT_CONFIG = {
    enabled: true,
    fit: "cover",
    veil: "rgba(4, 18, 38, 0.18)",
    transparentUI: true,
    /** 界面通透程度：0 = 一个底色都不动；1 = 只清铺满视野的大面板；2 = 连小块一起清；3 = 凡是能画出白底的都清。 */
    uiClearLevel: 3,
    uiOpacity: 0.94,
    uiSaturate: 1.05,
    pets: true,
    draggable: true,
    physics: null,
    wallpaper: "/dsh-whale-wallpaper/wallpaper",
    characters: []
  };
  var CLEAR_TIERS = {
    0: null,
    1: { area: 0.25, alpha: 0.5 },
    2: { area: 0.02, alpha: 0.15 },
    3: { area: 5e-4, alpha: 0.02 }
  };
  function clearTier(level) {
    const n = Math.round(Number(level));
    if (!Number.isFinite(n) || n <= 0) return null;
    return CLEAR_TIERS[Math.min(3, Math.max(1, n))];
  }
  var UI_TRANSPARENT_CSS = `
html, body { background-color: transparent !important; }
#root { background-color: transparent !important; }
/* \u26A0\uFE0F \u6700\u540E\u4E00\u9053\u4FDD\u9669\uFF1A\u51E1\u662F**\u81EA\u5DF1\u5E26\u5E95\u8272\u3001\u800C\u4E14\u94FA\u6EE1\u89C6\u91CE**\u7684\u754C\u9762\u5BB9\u5668\uFF0C\u4E00\u5F8B\u6E05\u6210\u900F\u660E\u3002
   \u4E3A\u4EC0\u4E48\u9700\u8981\u5B83\uFF1ADSH \u7684\u5E94\u7528\u5916\u58F3\uFF08AppFrame\uFF09\u81EA\u5DF1\u5E26 background: var(--dsw-alias-bg-base)\uFF0C
   \u53EA\u6E05 #root \u76D6\u4E0D\u4F4F \u2014\u2014 \u75C7\u72B6\u5C31\u662F\u300C\u58C1\u7EB8\u660E\u660E\u52A0\u8F7D\u6210\u529F\uFF08\u81EA\u68C0\u91CC complete:true\uFF09\u4F46\u5C4F\u5E55\u4E0A\u4E00\u70B9\u90FD\u770B\u4E0D\u89C1\u300D\u3002
   \u8FD9\u4E2A\u89C4\u5219\u7531 fixOpaqueAppLayers() \u6253\u6807\u8BB0\uFF1BDSH \u81EA\u5DF1\u7684\u5F39\u7A97/\u8BBE\u7F6E\u9762\u677F\u4F1A\u88AB\u6392\u9664\u5728\u5916\uFF08\u89C1 markOverlaysKeepOpaque\uFF09\u3002 */
[data-dshww-clear-bg="1"] { background-color: transparent !important; }
/* \u6709\u4E9B\u5BB9\u5668\u662F\u300C\u5E95\u8272 + \u4E00\u5C42\u6E10\u53D8/\u56FE\u300D\u53E0\u51FA\u6765\u7684\uFF0C\u53EA\u6E05\u5E95\u8272\u8FD8\u4F1A\u5269\u4E00\u5C42\u767D */
[data-dshww-clear-bgi="1"] { background-image: none !important; }

/* ---------------------------------------------------------------------------
 * \u987A\u624B\u628A\u300C\u5C0F\u9CB8\u9C7C\u6302\u4EF6\u300D\uFF08\u53E6\u4E00\u4E2A\u63D2\u4EF6 dsh-whale-widget\uFF09\u7684\u4F59\u989D\u6C14\u6CE1\u4E5F\u901A\u900F\u6389\u3002
 *
 * \u5B83\u7684\u767D\u5E95**\u4E0D\u5728 CSS \u91CC** \u2014\u2014 \u6C14\u6CE1\u662F SVG \u753B\u7684\uFF0C\u6807\u8BB0\u5199\u6B7B\u4E86\uFF1A
 *   <path class="dshwv-bshape" fill="#FFFFFF" stroke="#203170" .../>
 *   <ellipse class="dshwv-b1" ... fill="#FFFFFF" .../>
 *   <ellipse class="dshwv-b2" ... fill="#FFFFFF" .../>
 * SVG \u7684 fill \u662F**\u8868\u73B0\u5C5E\u6027**\uFF0C\u4F18\u5148\u7EA7\u6700\u4F4E\uFF0C\u6240\u4EE5 CSS \u80FD\u538B\u8FC7\u5B83\uFF08\u5FC5\u987B\u5E26 !important\uFF09\u3002
 * \u63CF\u8FB9\u7559\u7740\uFF1A\u4E0D\u7136\u534A\u900F\u660E\u5E95\u4E0A\u90A3\u884C\u6DF1\u8272\u4F59\u989D\u6570\u5B57\u6CA1\u6709\u8FB9\u754C\uFF0C\u770B\u7740\u53D1\u98D8\u3002
 * --------------------------------------------------------------------------- */
#dsh-whale-widget .dshwv-bshape,
#dsh-whale-widget .dshwv-b1,
#dsh-whale-widget .dshwv-b2 {
  fill: transparent !important;
  fill-opacity: 0 !important;
}
`;
  function watchOpaqueLayers() {
    try {
      if (globalThis.__dshWhaleWallpaperObserver) return;
      const doc2 = document;
      const target = doc2.body || doc2.documentElement;
      if (!target || typeof MutationObserver !== "function") return;
      let timer = 0;
      const schedule = () => {
        if (timer) return;
        timer = setTimeout(() => {
          timer = 0;
          scanAndClear();
        }, 100);
      };
      const observer = new MutationObserver(schedule);
      observer.observe(target, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style"]
      });
      globalThis.__dshWhaleWallpaperObserver = observer;
      globalThis.__dshWhaleWallpaperScan = scanAndClear;
    } catch (err) {
    }
  }
  function scanAndClear() {
    try {
      const api = globalThis.__dshWhaleWallpaperApi;
      if (api && typeof api.refreshTransparency === "function") {
        api.refreshTransparency();
        return;
      }
    } catch (err) {
    }
    try {
      fixOpaqueAppLayers();
    } catch (err) {
    }
  }
  function stepIdle(st, seconds, spawnIdle, now) {
    if (!st) return false;
    const secs = Number(seconds);
    if (!Number.isFinite(secs) || secs <= 0) return false;
    if (now - st.last < secs * 1e3) return false;
    if (spawnIdle()) {
      st.spawns += 1;
      st.lastSpawnAt = now;
      st.last = now;
      return true;
    }
    st.last = now - secs * 1e3 + 5e3;
    return false;
  }
  function watchIdle(engine) {
    if (globalThis.__dshWhaleWallpaperIdle) return;
    const win = globalThis;
    const doc2 = document;
    globalThis.__dshWhaleWallpaperIdle = {
      last: Date.now(),
      spawns: 0,
      lastSpawnAt: 0,
      step: (now) => {
        const cfg = globalThis.__dshWhaleWallpaperConfig;
        if (!cfg || cfg.pets === false) return false;
        const st = globalThis.__dshWhaleWallpaperIdle;
        return stepIdle(st, cfg.physics && cfg.physics.idleSpawnInterval, () => engine.spawnIdle(), now);
      }
    };
    const bump = () => {
      globalThis.__dshWhaleWallpaperIdle.last = Date.now();
    };
    for (const ev of ["pointerdown", "pointermove", "pointerup", "wheel", "keydown", "keyup"]) {
      try {
        win.addEventListener(ev, bump, { passive: true, capture: true });
      } catch (err) {
        try {
          win.addEventListener(ev, bump, true);
        } catch (err2) {
        }
      }
    }
    try {
      doc2.addEventListener("visibilitychange", bump);
    } catch (err) {
    }
    setInterval(() => {
      try {
        const st = globalThis.__dshWhaleWallpaperIdle;
        if (st && typeof st.step === "function") st.step(Date.now());
      } catch (err) {
      }
    }, 1e3);
  }
  var KEEP_OPAQUE_ATTR = "data-dshww-keep-opaque";
  function markOverlaysKeepOpaque() {
    const marked = [];
    try {
      const doc2 = document;
      const css = globalThis.getComputedStyle;
      if (typeof css !== "function") return marked;
      const vw = globalThis.innerWidth || doc2.documentElement.clientWidth || 1;
      const vh = globalThis.innerHeight || doc2.documentElement.clientHeight || 1;
      const nodes = [];
      const collect = (node) => {
        if (!node) return;
        nodes.push(node);
        if (typeof node.querySelectorAll === "function") {
          for (const n of node.querySelectorAll("*")) nodes.push(n);
        } else {
          for (const c of node.children || []) collect(c);
        }
      };
      collect(doc2.body || doc2.documentElement);
      for (const node of nodes) {
        if (!node || typeof node.getAttribute !== "function") continue;
        if (node.getAttribute(KEEP_OPAQUE_ATTR) === "1") continue;
        let keep = false;
        try {
          if (node.getAttribute("role") === "dialog") keep = true;
          if (node.getAttribute("aria-modal") === "true") keep = true;
        } catch (err) {
        }
        if (!keep) {
          try {
            const cs = css(node);
            const bf = String(cs && (cs.backdropFilter || cs.webkitBackdropFilter) || "none");
            if (bf && bf !== "none") {
              const r = node.getBoundingClientRect();
              if (r.width * r.height >= vw * vh * 0.9) keep = true;
            }
          } catch (err) {
          }
        }
        if (!keep) continue;
        node.setAttribute(KEEP_OPAQUE_ATTR, "1");
        marked.push((node.id ? "#" + node.id : String(node.tagName || "?").toLowerCase()) + (node.className ? "." + String(node.className).split(/\s+/).slice(0, 2).join(".") : ""));
      }
    } catch (err) {
    }
    return marked;
  }
  function insideKeptOverlay(node) {
    try {
      let n = node;
      let depth = 0;
      while (n && depth < 20) {
        if (typeof n.getAttribute === "function" && n.getAttribute(KEEP_OPAQUE_ATTR) === "1") return true;
        n = n.parentNode;
        depth += 1;
      }
    } catch (err) {
    }
    return false;
  }
  function fixOpaqueAppLayers() {
    const fixed = [];
    try {
      const doc2 = document;
      const rootEl = doc2.getElementById("root");
      if (!rootEl) return fixed;
      const tier = clearTier(globalThis.__dshWhaleWallpaperClearLevel || 3);
      if (!tier) return fixed;
      const css = globalThis.getComputedStyle;
      if (typeof css !== "function") return fixed;
      const vw = globalThis.innerWidth || doc2.documentElement.clientWidth || 1;
      const vh = globalThis.innerHeight || doc2.documentElement.clientHeight || 1;
      const nodes = [];
      const collect = (node) => {
        if (!node) return;
        nodes.push(node);
        if (typeof node.querySelectorAll === "function") {
          for (const n of node.querySelectorAll("*")) nodes.push(n);
        } else {
          for (const c of node.children || []) collect(c);
        }
      };
      collect(doc2.body || doc2.documentElement);
      markOverlaysKeepOpaque();
      const alphaOf = (bg) => {
        const s = String(bg || "");
        if (!s || s === "transparent") return 0;
        const m = /rgba?\(([^)]+)\)/.exec(s);
        if (!m) return 1;
        const parts = m[1].split(",").map((v) => v.trim());
        if (parts.length < 4) return 1;
        const a = Number(parts[3]);
        return Number.isFinite(a) ? a : 1;
      };
      const gradientHasColor = (bi) => {
        const s = String(bi || "");
        if (!s || s === "none") return false;
        if (!/gradient\(/i.test(s)) return false;
        const withoutClear = s.replace(/color\([^)]*\/\s*0(?:\.0+)?\s*\)/gi, "").replace(/rgba\([^)]*,\s*0(?:\.0+)?\s*\)/gi, "").replace(/transparent/gi, "");
        return /rgb|#[0-9a-f]{3}/i.test(withoutClear);
      };
      for (const node of nodes) {
        if (!node || node.id === LAYER_ID || node.id === PETS_ID) continue;
        if (typeof node.closest === "function" && (node.closest("#" + LAYER_ID) || node.closest("#" + PETS_ID))) continue;
        if (insideKeptOverlay(node)) continue;
        let cs = null;
        try {
          cs = css(node);
        } catch (err) {
          continue;
        }
        if (!cs) continue;
        const bg = String(cs.backgroundColor || "");
        const bi = String(cs.backgroundImage || "none");
        const solidBg = alphaOf(bg) > tier.alpha;
        const solidGradient = gradientHasColor(bi);
        if (!solidBg && !solidGradient) continue;
        let r = null;
        try {
          r = node.getBoundingClientRect();
        } catch (err) {
          continue;
        }
        if (!r || r.width * r.height < vw * vh * tier.area) continue;
        if (solidBg) node.setAttribute("data-dshww-clear-bg", "1");
        if (bi !== "none" && bi !== "") node.setAttribute("data-dshww-clear-bgi", "1");
        try {
          const shortCls = String(node.className || "").split(/\s+/).slice(0, 2).join(".");
          node.setAttribute("data-dshww-was", (String(node.tagName || "?").toLowerCase() + (shortCls ? "." + shortCls : "") + "|" + bg + "|" + Math.round(r.width) + "x" + Math.round(r.height)).slice(0, 90));
        } catch (err) {
        }
        fixed.push({
          el: (node.id ? "#" + node.id : String(node.tagName || "?").toLowerCase()) + (node.className ? "." + String(node.className).split(/\s+/).slice(0, 2).join(".") : ""),
          areaPct: Number((r.width * r.height / (vw * vh) * 100).toFixed(1)),
          wasBg: bg,
          wasBgImage: solidGradient ? bi.slice(0, 60) : void 0,
          size: `${Math.round(r.width)}x${Math.round(r.height)}`,
          at: `${Math.round(r.left)},${Math.round(r.top)}`
        });
      }
    } catch (err) {
    }
    return fixed;
  }
  function merge(user) {
    const out = Object.assign({}, DEFAULT_CONFIG, user && typeof user === "object" ? user : {});
    if (!Array.isArray(out.characters)) out.characters = [];
    return out;
  }
  function resolvePhysics(raw) {
    const p = Object.assign({}, PHYSICS_FALLBACK, raw && typeof raw === "object" ? raw : {});
    p.wallpaper = p.wallpaper !== false;
    p.autoGen = p.autoGen !== false;
    p.uiClearLevel = Math.max(0, Math.min(3, Math.round(Number(p.uiClearLevel) || 0)));
    p.maxPets = Math.max(1, Math.round(p.maxPets));
    p.seedCount = Math.max(0, Math.min(p.maxPets, Math.round(p.seedCount)));
    return p;
  }
  function appendStyle(id, css) {
    const existing = document.getElementById(id);
    if (existing) existing.textContent = css;
    else {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = css;
      (document.head || document.documentElement).appendChild(el);
    }
  }
  function removeEl(id) {
    const el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  function readSaved() {
    try {
      const raw = globalThis.localStorage && globalThis.localStorage.getItem(POS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      return {};
    }
  }
  function writeSaved(map) {
    try {
      if (globalThis.localStorage) globalThis.localStorage.setItem(POS_KEY, JSON.stringify(map));
    } catch (err) {
    }
  }
  var CUSTOM_WALLPAPER_KEY = "dshww-custom-wallpaper";
  function readCustomWallpaper() {
    try {
      const v = globalThis.localStorage && globalThis.localStorage.getItem(CUSTOM_WALLPAPER_KEY);
      return typeof v === "string" && v.startsWith("data:image/") ? v : "";
    } catch (err) {
      return "";
    }
  }
  function writeCustomWallpaper(dataUrl) {
    try {
      if (!globalThis.localStorage) return false;
      if (dataUrl) globalThis.localStorage.setItem(CUSTOM_WALLPAPER_KEY, dataUrl);
      else globalThis.localStorage.removeItem(CUSTOM_WALLPAPER_KEY);
      return true;
    } catch (err) {
      throw new Error("\u58C1\u7EB8\u5B58\u4E0D\u4E0B\u4E86\uFF08\u6D4F\u89C8\u5668\u672C\u5730\u5B58\u50A8\u6709\u914D\u989D\uFF0C\u6362\u5F20\u5C0F\u70B9\u7684\u56FE\uFF09");
    }
  }
  var DEFAULT_WALLPAPER_PATH = "/dsh-whale-wallpaper/wallpaper";
  function isAutoWallpaper(wallpaperUrl) {
    return String(wallpaperUrl || "") === DEFAULT_WALLPAPER_PATH;
  }
  function createEngine(state) {
    const pets = [];
    let raf = 0;
    let last = 0;
    let saveAt = 0;
    let simTime = 0;
    let splitLockUntil = 0;
    let fullSince = 0;
    let nextEliminateAt = 0;
    let splitPausedUntil = 0;
    const log = [];
    const pushLog = (tag, extra) => {
      try {
        log.push(Object.assign({ t: Math.round(simTime), tag }, extra || {}));
        if (log.length > 200) log.shift();
      } catch (err) {
      }
    };
    const vw = () => globalThis.innerWidth || document.documentElement.clientWidth || 1;
    const vh = () => globalThis.innerHeight || document.documentElement.clientHeight || 1;
    function render(pet) {
      pet.el.style.transform = `translate3d(${pet.x - pet.w / 2}px, ${pet.y - pet.h / 2}px, 0)`;
    }
    function clampX(pet, x) {
      const half = pet.w / 2;
      return Math.min(vw() - half, Math.max(half, x));
    }
    function spawn(spec, x, y, vx, vy) {
      const doc2 = document;
      const hPct = Math.max(2, Number(spec.h) || 28);
      const fill = Number(spec.fill) || 100;
      const mirror = spec.mirror === true;
      const el = doc2.createElement("div");
      el.className = "dshww-pet";
      el.setAttribute("data-src", String(spec.src));
      el.title = spec.alt ? String(spec.alt) : "\u6309\u4F4F\u62D6\u52A8";
      el.style.setProperty("--dshww-flip", mirror ? "-1" : "1");
      const petH = Math.max(20, hPct / 100 * vh());
      const petW = Math.max(20, petH * (fill / 100));
      el.style.width = `${petW}px`;
      el.style.height = `${petH}px`;
      const img = doc2.createElement("img");
      img.className = "dshww-anim";
      img.src = String(spec.src);
      img.alt = spec.alt ? String(spec.alt) : "";
      img.draggable = false;
      img.decoding = "async";
      const hit = doc2.createElement("div");
      hit.className = "dshww-hit";
      hit.style.width = "54%";
      hit.style.height = "70%";
      el.appendChild(img);
      el.appendChild(hit);
      const pet = {
        el,
        img,
        spec,
        w: petW,
        h: petH,
        x: Number.isFinite(x) ? x : vw() * 0.3,
        y: Number.isFinite(y) ? y : vh() * 0.4,
        vx: Number.isFinite(vx) ? vx : 0,
        vy: Number.isFinite(vy) ? vy : 0,
        dragging: false,
        splitCd: 0,
        onGround: false
      };
      img.addEventListener("load", () => {
        try {
          const nw = img.naturalWidth || 1;
          const nh = img.naturalHeight || 1;
          pet.h = Math.max(20, hPct / 100 * vh());
          pet.w = Math.max(16, pet.h * (nw / nh) * (fill / 100));
          el.style.width = `${pet.w}px`;
          el.style.height = `${pet.h}px`;
          render(pet);
        } catch (err) {
        }
      });
      img.addEventListener("error", () => {
        el.hidden = true;
        warn("\u52A8\u56FE\u52A0\u8F7D\u5931\u8D25\uFF1A" + spec.src);
      });
      pet.x = clampX(pet, pet.x);
      pet.y = Math.min(vh() - pet.h / 2, Math.max(pet.h / 2, pet.y));
      if (state.config.draggable !== false) attachDrag(pet);
      state.layer.appendChild(el);
      pets.push(pet);
      render(pet);
      return pet;
    }
    function clear() {
      for (const pet of pets) if (pet.el.parentNode) pet.el.parentNode.removeChild(pet.el);
      pets.length = 0;
      splitLockUntil = 0;
      fullSince = 0;
      nextEliminateAt = 0;
      splitPausedUntil = 0;
    }
    function seed() {
      const specs = state.config.characters;
      if (!specs.length) return 0;
      const n = Math.max(0, Math.min(state.physics.seedCount, specs.length));
      const saved = readSaved();
      for (let i = 0; i < n; i++) {
        const spec = specs[i % specs.length];
        const key = spec.id || spec.src;
        const at = saved[key];
        const pet = spawn(
          spec,
          at ? at.x * vw() : vw() * (0.1 + 0.18 * i),
          at ? at.y * vh() : vh() * (0.55 + 0.08 * i),
          (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 90),
          0
        );
        pet.splitCd = 0.6;
      }
      return pets.length;
    }
    function trySplit(a, b, nx, ny) {
      const P = state.physics;
      const angle = Math.atan2(ny, nx);
      let added = 0;
      for (const src of [a, b]) {
        if (pets.length >= P.maxPets) break;
        const impulse = P.splitImpulse * (0.7 + Math.random() * 0.6);
        const jitter = (Math.random() - 0.5) * 0.9;
        const dx = Math.cos(angle + jitter);
        const dy = Math.sin(angle + jitter);
        const child = spawn(
          src.spec,
          src.x + dx * (src.w * 0.5 + 6),
          src.y + dy * (src.h * 0.5 + 6),
          dx * impulse,
          dy * impulse - 140
        );
        added += 1;
        child.el.setAttribute("data-spawn", "1");
        setTimeout(() => {
          try {
            child.el.removeAttribute("data-spawn");
          } catch (err) {
          }
        }, 260);
        src.vx -= dx * impulse * 0.35;
        src.vy -= dy * impulse * 0.35;
      }
      return added;
    }
    function tryEliminate() {
      const P = state.physics;
      const byKind = {};
      for (const pet of pets) {
        if (pet.dragging) continue;
        const kind = String(pet.spec && pet.spec.src || "");
        if (!byKind[kind]) byKind[kind] = [];
        byKind[kind].push(pet);
      }
      for (const kind of Object.keys(byKind)) {
        const group = byKind[kind];
        if (group.length < 2) continue;
        let best = null;
        let bestD = Infinity;
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const dx = group[i].x - group[j].x;
            const dy = group[i].y - group[j].y;
            const d = dx * dx + dy * dy;
            if (d < bestD) {
              bestD = d;
              best = [group[i], group[j]];
            }
          }
        }
        if (!best) continue;
        for (const pet of best) eliminate(pet);
        return 2;
      }
      return 0;
    }
    function eliminate(pet) {
      try {
        const ghost = pet.el.cloneNode(true);
        ghost.removeAttribute("id");
        ghost.removeAttribute("data-dshww-clear-bg");
        ghost.removeAttribute("data-dshww-was");
        ghost.setAttribute("data-dshww-pop", "1");
        ghost.style.transform = `translate3d(${pet.x - pet.w / 2}px, ${pet.y - pet.h / 2}px, 0)`;
        state.layer.appendChild(ghost);
        setTimeout(() => {
          try {
            if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
          } catch (err) {
          }
        }, 320);
      } catch (err) {
      }
      const i = pets.indexOf(pet);
      if (i >= 0) pets.splice(i, 1);
      if (pet.el.parentNode) pet.el.parentNode.removeChild(pet.el);
    }
    function integrate(dt) {
      simTime += dt * 1e3;
      const P = state.physics;
      const W = vw();
      const H = vh();
      for (const pet of pets) {
        if (pet.splitCd > 0) pet.splitCd -= dt;
        if (pet.dragging) continue;
        pet.vy += P.gravity * dt;
        pet.vx *= Math.pow(P.friction, dt * 60);
        pet.x += pet.vx * dt;
        pet.y += pet.vy * dt;
        const halfW = pet.w / 2;
        const halfH = pet.h / 2;
        if (pet.x - halfW < 0) {
          pet.x = halfW;
          pet.vx = Math.abs(pet.vx) * P.wallBounce;
        } else if (pet.x + halfW > W) {
          pet.x = W - halfW;
          pet.vx = -Math.abs(pet.vx) * P.wallBounce;
        }
        const ceil = P.ceiling * H + halfH;
        if (pet.y < ceil) {
          pet.y = ceil;
          pet.vy = Math.abs(pet.vy) * P.wallBounce;
        }
        const ground = P.floor * H - halfH;
        pet.onGround = false;
        if (pet.y >= ground) {
          pet.y = ground;
          if (pet.vy > 0) pet.vy = pet.vy > P.minBounce ? -pet.vy * P.bounce : 0;
          pet.onGround = true;
          pet.vx *= Math.pow(P.groundFriction, dt * 60);
          if (Math.abs(pet.vx) < 4) pet.vx = 0;
        }
        for (const other of pets) {
          if (other === pet) continue;
          const dx = other.x - pet.x;
          const dy = other.y - pet.y;
          const minDx = (pet.w + other.w) / 2 * 0.78;
          const minDy = (pet.h + other.h) / 2 * 0.86;
          if (Math.abs(dx) > minDx || Math.abs(dy) > minDy) continue;
          const px = 1 - Math.abs(dx) / (minDx || 1);
          const py = 1 - Math.abs(dy) / (minDy || 1);
          let nx = 0;
          let ny = 0;
          const isX = px < py;
          if (isX) {
            nx = dx === 0 ? Math.random() < 0.5 ? -1 : 1 : Math.sign(dx);
          } else {
            ny = dy === 0 ? Math.random() < 0.5 ? -1 : 1 : Math.sign(dy);
          }
          const approach = isX ? (pet.vx - other.vx) * nx : (pet.vy - other.vy) * ny;
          if (isX) {
            pet.x -= nx * px * minDx * 0.5;
            other.x += nx * px * minDx * 0.5;
            const rel = other.vx - pet.vx;
            if (rel * nx < 0) {
              const exchange = rel * 0.5;
              pet.vx += nx * exchange;
              other.vx -= nx * exchange;
            }
          } else {
            pet.y -= ny * py * minDy * 0.5;
            other.y += ny * py * minDy * 0.5;
            const rel = other.vy - pet.vy;
            if (rel * ny < 0) {
              const exchange = rel * 0.5;
              pet.vy += ny * exchange;
              other.vy -= ny * exchange;
            }
          }
          const sideBySide = Math.abs(dy) < (pet.h + other.h) * 0.35;
          if (sideBySide && isX && approach > 0 && simTime >= splitLockUntil && simTime >= splitPausedUntil && pets.length < state.physics.maxPets) {
            splitLockUntil = simTime + P.splitCooldown * 1e3;
            pet.splitCd = P.splitCooldown;
            other.splitCd = P.splitCooldown;
            pushLog("split", { from: pets.length, to: pets.length + 2 });
            trySplit(pet, other, nx, ny);
          }
        }
        render(pet);
      }
      if (pets.length >= P.maxPets) {
        if (!fullSince) {
          fullSince = simTime;
          nextEliminateAt = simTime + P.eliminateDelay * 1e3;
          splitPausedUntil = simTime + P.splitPause * 1e3;
          pushLog("cap-reached", { n: pets.length, pauseS: P.splitPause, delayS: P.eliminateDelay });
        } else if (simTime >= nextEliminateAt) {
          if (tryEliminate() > 0) {
            pushLog("eliminate", { n: pets.length });
            nextEliminateAt = simTime + P.eliminateInterval * 1e3;
          } else {
            pushLog("eliminate-skip", { n: pets.length, nextIn: 200 });
            nextEliminateAt = simTime + 200;
          }
        }
      } else {
        fullSince = 0;
        nextEliminateAt = 0;
        splitPausedUntil = 0;
      }
      if (simTime - saveAt > 1500) {
        saveAt = simTime;
        const map = {};
        const specs = state.config.characters;
        for (let i = 0; i < Math.min(state.physics.seedCount, pets.length, specs.length); i++) {
          const key = specs[i].id || specs[i].src;
          map[key] = { x: +(pets[i].x / W).toFixed(4), y: +(pets[i].y / H).toFixed(4) };
        }
        writeSaved(map);
      }
      updateCount();
    }
    function step(now) {
      raf = globalThis.requestAnimationFrame(step);
      if (!last) {
        last = now;
        return;
      }
      const dt = (now - last) / 1e3;
      last = now;
      if (!(dt > 0)) return;
      integrate(Math.min(0.033, dt));
    }
    function tick() {
      if (raf) return;
      last = 0;
      raf = globalThis.requestAnimationFrame(step);
    }
    function stop() {
      if (raf) {
        try {
          globalThis.cancelAnimationFrame(raf);
        } catch (err) {
        }
        raf = 0;
      }
    }
    function updateCount() {
      if (state.countEl) state.countEl.textContent = `${pets.length}/${state.physics.maxPets}`;
    }
    function attachDrag(pet) {
      const hit = pet.el.querySelector(".dshww-hit") || pet.el;
      let sx = 0;
      let sy = 0;
      let lx = 0;
      let ly = 0;
      let ltime = 0;
      const onDown = (ev) => {
        if (ev.button !== void 0 && ev.button !== 0) return;
        pet.dragging = true;
        pet.el.setAttribute("data-dragging", "1");
        sx = ev.clientX;
        sy = ev.clientY;
        lx = ev.clientX;
        ly = ev.clientY;
        ltime = performance.now();
        pet.vx = 0;
        pet.vy = 0;
        clearTextSelection();
        beginDragMarker();
        try {
          hit.setPointerCapture && hit.setPointerCapture(ev.pointerId);
        } catch (err) {
        }
        ev.preventDefault();
        ev.stopPropagation();
      };
      const onMove = (ev) => {
        if (!pet.dragging) return;
        clearTextSelection();
        pet.x = clampX(pet, pet.x + (ev.clientX - sx));
        pet.y = Math.min(vh() - pet.h / 2, Math.max(pet.h / 2, pet.y + (ev.clientY - sy)));
        sx = ev.clientX;
        sy = ev.clientY;
        const now = performance.now();
        const dt = Math.max(8, now - ltime);
        pet.vx = (ev.clientX - lx) / dt * 1e3;
        pet.vy = (ev.clientY - ly) / dt * 1e3;
        lx = ev.clientX;
        ly = ev.clientY;
        ltime = now;
        render(pet);
        ev.preventDefault();
        ev.stopPropagation();
      };
      const onUp = (ev) => {
        if (!pet.dragging) return;
        pet.dragging = false;
        pet.el.removeAttribute("data-dragging");
        endDragMarker();
        try {
          hit.releasePointerCapture && hit.releasePointerCapture(ev.pointerId);
        } catch (err) {
        }
        const cap = 2400;
        pet.vx = Math.max(-cap, Math.min(cap, pet.vx));
        pet.vy = Math.max(-cap, Math.min(cap, pet.vy));
        clearTextSelection();
        ev.preventDefault();
        ev.stopPropagation();
      };
      hit.addEventListener("pointerdown", onDown);
      hit.addEventListener("pointermove", onMove);
      hit.addEventListener("pointerup", onUp);
      hit.addEventListener("pointercancel", onUp);
      hit.addEventListener("dragstart", (ev) => ev.preventDefault());
      hit.addEventListener("contextmenu", (ev) => ev.preventDefault());
      hit.addEventListener("dblclick", (ev) => {
        clearTextSelection();
        ev.preventDefault();
      });
      hit.addEventListener("lostpointercapture", () => {
        if (!pet.dragging) return;
        pet.dragging = false;
        pet.el.removeAttribute("data-dragging");
        endDragMarker();
      });
    }
    return {
      pets,
      spawn,
      seed,
      clear,
      tick,
      stop,
      updateCount,
      render,
      integrate,
      /** 引擎真正在用的那份物理参数（自检/测试用）。 */
      physics: () => state.physics,
      /** 把「满员后停分裂」的截止时刻清零，立刻解除暂停（自检/测试用）。 */
      releaseSplitPause: () => {
        splitPausedUntil = 0;
        return true;
      },
      /** 分裂暂停的剩余秒数（自检/测试用）。 */
      splitPauseLeft: () => Math.max(0, (splitPausedUntil - simTime) / 1e3),
      /**
       * 把模拟状态清干净并重新播下种子挂件（自检/测试用）。
       *
       * 为什么需要：分裂/对消/暂停这些玩法会改 `simTime`、`fullSince`、`splitPausedUntil`
       * 和挂件数量，用例之间会互相污染（测试飘过好几次，全是这个原因）。
       * 有了它，每个用例都能从确定的初始状态起跑。
       */
      debugReset: () => {
        clear();
        simTime = 0;
        saveAt = 0;
        last = 0;
        log.length = 0;
        seed();
        updateCount();
        return pets.length;
      },
      /** 环形调试日志（自检/测试用）。 */
      debugLog: () => log.slice(),
      debugLogClear: () => {
        log.length = 0;
        return true;
      },
      /** 挂机奖励：随便落一只新的（已经到上限就不加）。 */
      spawnIdle: () => {
        try {
          if (pets.length >= state.physics.maxPets) return false;
          const specs = state.config.characters || [];
          if (!specs.length) return false;
          const spec = specs[Math.floor(Math.random() * specs.length)];
          const pet = spawn(
            spec,
            vw() * (0.12 + Math.random() * 0.76),
            vh() * 0.12,
            (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 80),
            0
          );
          pet.splitCd = 0.6;
          return true;
        } catch (err) {
          return false;
        }
      }
    };
  }
  var FIELDS = [
    ["maxPets", "\u6570\u91CF\u4E0A\u9650", 1, 30, 1, "\u4E2A"],
    ["seedCount", "\u6E05\u96F6\u540E\u56DE\u5230", 0, 10, 1, "\u4E2A"],
    ["gravity", "\u91CD\u529B", 0, 4e3, 50, "px/s\xB2"],
    ["bounce", "\u843D\u5730\u53CD\u5F39", 0, 1, 0.02, ""],
    ["wallBounce", "\u649E\u5899\u53CD\u5F39", 0, 1, 0.02, ""],
    ["minBounce", "\u505C\u7A33\u9608\u503C", 0, 400, 10, "px/s"],
    ["splitImpulse", "\u5206\u88C2\u51B2\u91CF", 0, 900, 20, "px/s"],
    ["splitCooldown", "\u78B0\u649E\u51B7\u5374", 0.2, 10, 0.1, "s"],
    ["splitPause", "\u6EE1\u5458\u540E\u505C\u5206\u88C2", 0, 600, 10, "s"],
    ["eliminateDelay", "\u6EE1\u5458\u591A\u4E45\u540E\u5BF9\u6D88", 0, 120, 1, "s"],
    ["eliminateInterval", "\u5BF9\u6D88\u95F4\u9694", 0.5, 30, 0.5, "s"],
    ["idleSpawnInterval", "\u6302\u673A\u591A\u4E45\u52A0\u4E00\u53EA", 0, 1800, 10, "s"],
    ["friction", "\u7A7A\u6C14\u963B\u529B", 0.8, 1, 5e-3, ""],
    ["groundFriction", "\u5730\u9762\u6469\u64E6", 0.5, 1, 0.01, ""],
    ["ceiling", "\u4E0A\u8FB9\u754C", -0.1, 0.5, 0.01, ""],
    ["floor", "\u4E0B\u8FB9\u754C", 0.5, 1.2, 0.01, ""]
  ];
  var BOOL_FIELDS = [
    ["wallpaper", "\u663E\u793A\u58C1\u7EB8", true],
    ["autoGen", "\u81EA\u52A8\u751F\u6210\u58C1\u7EB8", true]
  ];
  var LEVEL_FIELDS = [
    ["uiClearLevel", "\u754C\u9762\u901A\u900F", 3, [
      [1, "1 \xB7 \u53EA\u900F\u5927\u9762\u677F"],
      [2, "2 \xB7 \u8FDE\u5C0F\u5757\u4E00\u8D77\u900F"],
      [3, "3 \xB7 \u5168\u900F\uFF08\u9ED8\u8BA4\uFF09"],
      [0, "0 \xB7 \u4E0D\u52A8\u754C\u9762"]
    ]]
  ];
  function buildPanel(state, api) {
    const doc2 = document;
    const panel = doc2.createElement("div");
    panel.id = PANEL_ID;
    panel.className = "dshww-panel";
    const title = doc2.createElement("h4");
    title.textContent = "\u6302\u4EF6\u8BBE\u7F6E";
    panel.appendChild(title);
    const actionsTop = doc2.createElement("div");
    actionsTop.className = "dshww-actions dshww-actions-vertical";
    const clear = doc2.createElement("button");
    clear.className = "dshww-btn";
    clear.textContent = "\u6E05\u96F6";
    actionsTop.appendChild(clear);
    panel.appendChild(actionsTop);
    const note = doc2.createElement("p");
    note.className = "dshww-note";
    note.textContent = "\u70B9\u4FDD\u5B58\u5199\u8FDB $DSH_HOME/.dshw-wallpaper-settings.json\uFF1B\u6253\u5F00\u9762\u677F\u65F6\u7269\u7406\u4F1A\u51BB\u7ED3\uFF0C\u65B9\u4FBF\u8C03\u53C2";
    panel.appendChild(note);
    const inputs = {};
    const groupRender = doc2.createElement("div");
    groupRender.className = "dshww-group";
    groupRender.textContent = "\u6E32\u67D3";
    panel.appendChild(groupRender);
    const boolRows = {};
    for (const [key, label, def] of BOOL_FIELDS) {
      const row = doc2.createElement("div");
      row.className = "dshww-field";
      const lab = doc2.createElement("label");
      lab.textContent = label;
      const cb = doc2.createElement("input");
      cb.type = "checkbox";
      cb.checked = def;
      row.appendChild(lab);
      row.appendChild(cb);
      panel.appendChild(row);
      boolRows[key] = cb;
    }
    const levelRows = {};
    for (const [key, label, def, options] of LEVEL_FIELDS) {
      const row = doc2.createElement("div");
      row.className = "dshww-field";
      const lab = doc2.createElement("label");
      lab.textContent = label;
      const sel = doc2.createElement("select");
      for (const [val, text] of options) {
        const opt = doc2.createElement("option");
        opt.value = String(val);
        opt.textContent = text;
        sel.appendChild(opt);
      }
      sel.value = String(def);
      row.appendChild(lab);
      row.appendChild(sel);
      panel.appendChild(row);
      levelRows[key] = sel;
    }
    const groupWall = doc2.createElement("div");
    groupWall.className = "dshww-group";
    groupWall.textContent = "\u58C1\u7EB8";
    panel.appendChild(groupWall);
    const wallRow = doc2.createElement("div");
    wallRow.className = "dshww-field";
    const wallLab = doc2.createElement("label");
    wallLab.textContent = "\u81EA\u5B9A\u4E49\u58C1\u7EB8";
    const fileInput = doc2.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png,image/jpeg,image/webp,image/gif";
    const pickBtn = doc2.createElement("button");
    pickBtn.type = "button";
    pickBtn.className = "dshww-btn";
    pickBtn.textContent = "\u9009\u62E9\u56FE\u7247";
    pickBtn.addEventListener("click", () => {
      try {
        fileInput.click();
      } catch (err) {
      }
    });
    const clearWallBtn = doc2.createElement("button");
    clearWallBtn.type = "button";
    clearWallBtn.className = "dshww-btn";
    clearWallBtn.textContent = "\u6E05\u9664";
    wallRow.appendChild(wallLab);
    wallRow.appendChild(pickBtn);
    wallRow.appendChild(clearWallBtn);
    wallRow.appendChild(fileInput);
    panel.appendChild(wallRow);
    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (!/^image\//.test(String(file.type || ""))) {
        status.textContent = "\u8FD9\u4E0D\u662F\u56FE\u7247\u6587\u4EF6";
        return;
      }
      const MAX = 4 * 1024 * 1024;
      if (file.size > MAX) {
        status.textContent = `\u56FE\u592A\u5927\u4E86\uFF08${(file.size / 1048576).toFixed(1)} MB\uFF09\uFF0C\u4E0A\u9650 4 MB`;
        return;
      }
      const reader = new globalThis.FileReader();
      reader.onload = () => {
        try {
          api.applyCustomWallpaper(String(reader.result || ""));
          status.textContent = "\u81EA\u5B9A\u4E49\u58C1\u7EB8\u5DF2\u5E94\u7528\uFF08\u5B58\u5728\u672C\u673A\u6D4F\u89C8\u5668\u91CC\uFF09";
        } catch (err) {
          status.textContent = String(err && err.message || err);
        }
      };
      reader.onerror = () => {
        status.textContent = "\u8BFB\u6587\u4EF6\u5931\u8D25";
      };
      reader.readAsDataURL(file);
    });
    clearWallBtn.addEventListener("click", () => {
      try {
        api.applyCustomWallpaper("");
        status.textContent = "\u5DF2\u6E05\u9664\u81EA\u5B9A\u4E49\u58C1\u7EB8\uFF0C\u56DE\u5230\u9ED8\u8BA4\u90A3\u5F20";
      } catch (err) {
        status.textContent = String(err && err.message || err);
      }
    });
    const groupCount = doc2.createElement("div");
    groupCount.className = "dshww-group";
    groupCount.textContent = "\u6570\u91CF";
    panel.appendChild(groupCount);
    let inPhysics = false;
    for (const [key, label, min, max, step, unit] of FIELDS) {
      if (key === "gravity" && !inPhysics) {
        inPhysics = true;
        const g = doc2.createElement("div");
        g.className = "dshww-group";
        g.textContent = "\u7269\u7406";
        panel.appendChild(g);
      }
      const row = doc2.createElement("div");
      row.className = "dshww-field";
      const lab = doc2.createElement("label");
      lab.textContent = label;
      const range = doc2.createElement("input");
      range.type = "range";
      range.min = String(min);
      range.max = String(max);
      range.step = String(step);
      const numInput = doc2.createElement("input");
      numInput.type = "number";
      numInput.min = String(min);
      numInput.max = String(max);
      numInput.step = String(step);
      const unitEl = doc2.createElement("span");
      unitEl.className = "dshww-unit";
      unitEl.textContent = unit;
      range.addEventListener("input", () => {
        numInput.value = range.value;
      });
      numInput.addEventListener("input", () => {
        range.value = numInput.value;
      });
      row.appendChild(lab);
      row.appendChild(range);
      row.appendChild(numInput);
      row.appendChild(unitEl);
      panel.appendChild(row);
      inputs[key] = {
        set(v) {
          const val = Number(v);
          if (!Number.isFinite(val)) return;
          range.value = String(val);
          numInput.value = String(+val.toFixed(4));
        },
        get: () => Number(numInput.value)
      };
    }
    const status = doc2.createElement("p");
    status.className = "dshww-note";
    status.style.margin = "10px 0 0";
    panel.appendChild(status);
    const actions = doc2.createElement("div");
    actions.className = "dshww-actions";
    const save = doc2.createElement("button");
    save.className = "dshww-btn";
    save.dataset.primary = "1";
    save.textContent = "\u4FDD\u5B58";
    const reset = doc2.createElement("button");
    reset.className = "dshww-btn";
    reset.textContent = "\u6062\u590D\u9ED8\u8BA4";
    actions.appendChild(save);
    actions.appendChild(reset);
    panel.appendChild(actions);
    const fill = (physics) => {
      for (const key of Object.keys(inputs)) inputs[key].set(physics[key]);
      for (const key of Object.keys(boolRows)) boolRows[key].checked = physics[key] !== false;
      for (const key of Object.keys(levelRows)) {
        const v = physics[key];
        if (v !== void 0 && v !== null) levelRows[key].value = String(v);
      }
    };
    fill(state.physics);
    if (levelRows.uiClearLevel) {
      levelRows.uiClearLevel.addEventListener("change", () => {
        const v = Number(levelRows.uiClearLevel.value);
        globalThis.__dshWhaleWallpaperClearLevel = v;
        api.refreshTransparency();
        status.textContent = `\u754C\u9762\u901A\u900F = ${v}\uFF08\u5DF2\u7ACB\u5373\u751F\u6548\uFF0C\u70B9\u4FDD\u5B58\u843D\u76D8\uFF09`;
      });
    }
    if (boolRows.wallpaper) {
      const box = boolRows.wallpaper;
      box.addEventListener("change", () => {
        api.applyWallpaper(box.checked);
        status.textContent = box.checked ? "\u58C1\u7EB8\u5DF2\u5F00\uFF08\u70B9\u4FDD\u5B58\u843D\u76D8\uFF09" : "\u58C1\u7EB8\u5DF2\u5173\uFF08\u70B9\u4FDD\u5B58\u843D\u76D8\uFF09";
      });
    }
    if (boolRows.autoGen) {
      const box = boolRows.autoGen;
      box.addEventListener("change", () => {
        state.physics.autoGen = box.checked;
        api.applyAutoGen(box.checked);
        status.textContent = box.checked ? "\u81EA\u52A8\u58C1\u7EB8\u5DF2\u5F00\uFF08\u70B9\u4FDD\u5B58\u843D\u76D8\uFF09" : "\u81EA\u52A8\u58C1\u7EB8\u5DF2\u5173\uFF08\u70B9\u4FDD\u5B58\u843D\u76D8\uFF09";
      });
    }
    save.addEventListener("click", async () => {
      const physics = {};
      for (const key of Object.keys(inputs)) physics[key] = inputs[key].get();
      for (const key of Object.keys(boolRows)) physics[key] = boolRows[key].checked;
      for (const key of Object.keys(levelRows)) physics[key] = Number(levelRows[key].value);
      status.textContent = "\u6B63\u5728\u4FDD\u5B58\u2026";
      const res = await api.save(physics);
      if (res && res.ok) {
        fill(res.physics);
        state.physics = resolvePhysics(res.physics);
        api.applyPhysics();
        status.textContent = `\u5DF2\u4FDD\u5B58\uFF08${(/* @__PURE__ */ new Date()).toLocaleTimeString()}\uFF09`;
      } else {
        status.textContent = "\u4FDD\u5B58\u5931\u8D25\uFF1A\u5BBF\u4E3B\u6CA1\u5199\u6210\u529F\uFF0C\u770B\u4E0B .dshw-wallpaper.log";
      }
    });
    reset.addEventListener("click", async () => {
      const res = await api.reset();
      if (res && res.ok) {
        fill(res.physics);
        state.physics = resolvePhysics(res.physics);
        api.applyPhysics();
        status.textContent = "\u5DF2\u6062\u590D\u9ED8\u8BA4\u503C";
      } else status.textContent = "\u6062\u590D\u5931\u8D25";
    });
    clear.addEventListener("click", () => {
      api.clearCount();
      status.textContent = `\u5DF2\u6E05\u96F6\uFF1A\u73B0\u5728 ${state.physics.seedCount} \u4E2A`;
    });
    return { panel, fill, status };
  }
  function injectWallpaper(userConfig) {
    const config = merge(userConfig);
    const doc2 = document;
    globalThis.__dshWhaleWallpaper = true;
    globalThis.__dshWhaleWallpaperMount = (next) => mount(next ? merge(next) : config);
    if (!doc2 || !(doc2.body || doc2.documentElement)) {
      let tries = 0;
      const timer = setInterval(() => {
        tries += 1;
        if (doc2 && (doc2.body || doc2.documentElement)) {
          clearInterval(timer);
          try {
            mount(config);
          } catch (err) {
            warn(err);
          }
        } else if (tries > 200) clearInterval(timer);
      }, 100);
      return;
    }
    mount(config);
  }
  function apiBase(config) {
    const s = String(config.wallpaper || "");
    const cut = s.lastIndexOf("/");
    return cut > 0 ? s.slice(0, cut) : "/dsh-whale-wallpaper";
  }
  function mount(config) {
    const doc2 = document;
    if (globalThis.__dshWhaleWallpaperApi) {
      try {
        globalThis.__dshWhaleWallpaperApi.dispose();
      } catch (err) {
      }
    }
    globalThis.__dshWhaleWallpaperKeep = false;
    removeEl(LAYER_ID);
    removeEl(PETS_ID);
    removeEl(BAR_ID);
    removeEl(PANEL_ID);
    removeEl(CANVAS_STYLE_ID);
    appendStyle(STYLE_ID, stylesheet());
    if (!config.enabled) {
      removeEl(UI_TRANSPARENT_STYLE_ID);
      return;
    }
    if (config.transparentUI) appendStyle(UI_TRANSPARENT_STYLE_ID, UI_TRANSPARENT_CSS);
    else removeEl(UI_TRANSPARENT_STYLE_ID);
    const root = doc2.getElementById("root");
    if (root) {
      const parts = [];
      if (config.transparentUI && config.uiOpacity < 1) parts.push(`opacity(${config.uiOpacity})`);
      if (config.transparentUI && config.uiSaturate !== 1) parts.push(`saturate(${config.uiSaturate})`);
      root.style.filter = parts.join(" ");
    }
    globalThis.__dshWhaleWallpaperClearLevel = config.uiClearLevel;
    globalThis.__dshWhaleWallpaperConfig = config;
    const clearedLayers = config.transparentUI ? fixOpaqueAppLayers() : [];
    config.clearedLayers = clearedLayers;
    if (config.transparentUI) watchOpaqueLayers();
    const parent = doc2.body || doc2.documentElement;
    appendStyle(CANVAS_STYLE_ID, canvasCss());
    const canvasVars = doc2.documentElement;
    const canvasUrl = String(config.wallpaper).replace(/"/g, "%22");
    const canvasFilters = [];
    if (config.brightness !== 1) canvasFilters.push(`brightness(${config.brightness})`);
    if (config.blur > 0) canvasFilters.push(`blur(${config.blur}px)`);
    canvasVars.style.setProperty("--dshww-canvas-filter", canvasFilters.length ? canvasFilters.join(" ") : "none");
    canvasVars.style.setProperty("--dshww-canvas-size", config.fit === "fill" ? "100% 100%" : String(config.fit));
    canvasVars.style.setProperty("--dshww-canvas-image", "none");
    const layer = doc2.createElement("div");
    layer.id = LAYER_ID;
    layer.className = "dshww-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.style.zIndex = "-1";
    const wallpaperImg = doc2.createElement("img");
    wallpaperImg.className = "dshww-wallpaper";
    wallpaperImg.alt = "";
    wallpaperImg.draggable = false;
    wallpaperImg.decoding = "async";
    wallpaperImg.src = canvasUrl;
    wallpaperImg.addEventListener("error", () => {
      wallpaperImg.hidden = true;
      warn("\u58C1\u7EB8\u56FE\u52A0\u8F7D\u5931\u8D25\uFF1A" + canvasUrl);
    });
    layer.appendChild(wallpaperImg);
    if (config.veil) {
      layer.style.setProperty("--dshww-veil", String(config.veil));
      const veil = doc2.createElement("div");
      veil.className = "dshww-veil";
      veil.style.background = String(config.veil);
      layer.appendChild(veil);
    }
    const canvasState = { on: config.physics ? config.physics.wallpaper !== false : true };
    canvasState.custom = readCustomWallpaper();
    if (canvasState.custom) {
      try {
        wallpaperImg.src = canvasState.custom;
      } catch (err) {
      }
    }
    const autoGenOn = !config.physics || config.physics.autoGen !== false;
    const hideAuto = !autoGenOn && isAutoWallpaper(canvasUrl) && !canvasState.custom;
    if (!hideAuto) parent.appendChild(layer);
    if (config.pets === false || !config.characters.length) return;
    const petsLayer = doc2.createElement("div");
    petsLayer.id = PETS_ID;
    petsLayer.className = "dshww-pets";
    petsLayer.style.zIndex = String(PETS_Z);
    parent.appendChild(petsLayer);
    const state = {
      config,
      physics: resolvePhysics(config.physics),
      layer: petsLayer,
      countEl: null
    };
    config.physics = state.physics;
    const bar = doc2.createElement("div");
    bar.id = BAR_ID;
    bar.className = "dshww-bar";
    const countEl = doc2.createElement("span");
    countEl.className = "dshww-count";
    const settingsBtn = doc2.createElement("button");
    settingsBtn.className = "dshww-btn";
    settingsBtn.textContent = "\u8BBE\u7F6E";
    bar.appendChild(countEl);
    bar.appendChild(settingsBtn);
    parent.appendChild(bar);
    state.countEl = countEl;
    const engine = createEngine(state);
    const base = apiBase(config);
    const applyWallpaper = (on) => {
      canvasState.on = on !== false;
      try {
        if (canvasState.on) {
          wallpaperImg.removeAttribute("hidden");
          layer.removeAttribute("hidden");
        } else {
          wallpaperImg.setAttribute("hidden", "");
          layer.setAttribute("hidden", "");
        }
      } catch (err) {
      }
    };
    const applyAutoGen = (on) => {
      try {
        const disable = on === false;
        const hideAuto2 = disable && isAutoWallpaper(canvasUrl) && !canvasState.custom;
        if (hideAuto2) {
          if (doc2.body && layer.parentNode === doc2.body) doc2.body.removeChild(layer);
        } else if (!layer.parentNode) {
          ;
          (doc2.body || doc2.documentElement).appendChild(layer);
        }
      } catch (err) {
      }
    };
    const applyCustomWallpaper = (dataUrl) => {
      canvasState.custom = dataUrl || "";
      try {
        if (canvasState.custom) wallpaperImg.src = canvasState.custom;
        else wallpaperImg.src = canvasUrl;
      } catch (err) {
      }
      try {
        writeCustomWallpaper(canvasState.custom);
      } catch (err) {
        warn(err);
      }
      applyAutoGen(state.physics.autoGen);
    };
    canvasState.custom = readCustomWallpaper();
    const pullSettings = async () => {
      try {
        const res = await fetch(`${base}/settings.json`, { headers: { "Cache-Control": "no-store" } });
        const data = await res.json();
        if (data && data.ok && data.physics) {
          state.physics = resolvePhysics(data.physics);
          config.physics = state.physics;
          globalThis.__dshWhaleWallpaperClearLevel = state.physics.uiClearLevel;
          for (const pet of engine.pets) pet.sp = state.physics;
          engine.updateCount();
          applyWallpaper(state.physics.wallpaper);
          applyAutoGen(state.physics.autoGen);
          api.refreshTransparency();
        }
      } catch (err) {
      }
    };
    const api = {
      save: async (physics) => {
        try {
          const res = await fetch(`${base}/settings.json`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ physics })
          });
          return await res.json();
        } catch (err) {
          return { ok: false };
        }
      },
      reset: async () => {
        try {
          const res = await fetch(`${base}/settings.json`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reset: true })
          });
          return await res.json();
        } catch (err) {
          return { ok: false };
        }
      },
      clearCount: () => {
        engine.clear();
        engine.seed();
        engine.tick();
        engine.updateCount();
        writeSaved({});
      },
      refreshSettings: () => pullSettings(),
      applyPhysics: () => engine.updateCount(),
      /** 壁纸开关（设置面板里的勾选框）。 */
      applyWallpaper,
      /** 「关闭自动生成」= 不显示自带那张默认壁纸。 */
      applyAutoGen,
      /** 自定义壁纸（data URL；空字符串 = 回默认）。 */
      applyCustomWallpaper,
      /** 界面重渲染后重新清一遍「糊住壁纸」的底色（MutationObserver 会一直叫它）。 */
      refreshTransparency: () => {
        if (state.config.transparentUI) {
          const list = fixOpaqueAppLayers();
          state.config.clearedLayers = list;
          globalThis.__dshWhaleWallpaperLastScan = {
            at: (/* @__PURE__ */ new Date()).toISOString(),
            cleared: list.length,
            sample: list.slice(0, 6)
          };
        }
      },
      /** 给自检/调试用：拿到内部挂件列表（每个对象含 x/y/vx/vy/w/h 与 DOM 节点）。 */
      debugPets: () => engine.pets,
      /**
       * 给自检用：**活引用**（`debugPets()` 返回的是快照，`debugReset()` 之后会变成孤儿）。
       * 要反复读写挂件状态就用这个，别缓存。
       */
      debugPetsLive: () => engine.pets,
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
        engine.stop();
        removeEl(BAR_ID);
        removeEl(PANEL_ID);
      }
    };
    globalThis.__dshWhaleWallpaperApi = api;
    let panelApi = null;
    settingsBtn.addEventListener("click", () => {
      if (doc2.getElementById(PANEL_ID)) {
        removeEl(PANEL_ID);
        engine.tick();
        return;
      }
      panelApi = buildPanel(state, api);
      parent.appendChild(panelApi.panel);
      engine.stop();
    });
    engine.seed();
    engine.updateCount();
    engine.tick();
    keepInPlace(engine);
    watchIdle(engine);
    pullSettings();
    reportDiag(base);
  }
  function reportDiag(base) {
    const send = (tag) => {
      const post = (payload) => {
        try {
          const f = globalThis.fetch;
          if (typeof f !== "function") return;
          f.call(globalThis, `${base}/diag.json`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true
          }).catch(() => {
          });
        } catch (err) {
        }
      };
      try {
        const doc2 = document;
        const view = globalThis;
        const css = view.getComputedStyle || (() => null);
        const bodyCs = css(doc2.body) || {};
        const htmlCs = css(doc2.documentElement) || {};
        const rootEl = doc2.getElementById("root");
        const rootCs = rootEl ? css(rootEl) || {} : null;
        const cache = /* @__PURE__ */ new Map();
        const csOf = (el) => {
          if (!cache.has(el)) cache.set(el, css(el) || {});
          return cache.get(el);
        };
        const canvas = doc2.getElementById(CANVAS_STYLE_ID);
        const canvasVarSource = doc2.documentElement.style;
        const innerW = view.innerWidth || doc2.documentElement && doc2.documentElement.clientWidth || 0;
        const innerH = view.innerHeight || doc2.documentElement && doc2.documentElement.clientHeight || 0;
        const probes = [];
        const probeNotes = [];
        for (const el of [doc2.documentElement, doc2.body, rootEl, doc2.getElementById(LAYER_ID), doc2.getElementById(PETS_ID)]) {
          if (!el) continue;
          const label = el.id ? "#" + el.id : String(el.tagName || "?").toLowerCase();
          let r = null;
          if (typeof el.getBoundingClientRect === "function") {
            r = el.getBoundingClientRect();
          } else {
            probeNotes.push(label + ": \u6CA1\u6709 getBoundingClientRect\uFF08ctor=" + String(el.constructor && el.constructor.name) + "\uFF09");
          }
          let cs = null;
          try {
            cs = csOf(el);
          } catch (err) {
            probeNotes.push(label + ": getComputedStyle \u5931\u8D25 " + err);
          }
          probes.push({
            el: label,
            rect: r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null,
            z: cs ? cs.zIndex : "?",
            pos: cs ? cs.position : "?",
            bgColor: cs ? cs.backgroundColor : "?",
            bgImage: cs ? String(cs.backgroundImage).slice(0, 200) : "?",
            opacity: cs ? cs.opacity : "?"
          });
        }
        const loc = view.location || {};
        const payload = {
          tag,
          href: String(loc.href || "").slice(0, 200),
          origin: String(loc.origin || ""),
          viewport: [innerW, innerH],
          readyState: doc2.readyState,
          ua: String(view.navigator && view.navigator.userAgent || "").slice(0, 160),
          canvasVar: canvas ? {
            image: canvasVarSource.getPropertyValue("--dshww-canvas-image"),
            size: canvasVarSource.getPropertyValue("--dshww-canvas-size"),
            filter: canvasVarSource.getPropertyValue("--dshww-canvas-filter")
          } : null,
          computed: {
            htmlBg: String(htmlCs.backgroundColor) + " | " + String(htmlCs.backgroundImage).slice(0, 200),
            bodyBg: String(bodyCs.backgroundColor) + " | " + String(bodyCs.backgroundImage).slice(0, 200),
            bodyFilter: bodyCs.filter,
            bodySize: String(bodyCs.backgroundSize) + " " + String(bodyCs.backgroundAttachment),
            rootBg: rootCs ? rootCs.backgroundColor : "(\u6CA1\u6709 #root)"
          },
          pets: {
            count: doc2.getElementById(PETS_ID) ? doc2.getElementById(PETS_ID).children.length : 0,
            bar: !!doc2.getElementById(BAR_ID)
          },
          // 壁纸现在是一个 <img>：把它的真实状态报上去（src / 是否隐藏 / 有没有解码出尺寸）
          wallpaper: (() => {
            try {
              const el = doc2.getElementById(LAYER_ID);
              const img = el ? el.querySelector(".dshww-wallpaper") : null;
              if (!img) return null;
              return {
                src: String(img.getAttribute("src") || img.src || "").slice(0, 200),
                hidden: !!img.hidden,
                complete: !!img.complete,
                natural: [img.naturalWidth || 0, img.naturalHeight || 0],
                layerHidden: !!(el && el.hidden)
              };
            } catch (err) {
              return { error: String(err && err.message || err) };
            }
          })(),
          // 从壁纸往上每一层的「会把它变淡」的属性都报上来：
          // opacity / filter / backdrop-filter / mix-blend-mode / 背景色
          // （「背景很淡」这种问题只能这么定位 —— 逐层看谁在动它）
          ancestorChain: (() => {
            const out = [];
            try {
              let node = doc2.getElementById(LAYER_ID);
              let depth = 0;
              while (node && depth < 14) {
                const cs = csOf(node) || {};
                out.push({
                  el: (node.id ? "#" + node.id : String(node.tagName || "?").toLowerCase()) + (node.className ? "." + String(node.className).split(/\s+/)[0] : ""),
                  opacity: cs.opacity,
                  filter: cs.filter,
                  backdrop: cs.backdropFilter,
                  blend: cs.mixBlendMode,
                  bg: cs.backgroundColor,
                  z: cs.zIndex,
                  pos: cs.position
                });
                node = node.parentElement;
                depth += 1;
              }
            } catch (err) {
              out.push({ error: String(err && err.message || err) });
            }
            return out;
          })(),
          probeNotes,
          // 最近一次「补扫」的结果 —— 用来确认 MutationObserver 到底有没有在工作
          lastScan: globalThis.__dshWhaleWallpaperLastScan || null,
          // 主题里跟底色有关的 CSS 变量当前值 —— 界面面板大多直接用它们，
          // 想「从根上」让界面透明就得先知道这几个值。
          themeVars: (() => {
            const out = {};
            try {
              const cs0 = csOf(doc2.documentElement) || {};
              const names = [
                "--dsw-alias-bg-base",
                "--dsw-alias-bg-elevated",
                "--dsw-alias-bg-layer",
                "--dsw-alias-bg-container",
                "--dsw-alias-bg-mask",
                "--dsw-alias-bg-popup",
                "--dsw-alias-border-l1",
                "--dsw-alias-border-l2"
              ];
              for (const n of names) {
                const v = cs0.getPropertyValue ? cs0.getPropertyValue(n) : "";
                if (v) out[n] = String(v).trim();
              }
            } catch (err) {
              out.error = String(err && err.message || err);
            }
            return out;
          })(),
          // 这次启动被清掉的不透明外壳容器（有这个动作壁纸才透得出来）
          clearedLayers: (() => {
            try {
              const out = [];
              const rootEl3 = doc2.getElementById("root");
              if (rootEl3 && typeof rootEl3.querySelectorAll === "function") {
                const list = rootEl3.querySelectorAll('[data-dshww-clear-bg="1"]');
                for (const n of list) {
                  out.push((n.id ? "#" + n.id : String(n.tagName || "?").toLowerCase()) + (n.className ? "." + String(n.className).split(/\s+/).slice(0, 2).join(".") : ""));
                }
              }
              return out;
            } catch (err) {
              return [];
            }
          })(),
          // 「壁纸被界面盖住」的定位器：在**整页**里找出盖住 ≥5% 屏、且带底色的元素，
          // 按面积从大到小排 —— 最上面那个大块就是糊住壁纸的元凶。
          opaqueLayers: (() => {
            const out = [];
            try {
              const rootEl2 = doc2.getElementById("root");
              if (!rootEl2) return [{ note: "\u6CA1\u6709 #root" }];
              const all = [];
              const collect2 = (node) => {
                if (!node) return;
                all.push(node);
                if (typeof node.querySelectorAll === "function") {
                  for (const n of node.querySelectorAll("*")) all.push(n);
                } else {
                  for (const c of node.children || []) collect2(c);
                }
              };
              collect2(doc2.body || doc2.documentElement);
              const vw2 = innerW || 1;
              const vh2 = innerH || 1;
              for (const node of all) {
                if (node.id === LAYER_ID || node.id === PETS_ID) continue;
                const cs = csOf(node) || {};
                const bg = String(cs.backgroundColor || "");
                const bi = String(cs.backgroundImage || "none");
                const hasBg = bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" || bi && bi !== "none";
                if (!hasBg) continue;
                const r = typeof node.getBoundingClientRect === "function" ? node.getBoundingClientRect() : null;
                const area = r ? r.width * r.height : 0;
                if (area < vw2 * vh2 * 0.01) continue;
                out.push({
                  el: (node.id ? "#" + node.id : String(node.tagName || "?").toLowerCase()) + (node.className ? "." + String(node.className).split(/\s+/).slice(0, 2).join(".") : ""),
                  areaPct: Number((area / (vw2 * vh2) * 100).toFixed(1)),
                  at: r ? `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}` : "?",
                  bg,
                  bgImage: bi === "none" ? "none" : bi.slice(0, 60),
                  cleared: node.getAttribute("data-dshww-clear-bg") === "1",
                  keepOpaque: node.getAttribute("data-dshww-keep-opaque") === "1",
                  opacity: cs.opacity,
                  z: cs.zIndex
                });
              }
              out.sort((a, b) => (b.areaPct || 0) - (a.areaPct || 0));
            } catch (err) {
              out.push({ error: String(err && err.message || err) });
            }
            return out.slice(0, 15);
          })(),
          probes
        };
        post(payload);
      } catch (err) {
        post({ tag, diagError: String(err && err.message || err), stack: String(err && err.stack || "").slice(0, 600) });
      }
    };
    send("client-mounted");
    const probeUrl = (() => {
      try {
        const raw = doc.documentElement.style.getPropertyValue("--dshww-canvas-image");
        const m = /url\(["']?(.*?)["']?\)/.exec(raw);
        return m ? m[1] : "";
      } catch (err) {
        return "";
      }
    })();
    const probe = new Image();
    probe.onload = () => {
      try {
        send("wallpaper-image-loaded " + probe.naturalWidth + "x" + probe.naturalHeight);
      } catch (err) {
      }
    };
    probe.onerror = () => {
      try {
        send("wallpaper-image-FAILED");
      } catch (err) {
      }
    };
    probe.src = probeUrl;
    const t2 = setTimeout(() => send("after-2s"), 2e3);
    if (t2 && typeof t2.unref === "function") t2.unref();
    const onKey = (ev) => {
      try {
        if (ev.altKey && ev.shiftKey && (ev.key === "D" || ev.key === "d")) send("manual-hotkey");
      } catch (err) {
      }
    };
    try {
      globalThis.addEventListener("keydown", onKey);
      setTimeout(() => {
        try {
          globalThis.removeEventListener("keydown", onKey);
        } catch (err) {
        }
      }, 12e4);
    } catch (err) {
    }
  }
  function keepInPlace(engine) {
    if (globalThis.__dshWhaleWallpaperKeep) return;
    globalThis.__dshWhaleWallpaperKeep = true;
    setInterval(() => {
      try {
        const doc2 = document;
        if (!doc2.body) return;
        for (const id of [LAYER_ID, PETS_ID, BAR_ID]) {
          const el = doc2.getElementById(id);
          if (el && !el.parentNode) doc2.body.appendChild(el);
        }
        engine.tick();
      } catch (err) {
      }
    }, 3e3);
  }
  function warn(err) {
    try {
      console.warn("[dsh-whale-wallpaper] " + err);
    } catch (err2) {
    }
  }

  // fufu-jump-DSH/src/client.js
  try {
    const config = typeof globalThis !== "undefined" && globalThis.__DSH_WHALE_WALLPAPER__ || {};
    injectWallpaper(config);
  } catch (err) {
    try {
      console.warn("[dsh-whale-wallpaper] \u521D\u59CB\u5316\u5931\u8D25\uFF1A", err);
    } catch (err2) {
    }
  }
})();

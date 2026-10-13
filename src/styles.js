/**
 * dsh-whale-wallpaper —— 页面侧样式
 *
 * 两层，互不干扰：
 *   #dshww-layer  壁纸层，position:fixed + z-index:-1，永远压在界面底下（只负责背景）
 *   #dshww-pets   挂件层，position:fixed + z-index 拉满、pointer-events:none；
 *                 只有角色身上那块判定区（.dshww-hit）打开 pointer-events，
 *                 所以能点能拖，角色四周的空白照旧穿透给界面。
 *
 * 挂件位置由物理算出像素坐标，直接写 transform: translate(x, y)，
 * 拖拽和重力共用同一套坐标，不会互相打架。
 */
export const STYLE_ID = 'dsh-whale-wallpaper-style'

// 挂件层：比 DSH 的浮层高一大截，但留点余量不顶到 2^31
export const PETS_Z = 2147482000

/**
 * 壁纸画在一个**真 `<img>`**（`.dshww-wallpaper`）里，不是 CSS 背景图。
 *
 * 两个原因（都踩过，别再改回去）：
 *  1. `body` 被外壳涂了不透明底色（ui-theme 的 `body{background-color:var(--dsw-alias-bg-base)}`），
 *     而 `z-index:-1` 的定位元素画在**元素背景之上、内容之下**，所以壁纸层会被 body 的底色盖住
 *     —— 这也是为什么必须先把 `html,body,#root` 的底色清成透明。
 *  2. 桌面端的页面在自定义协议 `dsh-app://app` 下，它的协议处理器会拒掉**带 Origin 头**的请求：
 *       if (origin !== null && origin !== 'dsh-app://app') return 403
 *     CSS background-image 的请求带 Origin → 图永远取不到（样式里明明有 url，画面上是空的，
 *     只在样式刚应用的一瞬间闪一下）；`<img>` 的请求不带 Origin → 正常。
 *
 * 变量：
 *   --dshww-canvas-size    cover / contain / 100% 100%（给 <img> 的 object-fit 用）
 *   --dshww-canvas-filter  brightness/blur
 *   --dshww-veil           压暗层颜色（由 #dshww-layer 里那个 div 承载）
 */
export const CANVAS_SIZE_VAR = '--dshww-canvas-size'
const CANVAS_FILTER_VAR = '--dshww-canvas-filter'

export function canvasCss() {
  return `
:root{ ${CANVAS_SIZE_VAR}:cover; ${CANVAS_FILTER_VAR}:none }
html, body{
  background-color:transparent !important;
  background-image:none !important;
  background-attachment:scroll !important;
}
/* 壁纸是 <img>（见 .dshww-wallpaper）；画布层只负责透明，不再放背景图 */
body{ filter:var(${CANVAS_FILTER_VAR}) }
`.trim()
}

export function stylesheet() {
  return `
.dshww-layer{
  position:fixed; inset:0; z-index:-1; overflow:hidden;
  pointer-events:none; user-select:none;
  background:none;
}
.dshww-layer[hidden]{ display:none !important }

/* 壁纸本体：真 <img>（不能用 CSS 背景图，原因见 wallpaper.js 里那段注释） */
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

/* 压暗层：铺在壁纸上、界面之下 */
.dshww-veil{ position:absolute; inset:0 }

.dshww-pets{
  position:fixed; inset:0; z-index:${PETS_Z};
  pointer-events:none; overflow:hidden;
  /* 挂件层里绝对不要有文字选择：拖玩偶时不该拉起框选 / 蓝色高亮 */
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

/* 同类对消：留一个"噗"的渐隐克隆，然后摘掉 */
.dshww-pet[data-dshww-pop="1"]{
  pointer-events:none !important;
  animation:dshww-vanish .32s ease-out forwards;
}
@keyframes dshww-vanish{
  0%   { opacity:1; filter:brightness(1.6) drop-shadow(0 0 12px rgba(255,255,255,.9)) }
  100% { opacity:0; filter:brightness(2.2) drop-shadow(0 0 26px rgba(255,255,255,0)); scale:1.35 }
}

/* 只有这一小块接收指针：比角色略小，尽量少挡界面 */
.dshww-hit{
  position:absolute; left:50%; top:50%;
  transform:translate(-50%,-50%);
  width:62%; height:78%;
  pointer-events:auto; cursor:grab; touch-action:none;
  user-select:none !important; -webkit-user-select:none !important;
  -webkit-user-drag:none; -webkit-touch-callout:none;
}
.dshww-pet[data-dragging="1"] .dshww-hit{ cursor:grabbing }

/* 拖动期间整页禁选，避免"框选"把界面文字也拉成蓝底 */
body[data-dshww-dragging="1"], body[data-dshww-dragging="1"] *{
  user-select:none !important; -webkit-user-select:none !important;
  cursor:grabbing !important;
}
body[data-dshww-dragging="1"] ::selection{ background:transparent }

/* 右下角操作条 */
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

/* 设置面板 */
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
/* 竖排按钮组（清零那一个就是竖着放的） */
.dshww-actions-vertical{ flex-direction:column; margin:4px 0 10px }
.dshww-actions-vertical .dshww-btn{ width:100%; padding:7px 12px; font-size:13px; opacity:.95 }
.dshww-field input[type=checkbox]{ width:16px; height:16px; accent-color:#4d6bfe; cursor:pointer }
.dshww-group{ margin:12px 0 2px; font-size:11px; letter-spacing:.06em; opacity:.55 }

@media (prefers-reduced-motion: reduce){
  .dshww-pet[data-spawn="1"] .dshww-anim{ animation:none }
}
`.trim()
}

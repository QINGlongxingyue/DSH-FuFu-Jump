/**
 * 真·CSS 选择器命中验证：用下载下来的小鲸鱼挂件脚本建一个真实 DSH 风格的页面，
 * 然后问浏览器「`.dshwv-root .dshwv-bshape` 能不能选中那个 SVG 泡」。
 *
 * 用无头 Edge 跑，比在 Node 里字符串比对可靠得多。
 */
import fs from 'node:fs'
import path from 'node:path'

const OUT = 'C:/Users/Starfarer/Desktop/game/DSHsudio/tools/probe/whale-sel'
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

// 复刻小鲸鱼真实的 DOM 结构（从它的源码里抄的结构）
const html = `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  /* 小鲸鱼自己注入的样式（关键部分，照抄它的规则） */
  .dshwv-root{position:fixed;right:20px;bottom:20px;width:300px;height:205px;z-index:2147483000}
  .dshwv-pop{position:absolute;left:0;top:0;width:100%;aspect-ratio:1026/700;pointer-events:none;z-index:1}
  .dshwv-pop, html .dshwv-pop svg{background:transparent !important;border:0 !important}
  .dshwv-text{position:absolute;left:44.25%;top:36%;width:66%;height:64%;transform:translate(-50%,-50%);
    display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
    color:#536ba9;line-height:1.15;pointer-events:none}
  .dshwv-amount{font-size:28px;font-weight:800}
  .dshwv-label{font-size:14px;font-weight:600}
  .dshwv-hint{font-size:12px;color:#9fb0d9}
  /* 背景放个绿色模拟草地壁纸，方便看对比 */
  body{margin:0;background:#4e8a3a}
</style>
<style data-plugin="dsh-whale-widget">/* 它自己的第二张表，带 data-plugin */</style>
</head>
<body>
<!-- 照它源码的结构：root > (pop > svg > bshape/b1/b2) + text -->
<div class="dshwv-root">
  <div class="dshwv-pop dshwv-pop-open">
    <svg viewBox="0 0 1026 700" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <path class="dshwv-bshape" fill="#FFFFFF" stroke="#203170" stroke-width="18"
        d="M 827 248 A 373 232 0 1 0 81 246 A 373 232 0 0 0 301 465 A 57 32 10 0 0 413 484 A 373 232 0 0 0 827 248 Z"/>
      <ellipse class="dshwv-b1" cx="352" cy="561" rx="37.5" ry="26" fill="#FFFFFF" stroke="#203170" stroke-width="18"/>
      <ellipse class="dshwv-b2" cx="442" cy="646" rx="24.5" ry="18" fill="#FFFFFF" stroke="#203170" stroke-width="18"/>
    </svg>
  </div>
  <div class="dshwv-text">
    <div class="dshwv-label">DeepSeek 余额</div>
    <div class="dshwv-amount">88.88</div>
    <div class="dshwv-hint">今日已用 1.23</div>
  </div>
</div>
<script>
// 页面里注入「本插件的样式」，内容和 whaleBubbleCss('translucent') 产出一致
const style = document.createElement('style')
style.id = 'probe-style'
style.textContent = \`.dshwv-root .dshwv-bshape,
.dshwv-root .dshwv-b1,
.dshwv-root .dshwv-b2 {
  fill: rgba(255, 255, 255, .78) !important;
  fill-opacity: 1 !important;
}\`
document.head.appendChild(style)

const shape = document.querySelector('.dshwv-bshape')
const cs = getComputedStyle(shape)
const report = {
  selectorMatched: !!shape,
  querySelectorAllCount: document.querySelectorAll('.dshwv-root .dshwv-bshape, .dshwv-root .dshwv-b1, .dshwv-root .dshwv-b2').length,
  oldSelectorCount: document.querySelectorAll('#dsh-whale-widget .dshwv-bshape').length,
  computedFill: cs.fill,
  computedFillOpacity: cs.fillOpacity,
  hasWhaleId: !!document.getElementById('dsh-whale-widget'),
  rootClass: document.querySelector('.dshwv-root') ? 'ok' : 'missing',
}
document.title = 'RESULT:' + JSON.stringify(report)
</script>
</body></html>`

const file = path.join(OUT, 'probe.html')
fs.writeFileSync(file, html, 'utf8')
console.log('已生成', file)

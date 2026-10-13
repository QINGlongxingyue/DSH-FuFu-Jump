# dsh-whale-wallpaper

DSH 界面插件：把聊天界面的底色换成草地壁纸，并在最前层放两只**有物理的鲸鱼娘挂件** —— 会掉、会弹、会被你拖着甩出去，两只撞上还会像台球一样分裂。

动图素材是从 `dt (1).mp4` / `dt (2).mp4`（1920×1080、30fps、64 帧、纯黑底）转出来的透明 GIF / 动画 WebP。

> 交接必读：[进度台账.md](../进度台账.md) —— 里面记了没解决的问题、踩过的坑、复现命令。

## 现在的功能

- 🖼️ **壁纸替换**：画在**画布层**（`html`/`body` 的背景），界面自己的底色被改成透明，壁纸从下面透出来；**设置里可以关**
- 🧸 **物理挂件**：重力、落地弹跳（速度衰减到阈值以下就停稳）、空气阻力、地面摩擦、撞左右墙反弹、上边界反弹
- 🖐️ **可拖动**：按住角色拖走，松手把手甩出来的速度交给物理；位置记在 `localStorage['dshww-pos']`
  - 拖动期间整页禁选（`body[data-dshww-dragging="1"]`），并且 pointerdown / pointermove 每次都清一次选区，
    所以**不会唤起框选、也不会出现蓝色高亮**
- 🎱 **台球式分裂**：两只横向撞上、且是相向而来时，**各弹出一份新的**；
  用每只的冷却时间（`splitCd`，0.35~0.6s）限制频率，所以能一路裂到上限
  - ⚠️ 判「是否相向」必须在**交换速度之前**算，否则相对速度已经归零、条件永远不成立
  - ⚠️ 分裂逻辑里**不要**再放「一只只裂一次」的布尔锁，否则第一次裂完 4 个就再也不裂了（这两个坑都踩过）
- 💥 **同类对消（玩法）**：数量**到达上限并保持 `eliminateDelay` 秒（默认 10s）**之后，
  每 `eliminateInterval` 秒（默认 2s）消掉**一对同种**布偶（同种 = 同一张动图 `src`），
  消掉时留一个渐隐的「噗」特效。空出名额后又能继续撞、继续裂 —— 数量在上限附近来回呼吸，不会死锁在满员
  - 挑的是**距离最近**的那一对，看着最像「碰在一起消掉了」
  - 手上**正拖着**的那只不会被消（免得突然从手里消失）
- ⚙️ **设置面板**（右下角「设置」）：
  - 最上面是**竖排的清零按钮**（角上的清零已经移进面板）
  - **显示壁纸**勾选框、**界面通透**档位下拉（0/1/2/3，改完立刻生效）
  - 数量上限 / 清零后回到 / 重力 / 落地反弹 / 撞墙反弹 / 停稳阈值 / 分裂冲量 / 碰撞冷却 / 满员多久后对消 / 对消间隔 / 空气阻力 / 地面摩擦 / 上边界 / 下边界
  - 底部：保存 / 恢复默认
- 📊 右下角实时显示 `当前数量/上限`

## 界面上的东西

| 位置 | 元素 | 说明 |
|---|---|---|
| **壁纸 img** | `#dshww-layer > img.dshww-wallpaper` | 壁纸本体是**真 `<img>`**（原因见下），`z-index:-1` 那一层里 |
| 全屏底层 | `#dshww-layer` | 装壁纸 `<img>` + 压暗层，`z-index:-1`，不接收指针 |
| 全屏最前层 | `#dshww-pets` | `z-index: 2147482000`、`pointer-events:none`；只有角色身上那块判定区 `.dshww-hit` 接收指针 |
| 右下角 | `#dshww-bar` | 计数 / 设置（清零已经移进设置面板，竖排） |
| 右下角上方 | `#dshww-panel` | 设置面板（打开时物理会冻结，方便调参） |

### 为什么壁纸必须是 `<img>`，不能是 CSS 背景图（踩过的坑）

两个原因，都别再改回去：

1. `body` 被外壳涂了不透明底色（ui-theme 的 `body{ background-color: var(--dsw-alias-bg-base) }`），
   而 `z-index:-1` 的定位元素画在「元素背景之上、内容之下」—— 壁纸层会被 body 的底色盖住。
   所以必须先把 `html, body, #root, #root > div` 的底色清成透明。
2. **桌面端页面在自定义协议 `dsh-app://app` 下**，外壳的协议处理器里写着：
   ```js
   const origin = request.headers.get('origin')
   if (origin !== null && origin !== 'dsh-app://app') return new Response(null, { status: 403 })
   ```
   CSS `background-image` 的请求**带 `Origin` 头** → 被这条挡掉，图永远取不到
   （症状：计算样式里明明有 `url(...)`，画面上是空的，只在样式刚应用那一瞬间闪一下）。
   `<img>` 的图片请求**不带 `Origin`** → 畅通（挂件一直正常就是这个原因）。

所以壁纸是 `.dshww-wallpaper` 这个 `<img>`，用 `object-fit: var(--dshww-canvas-size)` 控制铺法。
自检回传里会带上它的 `src / hidden / complete / 原生尺寸`，一眼能看出图有没有解码成功。

## 设置项

存在 `$DSH_HOME/.dshw-wallpaper-settings.json`（结构 `{ "physics": { ... } }`），也可以直接打宿主接口：

```
GET  /dsh-whale-wallpaper/settings.json            -> { ok, physics, defaults, path }
POST /dsh-whale-wallpaper/settings.json            body: { "physics": { ... } } 保存
POST /dsh-whale-wallpaper/settings.json            body: { "reset": true }      恢复默认
```

| 字段 | 默认 | 说明 |
|---|---|---|
| `wallpaper` | `true` | 壁纸开关（设置面板里那个勾选框） |
| `uiClearLevel` | 3 | 界面通透档位：0 不动界面 / 1 只透大面板 / 2 连小块一起透 / 3 全透 |
| `maxPets` | 10 | 分裂出来最多这么多 |
| `seedCount` | 2 | 清零/复位后回到几个 |
| `gravity` | 1400 | 重力 px/s² |
| `bounce` | 0.62 | 落地反弹系数 |
| `wallBounce` | 0.78 | 撞墙反弹系数 |
| `minBounce` | 60 | 竖直速度低于它就判定停稳 |
| `splitImpulse` | 240 | 分裂时新挂件拿到的初速度 |
| `splitCooldown` | 2 | **分裂冷却（秒）**：撞裂一次之后要过这么久才允许再裂 |
| `eliminateDelay` | 10 | **同类对消**：数量满员并保持这么久（秒）之后开始消 |
| `eliminateInterval` | 2 | **同类对消**：每这么久（秒）消掉一对同种布偶 |
| `friction` | 0.995 | 空气阻力（每帧衰减） |
| `groundFriction` | 0.86 | 贴地时的水平摩擦 |
| `ceiling` | 0.02 | 上边界（视口高度百分比） |
| `floor` | 1.02 | 下边界；**大于 1** 是因为动图底部自带约 4% 空白，让元素的底沉到屏幕外，脚底才正好在地平线上 |

## 素材是怎么转的（别踩这些坑）

脚本 `tools/mp4_to_anim.py`：

- ❌ 不用 ffmpeg 的 `colorkey`：源视频边缘是抗锯齿过渡，键掉「接近黑」会留下灰白过渡像素，贴浅底就是白边
- ❌ 不用 ffmpeg 的 `scale=...:flags=lanczos` 缩这套素材：纯黑底 + 亮边会 ringing（过冲），边缘冒出一圈浅色 —— 「白边」的第二个来源
- ✅ ffmpeg 只 `crop`，缩放交给 Pillow 的 LANCZOS
- ✅ `alpha = 亮度线性映射`（`FLOOR=0.035` 全透明、`CEIL=0.075` 全不透明），RGB 保持原样（视频本就是角色在黑底上的 sRGB 合成，等价 premultiplied），任何底色下融合都正确
- ✅ GIF 用**一张全局调色板**（255 色，只统计不透明像素），索引 0 = 透明。⚠️ 别写逐像素找最近色的 LUT，慢到 380 秒
- 裁框 `(600,195)-(1320,875)`：**底部不能留黑边**，否则角色被顶出可视区

重新构建页面半侧（改了 `src/` 必须跑，否则 `lib/client.js` 还是旧的）：

```powershell
$root='C:\Users\Starfarer\Desktop\game\DSHsudio\dsh-whale-wallpaper'
& 'C:\Users\Starfarer\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe' `
  "$root\node_modules\esbuild\bin\esbuild" "$root\src\client.js" `
  --bundle --format=iife --target=chrome110 --outfile="$root\lib\client.js" --legal-comments=none
```

## 自检

```powershell
$n='C:\Users\Starfarer\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
& $n tools\smoke-host.mjs  dsh-whale-wallpaper\lib\index.js   # 路由/注入行/设置读写与夹取
& $n tools\smoke-client.mjs dsh-whale-wallpaper\lib\client.js # 分层/重力下落/停稳/分裂/上限/拖动/面板/清零/幂等
```

两个测试都自带假 DOM / 假 ctx，不需要浏览器。
写这类测试时注意：**不要缓存 `api` 和 DOM 节点**（重挂会换新），物理推进用 `api.debugStep(dt)`。

## 排查用的东西

- 宿主自检日志：`$DSH_HOME/.dshw-wallpaper.log`（`apply()` 第一行就写；**它不存在就说明宿主根本没加载这个插件**）
- **页面自检回传**：`$DSH_HOME/.dshw-wallpaper-client.log`
  页面在挂载后、壁纸图片解码后、2 秒后各回传一次，内容是浏览器里**实际算出来的**样式：
  `body`/`html`/`#root` 的 `background-color`、`background-image`、`z-index`，画布变量，各层几何，壁纸图片是否解码成功。
  宿主每次启动先写一条「宿主启动，等待页面回传」，15 秒后追加结论：
  - `收到 N 条页面回传，注入行与 client.js 都正常`
  - `一条回传都没收到：注入行很可能没被执行，或者 client.js 没加载成功`

  手动触发：窗口里按 `Alt+Shift+D`。
- 独立预览页：`preview/index.html`（真 assets + 真 client.js，`?debug=1` 描边、`?note=0` 收提示条）
- 官方桌面端挂掉时的诊断：`%APPDATA%\@deepseek-ai\dsh-desktop\logs\crash-*-host.log`

## 结构

```
dsh-whale-wallpaper/
├── package.json          dsh.bundle.patch -> cordis.patch.yml
├── cordis.patch.yml      挂载声明 + 界面配置（物理参数不在这里，见上）
├── lib/index.js          宿主半侧：资源路由 / index 注入 / 设置读写 / 自检日志
├── lib/client.js         esbuild 产物（IIFE），别手改
├── src/client.js         入口
├── src/wallpaper.js      全部逻辑：分层、物理引擎、拖动、设置面板
├── src/styles.js         CSS + 类名约定
├── preview/              独立预览页
└── assets/               wallpaper.jpg + whale-dance-{1,2}.{webp,gif}
```

## 已知边界

- **桌面端要完全退出（含托盘）再打开**才会加载新插件；只刷新页面不够
- 界面透明化目前只覆盖 `html, body, #root, #root > div`。如果哪天 DSH 把底色画在更深的元素上，要往 `src/wallpaper.js` 的 `UI_TRANSPARENT_CSS` 里补选择器
- 物理是「每帧一步」的简单积分，极端参数（重力 4000 + 弹跳 1）下会抖，属正常
- `prefers-reduced-motion: reduce` 时只关掉新挂件的弹出动画，物理照常（要完全静止得自己把重力调 0）

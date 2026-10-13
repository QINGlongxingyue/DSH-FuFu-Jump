# DSH-FuFu-Jump · 鲸鱼娘草地蹦跳壁纸

给 **DeepSeek Harness（DSH）桌面端**做的一个界面插件：把界面背景换成草地壁纸，再让两只鲸鱼娘立绘在草地上蹦跶、能拖能撞、会分裂也会对消。

> 插件在 DSH 里是一个 **bundle（bundle patch + Host 插件 + Client 脚本）**，这个仓库就是它的正式包：
> `package.json` 里的 `dsh.bundle.patch` 指向 `cordis.patch.yml`，DSH 启动时按这个把插件叠进当前 profile。
>
> 仓库：<https://github.com/QINGlongxingyue/DSH-FuFu-Jump> （npm 包名是 `fufu-jump-dsh`，小写连字符按惯例）

---

## 效果

| 功能 | 说明 |
|---|---|
| 🖼️ **壁纸** | 草地壁纸铺满整个界面；界面自己的白底被让开，壁纸从下面透出来 |
| 🧸 **物理挂件** | 重力、落地弹跳、空气阻力、地面摩擦、撞墙反弹 |
| 🖐️ **拖动** | 按住角色拖走，松手把甩出来的速度交给物理；位置会记住 |
| 🎱 **台球式分裂** | 两只横向撞上、且相向而来时各弹出一份新的，一路能裂到上限 |
| ⏸️ **满员后停分裂** | 数量到达上限就**停 2 分钟**不许再裂（`splitPause`，默认 120s，可调） |
| 💥 **同类对消** | 满员保持 10 秒后，每 2 秒消掉一对**同种**布偶（带渐隐特效），空出名额继续裂 |
| 🌙 **挂机奖励** | 连续 2 分钟没碰键鼠，就落一只新布偶 |
| 🐋 **顺手通透小鲸鱼** | 把「DeepSeek 余额小鲸鱼」插件那个白色气泡也通透掉（见下） |
| ⚙️ **设置面板** | 右下角「设置」：清零（竖排在顶部）、壁纸开关、界面通透档位、全套物理参数 |

拖动时**不会唤起框选、也不会有蓝色高亮**（`user-select:none` + 主动清选区 + 拖动期间整页禁选）。

### 关于「顺手通透小鲸鱼气泡」

如果你同时装了 **`dsh-whale-widget`**（DeepSeek 余额小鲸鱼），它那个余额气泡的白底**不在 CSS 里** ——
气泡是 SVG 画的，标记写死了 `fill="#FFFFFF"`：

```html
<path class="dshwv-bshape" fill="#FFFFFF" stroke="#203170" .../>
<ellipse class="dshwv-b1" ... fill="#FFFFFF" .../>
<ellipse class="dshwv-b2" ... fill="#FFFFFF" .../>
```

SVG 的 `fill` 是**表现属性**（优先级最低），所以本插件用 CSS 压过它：

```css
#dsh-whale-widget .dshwv-bshape,
#dsh-whale-widget .dshwv-b1,
#dsh-whale-widget .dshwv-b2 { fill: transparent !important; fill-opacity: 0 !important; }
```

描边留着 —— 不然半透明底上那行深色余额数字没有边界，看着发飘。

**副作用要知道**：用了气泡的另外两个子元素（`.dshwv-b1` 和 `.dshwv-b2`）在它内部另有用途，
如果它在别处也复用这两个类，那几处也会跟着变透明。不想要这个效果，把 `src/wallpaper.js` 里
`UI_TRANSPARENT_CSS` 末尾那段规则删掉重新打包即可。

---

## 安装

### 前提

DSH 桌面端已安装。插件装进当前 **profile**（桌面端用的是 `desktop`）。

### 方式 A：命令行安装（推荐）

1. 先把本仓库 clone 到本地任意目录：

   ```bash
   git clone https://github.com/QINGlongxingyue/DSH-FuFu-Jump.git
   ```

2. 在 DSH 桌面端里点 **「管理 dsh 命令…」**，把官方 `dsh` CLI 注册到 PATH。

3. 用 `dsh` 装这个包（路径换成你 clone 下来的目录）：

   ```bash
   dsh plugin --profile desktop add "C:\path\to\fufu-jump-DSH"
   ```

4. **完全退出桌面端（含系统托盘里的图标）再重新打开。**
   profile 的插件组合只在启动时收集一次，不彻底退出不会生效。

### 方式 B：桌面端界面安装

桌面端设置里有插件管理页，可以直接从本地目录/bundle 安装，选到本仓库目录即可。装完同样要**完全退出重开**。

### 装完怎么确认生效

打开桌面端，界面背景应该变成草地，右下角出现「数量/上限」和「设置」按钮。
如果没变化，看这个日志：

```
%USERPROFILE%\.dsh\.dshw-wallpaper.log          ← 宿主侧：路由注册、设置读写
%USERPROFILE%\.dsh\.dshw-wallpaper-client.log   ← 页面侧自检：壁纸有没有解码出来、界面有没有被清透明
```

---

## 设置

右下角点 **「设置」**：

- **清零**（最上面，竖排按钮）—— 数量回到默认的 2 个
- **显示壁纸** —— 勾掉就只留挂件，不动界面
- **界面通透** —— 让 DSH 的界面有多透明：`3 全透`（默认）/ `2 连小块一起透` / `1 只透大面板` / `0 不动界面`
- **数量上限 / 清零后回到 / 重力 / 落地反弹 / 撞墙反弹 / 停稳阈值 / 分裂冲量 / 碰撞冷却 / 满员后停分裂 / 满员多久后对消 / 对消间隔 / 挂机多久加一只 / 空气阻力 / 地面摩擦 / 上边界 / 下边界**
- 底部：**保存**（落盘）/ **恢复默认**

物理参数存在 `$DSH_HOME/.dshw-wallpaper-settings.json`，界面配置在 `cordis.patch.yml` 里。

完整参数表见 [`README-full.md`](README-full.md)。

---

## 项目结构

```
fufu-jump-DSH/
├── package.json          # DSH bundle 清单（dsh.bundle.patch 指到下面的 patch）
├── cordis.patch.yml      # 挂载声明 + 界面配置（壁纸、压暗、通透、角色）
├── lib/
│   ├── index.js          # Host 半侧：HTTP 路由（壁纸/素材/client.js/设置/自检）、设置文件读写
│   └── client.js         # Client 半侧：esbuild 打包产物（由 src/ 生成，已入库）
├── src/
│   ├── client.js         # 入口
│   ├── wallpaper.js      # 壁纸层、物理引擎、拖动、设置面板、自检回传
│   └── styles.js         # 注入的样式表
└── assets/
    ├── wallpaper.jpg                  # 壁纸
    ├── whale-dance-1.webp / .gif      # 鲸鱼娘·顶盆（动画）
    ├── whale-dance-2.webp / .gif      # 鲸鱼娘·蕾丝（动画）
    └── grassland-wallpaper-1920x1080.png  # 壁纸原图
```

媒体素材用 **WebP**（默认，体积小、支持透明）；GIF 是给不支持 WebP 的场合的备选，
换用只需把 `cordis.patch.yml` 里的 `src:` 改成对应的 `.gif`。

---

## 开发

改 `src/` 之后要重新打包 `lib/client.js`：

```bash
npm install          # 只有 esbuild 一个开发依赖
npm run build
```

`lib/index.js` 是手写的，不需要构建。

### 媒体素材怎么来的

两个 mp4（原始录屏）转成带透明通道的动图，流程写在 [`docs/media-pipeline.md`](docs/media-pipeline.md)，
含踩过的坑（ffmpeg `colorkey` 会留白边、`flags=lanczos` 会振铃，所以改用亮度掩膜 + Pillow LANCZOS）。

---

## 已知坑（都踩过，改代码前先看）

1. **壁纸必须是 `<img>`，不能是 CSS 背景图。**
   桌面端页面在自定义协议 `dsh-app://app` 下，外壳的协议处理器会拒掉**带 `Origin` 头**的请求
   （`if (origin !== null && origin !== 'dsh-app://app') return 403`）。
   CSS `background-image` 的请求带 `Origin` → 图永远取不到（样式里明明有 `url(...)`，画面上是空的）；
   `<img>` 的请求不带 `Origin` → 正常。

2. **`body` 自己有不透明底色**（`body{background-color:var(--dsw-alias-bg-base)}`），
   而 `z-index:-1` 的定位元素画在「元素背景之上、内容之下」，所以必须先把外壳底色清成透明。

3. **界面是异步上色的**：挂载那一刻各面板往往还没底色，得用 `MutationObserver` 盯着树一直补扫，
   只在挂载时扫一次会漏掉（症状：对话栏透了、侧栏还是白板）。

4. **CSS 自定义属性只往子代继承**。设在 `<style>` 元素自己身上，`html`/`body` 拿不到，
   `background-image: var(...)` 会算成 `none`。

5. **分裂判「是否相向」必须在交换速度之前算**，交换完相对速度就归零了，条件永远不成立。

6. **分裂不要用「一只只裂一次」的布尔锁**，两边都锁上之后就再也不裂了（症状：停在 4 个）。
   用冷却时间（`splitCooldown`）控制频率，而且要**全局锁**一次只裂一对，
   否则玩偶一多会「一瞬间召唤一大堆」。

---

## 维护者：怎么把改动推上去

**这台开发机上 git 推不了**：git 的 TLS 走 Windows schannel 会握手失败
（`schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS`），
而且它在这个受限环境里连信号管道都建不了（`couldn't create signal pipe, Win32 error 5`）。

但 **Node 的 `fetch`（自带 OpenSSL）到 `api.github.com` 是通的**，所以走 REST API 推：

```powershell
pwsh -File tools/push-to-github.ps1
```

脚本会：

1. 扫一遍当前目录（跳过 `node_modules`、`.git`），列出待上传文件
2. 安全提示你粘贴一个 GitHub Personal Access Token
   （经典 token 勾 `repo`；fine-grained token 勾 **Contents: Read and write**）
3. 走 Git Data API：逐个上传 blob → 建 tree（`base_tree` 保留未提及的文件）→ 建 commit → 更新 `main`
4. 打印 commit 链接

Token 只存在内存里，不写任何文件；推完自动从环境变量里清掉。

自检方式（不推送、只验证认证路径）：

```powershell
$env:GH_TOKEN='假的'; node tools/push-to-github.mjs 某个payload.json
# 预期: token 无效或没权限: HTTP 401 Bad credentials
```

> ⚠️ 这个 API 上传方式**不需要**本地 git 仓库，`.git` 只是给本地留个历史。

### 关于包名和仓库名不一致

`package.json` 里的 `name` 是 **`fufu-jump-dsh`**（npm 包名按惯例全小写连字符），
而仓库叫 `DSH-FuFu-Jump`。这没问题 —— 安装时用目录路径或包名都行，DSH 按路径解析。

想统一的话：把 `package.json` 的 `name` 改成 `DSH-FuFu-Jump`（npm 不允许大写，所以只能改仓库名），
或者干脆保持现状。

---

## 许可

代码 MIT，见 [LICENSE](LICENSE)。

壁纸与角色素材的来源与授权见 [`PROVENANCE.md`](PROVENANCE.md)。

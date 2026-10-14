# DSH-FuFu-Jump

一个 DSH 桌面端的**恶趣味界面插件**：把界面背景换成草地壁纸，再放两只鲸鱼娘立绘在窗口里物理乱跳。

能拖、能撞、会分裂、会同种对消，挂机还会自己下崽。

> 正经说明：插件在 DSH 里是一个 **bundle**（bundle patch + Host 插件 + Client 脚本）。
> `package.json` 的 `dsh.bundle.patch` 指向 `cordis.patch.yml`，DSH 启动时按它把插件叠进当前 profile。
>
> 仓库：<https://github.com/QINGlongxingyue/DSH-FuFu-Jump>（npm 包名 `fufu-jump-dsh`）

![效果](assets/wallpaper.jpg)

---

## 功能

| 功能 | 说明 |
|---|---|
| 🖼️ **壁纸替换** | 草地壁纸铺满界面；DSH 自己的底色被让开，壁纸从下面透出来，可在设置里关 |
| 🧸 **物理挂件** | 重力、落地弹跳、空气阻力、地面摩擦、撞墙反弹、上边界反弹 |
| 🖐️ **拖动** | 按住角色拖走，松手把甩出的速度交给物理；位置记在 `localStorage` |
| 🎱 **台球式分裂** | 两只横向相向撞上时各弹出一份新的，可一路裂到数量上限 |
| ⏸️ **满员停分裂** | 到达上限后停 2 分钟不再分裂（`splitPause`，可调） |
| 💥 **同类对消** | 满员保持 10 秒后，每 2 秒消掉一对同种布偶（按素材 `src` 判定），带渐隐特效 |
| 🌙 **挂机奖励** | 连续 2 分钟无键鼠操作，落一只新布偶 |
| 🐋 **余额气泡通透** | 顺手把 `dsh-whale-widget` 那个白色余额气泡也做透明（见下） |
| ⚙️ **设置面板** | 右下角「设置」：清零、壁纸开关、界面通透档位、全套物理参数 |

拖动时**不会唤起框选、也不会出现蓝色高亮**。

### 关于余额气泡通透

同时装了 `dsh-whale-widget`（DeepSeek 余额小鲸鱼）时，它那个余额气泡的白底**不在 CSS 里** ——
气泡是 SVG 画的，标记里写死了 `fill="#FFFFFF"`：

```html
<path class="dshwv-bshape" fill="#FFFFFF" stroke="#203170" .../>
<ellipse class="dshwv-b1" ... fill="#FFFFFF" .../>
<ellipse class="dshwv-b2" ... fill="#FFFFFF" .../>
```

SVG 的 `fill` 是**表现属性**（优先级最低），所以本插件用 CSS 覆盖它：

```css
#dsh-whale-widget .dshwv-bshape,
#dsh-whale-widget .dshwv-b1,
#dsh-whale-widget .dshwv-b2 { fill: transparent !important; fill-opacity: 0 !important; }
```

描边保留，否则半透明底上的深色余额数字没有边界。

不想要这个效果，把 `src/wallpaper.js` 里 `UI_TRANSPARENT_CSS` 末尾那段删掉重新打包即可。

---

## 安装

1. 克隆仓库：

   ```bash
   git clone https://github.com/QINGlongxingyue/DSH-FuFu-Jump.git
   ```

2. 在 DSH 桌面端里点 **「管理 dsh 命令…」**，把官方 `dsh` CLI 注册到 PATH。

3. 安装（路径换成实际克隆位置）：

   ```bash
   dsh plugin --profile desktop add "C:\path\to\DSH-FuFu-Jump"
   ```

4. **完全退出桌面端（含系统托盘图标）再重新打开。**
   profile 的插件组合只在启动时收集一次，不彻底退出不会生效。

### 排查

```
%USERPROFILE%\.dsh\.dshw-wallpaper.log         宿主侧：路由注册、设置读写
%USERPROFILE%\.dsh\.dshw-wallpaper-client.log  页面侧自检：壁纸是否解码、界面是否透明
```

界面上按 **Alt+Shift+D** 可手动触发一次自检回传。

---

## 设置

右下角「设置」面板：

| 项目 | 默认 | 说明 |
|---|---|---|
| 清零 | — | 数量回到 `seedCount`（面板最上面，竖排按钮） |
| 显示壁纸 | 开 | 勾掉只保留挂件 |
| 自动生成壁纸 | 开 | **关掉就不显示自带的那张默认壁纸**（自定义壁纸、配置里指定的照常显示） |
| 自定义壁纸 | — | **选一张本地图片当壁纸**；存在本机浏览器（上限 4 MB），「清除」回默认 |
| 界面通透 | 3 | 3 全透 / 2 连小块一起透 / 1 只透大面板 / 0 不动界面 |
| 数量上限 | 10 | 分裂出来的最多几只 |
| 清零后回到 | 2 | 清零/复位后的数量 |
| 重力 / 落地反弹 / 撞墙反弹 / 停稳阈值 | 1400 / 0.62 / 0.78 / 60 | 手感 |
| 分裂冲量 / 碰撞冷却 | 240 / 2s | 分裂力度与频率 |
| 满员后停分裂 | 120s | 到上限后暂停分裂的时长 |
| 满员多久后对消 / 对消间隔 | 10s / 2s | 同类对消节奏 |
| 挂机多久加一只 | 120s | 设 0 关闭 |
| 空气阻力 / 地面摩擦 / 上边界 / 下边界 | 0.995 / 0.86 / 0.02 / 1.02 | 更细的调参 |

物理参数存在 `$DSH_HOME/.dshw-wallpaper-settings.json`；界面配置在 `cordis.patch.yml`；
**自定义壁纸存在浏览器 `localStorage`**（`dshww-custom-wallpaper`，base64 data URL），
所以只对本机本浏览器有效，换机器要重新选一次。

### 「自动生成壁纸」和「自定义壁纸」的关系

- `自动生成壁纸` 关掉 = **不显示插件自带的那张默认壁纸**（`assets/wallpaper.jpg`）
- 这两种情况照常显示，不受该开关影响：
  1. 你在设置里选了**自定义壁纸**
  2. `cordis.patch.yml` 里把 `wallpaper:` 改成了非默认路径（自己指定了图）
- 想让插件完全不碰背景，用 `显示壁纸` 那个开关

---

## 结构

```
package.json          DSH bundle 清单（dsh.bundle.patch 指向下方 patch）
cordis.patch.yml      挂载声明 + 界面配置（壁纸、压暗、通透、角色）
lib/index.js          Host 半侧：HTTP 路由、设置文件读写、自检日志
lib/client.js         Client 半侧：esbuild 打包产物（由 src/ 生成，已入库）
src/                  页面侧源码
assets/               壁纸 + 两只鲸鱼娘的动图
docs/                 安装验证记录、素材转换流程
```

素材默认使用 **WebP**（体积小、支持透明）。想换 GIF，改 `cordis.patch.yml` 里对应角色的 `src:` 即可。

---

## 开发

```bash
npm install
npm run build      # 改完 src/ 需要重新打包 lib/client.js
```

`lib/index.js` 是手写的，不需要构建。

### 推送（本机 git 不可用时）

仓库自带一个走 GitHub REST API 的推送脚本，不依赖本地 git：

```powershell
pwsh -File tools/push-to-github.ps1
```

凭据优先从 `~/.git-credentials` 读取，读不到才提示手动输入。脚本内含网络重试
（连接超时与 5xx 都会重试）。

---

## 已知坑

改代码前建议先看这几条，都是实际踩过的：

1. **壁纸必须是 `<img>`，不能用 CSS 背景图。**
   桌面端页面运行在自定义协议 `dsh-app://` 下，外壳会拒绝携带 `Origin` 头的请求。
   CSS `background-image` 的请求带 `Origin`，`<img>` 的不带 ——
   用背景图会出现「计算样式里有 `url(...)`，屏幕上却是空的」。

2. **DSH 自己的弹窗和设置面板不能一起清成透明**，否则插件列表糊在壁纸上无法阅读。
   代码按 `role="dialog"` / `aria-modal="true"` / 全屏 `backdrop-filter` 遮罩识别它们
   （样式类名带构建期 hash，写死会失效）。

3. **界面底色是异步刷上去的**，挂载时扫描一次会漏，需要用 `MutationObserver` 持续补扫。

4. **CSS 自定义属性只向子代继承**，设在 `<style>` 元素自己身上，`html`/`body` 取不到。

5. **分裂判定要在交换速度之前进行**，交换完相对速度已归零，条件永远不成立。

6. **分裂不能用「每只只裂一次」的布尔锁**，两侧上锁后就不再分裂（症状：停在 4 只）。
   应使用冷却时间，并且用**全局锁**保证一次只裂一对，否则挂件一多会瞬间大量增殖。

---

## 许可

代码 MIT，见 [LICENSE](LICENSE)。

角色形象与壁纸素材的授权**不在 MIT 范围内**，见 [PROVENANCE.md](PROVENANCE.md)。
如需商用请自行替换素材（改 `cordis.patch.yml` 的 `src:`）。

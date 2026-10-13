# 安装与验证记录

这份记录说明「这个包怎么装进 DSH」以及「装完怎么确认它真的在跑」。
结论写在前：**包格式已按 DSH 官方 bundle 规范做好**，但本机当时**没能把仓库推上去**
（机器上没有 git、GitHub 的 TLS 握手也失败），所以推送那一步需要你在自己环境里做。

---

## 包格式对不对？对照官方规范

DSH 官方的插件开发文档（`@deepseek-ai/dsh-agent-preset/skills/cordis-plugin-development`）要求：

| 要求 | 本仓库 |
|---|---|
| `package.json` 里 `dsh.bundle.patch` 指向 bundle patch | ✅ `"patch": "./cordis.patch.yml"` |
| patch 文件用 loader 方言声明挂载行 | ✅ `- insert:` 一行 |
| Host 半侧导出插件（`main` 指向 `lib/index.js`） | ✅ `lib/index.js`（ESM，默认导出 `apply`） |
| Client 半侧脚本由 Host 经 HTTP 路由提供 | ✅ `lib/client.js`，路由 `/<插件名>/client.js` |
| 素材随包发布 | ✅ `assets/`，`files` 字段已列全 |
| 显示元数据 / 图标 / 安装语义 | 见 `package.json` 的 `description` / `keywords` / `repository` |

对照已装的官方插件 `dsh-whale-widget@0.3.18` 的 `package.json`，字段结构一致
（`type`/`main`/`files`/`dsh.bundle.patch`/`license`）。

---

## 安装步骤（交给使用者）

1. clone 仓库到本地。
2. 桌面端里「管理 dsh 命令…」注册官方 CLI。
3. `dsh plugin --profile desktop add "<仓库目录的绝对路径>"`
4. **完全退出桌面端（含托盘）再打开** —— profile 组合只在启动时收集一次。

> ⚠️ 桌面端 profile 被 Electron 独占，`dsh plugin` 默认拒绝 `--profile desktop`。
> 先注册官方 CLI 再走第 3 步，不要手写 profile 的 `package.json` / `cordis.patch.yml`。

---

## 怎么确认生效

> 仓库地址：<https://github.com/QINGlongxingyue/DSH-FuFu-Jump>（原名 `fufu-jump-DSH`，GitHub 会自动重定向）

### 1. Host 侧日志

```
%USERPROFILE%\.dsh\.dshw-wallpaper.log
```

装好后应该有这几行：

```
apply() 开始；包目录=...；pets=true；角色=2
assets 存在=true；client.js 长度=...
index 注入行已注册（webserver/index-inject）
壁纸路由已注册
挂件路由已注册：whale-dance-1.webp
路由全部就绪
```

看到 `路由全部就绪` 说明 Host 半侧起来了。

### 2. 页面侧自检（关键）

```
%USERPROFILE%\.dsh\.dshw-wallpaper-client.log
```

日志末尾会有一句结论：`收到 N 条页面回传，注入行与 client.js 都正常`。
每条回传里带：

- `壁纸 img`：`{src, hidden, complete, natural:[w,h]}` —— **`natural` 不是 0 就说明图真的解码出来了**
- `算出来的样式`：`htmlBg` / `bodyBg` / `rootBg` —— 应该是 `rgba(0, 0, 0, 0)`（透明）
- 祖先链的 `opacity / filter / backdrop-filter / mix-blend-mode`
- `opaqueLayers`：整页里带底色、盖住 ≥1% 屏的元素，标了 `cleared`（是否已被清成透明）
- `lastScan`：最近一次补扫的时间和清了几个

界面上 **Alt+Shift+D** 也能手动触发一次回传。

### 3. 肉眼

界面出现草地壁纸 + 右下角有「数量/上限」「设置」按钮 = 成功。

---

## 本机的验证状态（诚实记录）

| 项目 | 状态 |
|---|---|
| 包格式对照官方规范 | ✅ 已逐条核对 |
| 用**仓库里的 `lib/client.js`** 跑页面侧冒烟测试 | ✅ 全部通过 |
| 用**仓库里的 `lib/index.js`** 跑宿主侧冒烟测试 | ✅ 全部通过 |
| 仓库源码与线上运行版本是否一致 | ✅ 三个 `src/*.js` 哈希一致 |
| 真机安装这个**仓库副本**并肉眼确认 | ❌ **没验过** —— 本机装的是同一个包的另一份拷贝（内容一致），仓库副本本身没单独装过 |
| 推到 GitHub | ❌ **没做** —— 本机无 git，且 GitHub TLS 握手失败 |

最后两项按原样告诉你，别当成已验收。

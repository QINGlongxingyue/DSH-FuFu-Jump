# 素材来源与授权

代码本体是 MIT（见 [LICENSE](LICENSE)）。**素材的授权和代码分开**，下面逐项说明。

## 角色动图（`whale-dance-*.webp` / `.gif`）

- 来源：本项目作者提供的原始录屏 `dt (1).mp4`、`dt (2).mp4`，经转码得到带透明通道的动图。
- 角色形象版权属于**原著作权人**，不在本仓库的 MIT 授权范围内。
- 本仓库只以「转换后的动图」形式附带，供个人在本机使用 DSH 插件时显示。
- **如果你要再分发或商用，请自行确认角色形象的授权。** 拿不准就把 `assets/whale-dance-*` 换成你自己的素材：
  `cordis.patch.yml` 里改每个角色的 `src:` 即可（支持 `.webp` / `.gif` / `.png`）。

## 壁纸（`wallpaper.jpg`、`grassland-wallpaper-1920x1080.png`）

- 同样是本项目作者提供的素材，**不在 MIT 授权范围内**。
- 想换成自己的图：把文件放进 `assets/`，改 `cordis.patch.yml` 里的 `wallpaper:` 路径。

## 代码

- `lib/`、`src/`、`cordis.patch.yml`、`package.json` 及文档：MIT。
- 依赖：`esbuild`（仅开发时打包用，MIT）。

## 不包含什么

本仓库**不含**任何 DeepSeek / DeepSeek Harness 的代码或二进制；插件通过 DSH 公开的
bundle / Host / Client 接口接入，运行时由 DSH 自己提供宿主能力。

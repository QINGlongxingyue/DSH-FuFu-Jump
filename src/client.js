/**
 * dsh-whale-wallpaper/client —— 浏览器侧本体（入口）
 *
 * 只做一件事：确认是 DSH 页面后把自己装上去。重复执行是无害的
 * （幂等哨兵 + 已有节点直接复用）。
 */
import { injectWallpaper } from './wallpaper.js'

try {
  const config = (typeof globalThis !== 'undefined' && globalThis.__DSH_WHALE_WALLPAPER__) || {}
  // 不能只看哨兵：配置可能变了（enabled 开关、换动图），每次加载都按最新配置重装一遍。
  // mount() 自己会先按 id 清掉旧节点，所以重复执行不会堆出第二层。
  injectWallpaper(config)
} catch (err) {
  // 装不上就算了：绝对不能让壁纸插件把聊天界面搞挂
  try { console.warn('[dsh-whale-wallpaper] 初始化失败：', err) } catch (err2) {}
}

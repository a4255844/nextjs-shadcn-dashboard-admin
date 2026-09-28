import { STORAGE_KEY, THEME_STYLES } from "./types";

/**
 * 首屏绘制前在 <head> 同步执行的内联脚本。
 * 从 localStorage 恢复 style 并写入 <html data-style>，避免主题闪烁（FOUC）。
 * 与 CustomizerProvider 的状态保持一致，二者共用同一个 storage key。
 */
export const CUSTOMIZER_INIT_SCRIPT = `(function(){try{var raw=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY
)});if(!raw)return;var s=JSON.parse(raw);var styles=${JSON.stringify(
  THEME_STYLES
)};if(s&&styles.indexOf(s.style)>-1){document.documentElement.setAttribute('data-style',s.style);}}catch(e){}})();`;

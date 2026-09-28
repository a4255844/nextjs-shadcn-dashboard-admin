import {
  DEFAULT_SETTINGS,
  LEGACY_THEME_KEY,
  STORAGE_KEY,
  THEME_STYLES,
} from "./types";

/**
 * 首屏绘制前在 <head> 同步执行的内联脚本。
 * 从 localStorage 恢复 style/mode 并写入 <html data-style> 与 .dark class，避免主题闪烁（FOUC）。
 * mode 在新 key 缺失时回退读取旧版独立 "theme" key，并把迁移结果固化回新 key（一次性迁移）。
 */
export const CUSTOMIZER_INIT_SCRIPT = `(function(){try{var styles=${JSON.stringify(
  THEME_STYLES
)};var KEY=${JSON.stringify(
  STORAGE_KEY
)};var LEGACY=${JSON.stringify(
  LEGACY_THEME_KEY
)};var defStyle=${JSON.stringify(DEFAULT_SETTINGS.style)};var s={style:null,mode:null};var raw=localStorage.getItem(KEY);if(raw){var p=JSON.parse(raw);if(p&&styles.indexOf(p.style)>-1)s.style=p.style;if(p&&(p.mode==='light'||p.mode==='dark'))s.mode=p.mode;}if(!s.mode){var legacy=localStorage.getItem(LEGACY);if(legacy==='dark'||legacy==='light')s.mode=legacy;}if(!raw){var migrated={style:s.style||defStyle,mode:s.mode||'light'};localStorage.setItem(KEY,JSON.stringify(migrated));}var el=document.documentElement;if(s.style)el.setAttribute('data-style',s.style);if(s.mode==='dark')el.classList.add('dark');else el.classList.remove('dark');}catch(e){}})();`;

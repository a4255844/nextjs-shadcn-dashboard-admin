import {
  DEFAULT_SETTINGS,
  LEGACY_THEME_KEY,
  STORAGE_KEY,
  THEME_DIRECTIONS,
  THEME_STYLES,
} from "./types";

/**
 * 首屏绘制前在 <head> 同步执行的内联脚本。
 * 从 localStorage 恢复 style/mode/direction 并写入 <html data-style>、.dark class 与 dir，
 * 避免主题闪烁（FOUC）。
 * - mode 在新 key 缺失时回退读取旧版独立 "theme" key，并把迁移结果固化回新 key（一次性迁移）。
 * - direction 缺失或非法时不写 dir，保留服务端按 locale 输出的初始方向（跟随 locale）。
 */
export const CUSTOMIZER_INIT_SCRIPT = `(function(){try{var styles=${JSON.stringify(
  THEME_STYLES
)};var dirs=${JSON.stringify(
  THEME_DIRECTIONS
)};var KEY=${JSON.stringify(
  STORAGE_KEY
)};var LEGACY=${JSON.stringify(
  LEGACY_THEME_KEY
)};var defStyle=${JSON.stringify(
  DEFAULT_SETTINGS.style
)};var s={style:null,mode:null,dir:null};var raw=localStorage.getItem(KEY);if(raw){var p=JSON.parse(raw);if(p&&styles.indexOf(p.style)>-1)s.style=p.style;if(p&&(p.mode==='light'||p.mode==='dark'))s.mode=p.mode;if(p&&dirs.indexOf(p.direction)>-1)s.dir=p.direction;}if(!s.mode){var legacy=localStorage.getItem(LEGACY);if(legacy==='dark'||legacy==='light')s.mode=legacy;}if(!raw){var migrated={style:s.style||defStyle,mode:s.mode||'light',direction:s.dir};localStorage.setItem(KEY,JSON.stringify(migrated));}var el=document.documentElement;if(s.style)el.setAttribute('data-style',s.style);if(s.mode==='dark')el.classList.add('dark');else el.classList.remove('dark');if(s.dir)el.setAttribute('dir',s.dir);}catch(e){}})();`;

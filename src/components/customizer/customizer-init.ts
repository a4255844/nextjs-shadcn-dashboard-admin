import { getDirection, routing } from "@/i18n/routing";
import {
  DEFAULT_SETTINGS,
  LEGACY_THEME_KEY,
  STORAGE_KEY,
  THEME_DIRECTIONS,
  THEME_STYLES,
} from "./types";

const RTL_LOCALES = routing.locales.filter(
  (locale) => getDirection(locale) === "rtl"
);

/**
 * 首屏绘制前在 <head> 同步执行的内联脚本（挂在根 layout，只执行一次）。
 * - 从 localStorage 恢复 style/mode/direction 并写入 <html data-style>、.dark class，避免主题闪烁（FOUC）。
 * - mode 在新 key 缺失时回退读取旧版独立 "theme" key，并把迁移结果固化回新 key（一次性迁移）。
 * - lang/dir 从 URL 首段推导 locale：根 layout 是静态的、拿不到 locale，
 *   由本脚本在绘制前补上；显式 direction 覆盖优先于 locale 推导。
 */
export const CUSTOMIZER_INIT_SCRIPT = `(function(){try{var styles=${JSON.stringify(
  THEME_STYLES
)};var dirs=${JSON.stringify(
  THEME_DIRECTIONS
)};var locales=${JSON.stringify(
  routing.locales
)};var rtlLocales=${JSON.stringify(
  RTL_LOCALES
)};var KEY=${JSON.stringify(
  STORAGE_KEY
)};var LEGACY=${JSON.stringify(
  LEGACY_THEME_KEY
)};var defStyle=${JSON.stringify(
  DEFAULT_SETTINGS.style
)};var s={style:null,mode:null,dir:null};var raw=localStorage.getItem(KEY);if(raw){var p=JSON.parse(raw);if(p&&styles.indexOf(p.style)>-1)s.style=p.style;if(p&&(p.mode==='light'||p.mode==='dark'))s.mode=p.mode;if(p&&dirs.indexOf(p.direction)>-1)s.dir=p.direction;}if(!s.mode){var legacy=localStorage.getItem(LEGACY);if(legacy==='dark'||legacy==='light')s.mode=legacy;}if(!raw){var migrated={style:s.style||defStyle,mode:s.mode||'light',direction:s.dir};localStorage.setItem(KEY,JSON.stringify(migrated));}var seg=location.pathname.split('/')[1];var loc=locales.indexOf(seg)>-1?seg:'en';var el=document.documentElement;el.setAttribute('lang',loc);el.setAttribute('dir',s.dir||(rtlLocales.indexOf(loc)>-1?'rtl':'ltr'));if(s.style)el.setAttribute('data-style',s.style);if(s.mode==='dark')el.classList.add('dark');else el.classList.remove('dark');}catch(e){}})();`;

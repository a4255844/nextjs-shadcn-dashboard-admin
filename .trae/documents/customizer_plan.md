# Customizer 主题定制面板 实施计划

## Repository Research

目标：参照 shadcndashboard.dev，实现右侧滑出的 Customizer 抽屉，可调节：Theme Style（7 款）、明暗、LTR/RTL、主题色、布局类型、容器宽度。

现状结论：

- **抽屉基建已具备**：[sheet.tsx](file:///f:/code/demoProjects/dashboard-next/src/components/ui/sheet.tsx)（radix Dialog 封装，支持 `side="right"`、自带 overlay 动画与关闭按钮）。
- **明暗模式**：[Light-Dark.tsx](file:///f:/code/demoProjects/dashboard-next/src/layouts/full/vertical/header/Light-Dark.tsx) 手写 `document.documentElement.classList.toggle("dark")` + `localStorage["theme"]`，含 View Transition 动画；无 next-themes。
- **主题变量**：[globals.css](file:///f:/code/demoProjects/dashboard-next/app/globals.css) 仅 `:root` 与 `.dark` 两套 oklch 变量，Tailwind v4 CSS-first（无 config），`@custom-variant dark (&:is(.dark *))`。
- **RTL**：[routing.ts](file:///f:/code/demoProjects/dashboard-next/src/i18n/routing.ts) 的 `getDirection(locale)` 服务端决定 `<html dir>`（仅 ar→rtl）；[Sidebar.tsx#L33](file:///f:/code/demoProjects/dashboard-next/src/layouts/full/vertical/sidebar/Sidebar.tsx#L33) 也按 locale 决定侧栏 side。
- **布局链**：[app/[locale]/layout.tsx](file:///f:/code/demoProjects/dashboard-next/app/[locale]/layout.tsx) 渲染 `<html lang dir>` + NextIntlClientProvider；[(app)/layout.tsx](file:///f:/code/demoProjects/dashboard-next/app/[locale]/(app)/layout.tsx) 组装 `SidebarProvider + SidebarLayout + SidebarInset(Header + children)`；**无 horizontal 布局**。
- **风格抽象半成品**：[StyleAwareWrapper.tsx](file:///f:/code/demoProjects/dashboard-next/src/components/shared/StyleAwareWrapper.tsx) 收 `lyraClassName/defaultClassName` 但只用前者；dashboard 页已用 `gap-px bg-border` 的 lyra 式分隔线写法。
- **container**：全项目无 boxed/full 概念，当前内容区 `p-4 md:p-6` 全宽。
- **i18n**：5 locale（en/zh/de/es/ar），messages JSON 齐全；Header 右侧操作区见 [Header.tsx#L26-L31](file:///f:/code/demoProjects/dashboard-next/src/layouts/full/vertical/header/Header.tsx#L26-L31)。

已确认的范围决策：

1. 7 款风格做 **Token 级差异**（radius / border / shadow / 主色微差），不逐组件重写。
2. Horizontal 布局**本期占位禁用**（Tooltip 提示 Soon），状态预留。
3. 主题色 = **预设色板 + 铅笔自定义取色**（原生 `<input type="color">`）。

## Files and Modules

新增（统一放 `src/components/customizer/`）：

- `types.ts`：`ThemeStyle / ThemeMode / ThemeDirection / LayoutType / ContainerType / CustomizerSettings` 类型；`DEFAULT_SETTINGS`；`STYLE_OPTIONS`（7 款：key/label/lucide 图标）、`PRIMARY_PRESETS`（5-6 个 hex）、`STORAGE_KEY`。
- `customizer-context.tsx`：`CustomizerProvider` + `useCustomizer()`；状态、localStorage 读写、向 `<html>` 应用 side effects（`dark` class、`data-style`、`dir`、`--primary`/`--primary-foreground`/`--sidebar-primary` 内联变量）；`resetSettings()`。
- `customizer-init.ts`：导出防 FOUC 内联脚本字符串（IIFE，读 localStorage → 提前设置 html 的 class/data-style/dir/变量）。
- `option-card.tsx`：通用选项卡片（图标+标题，选中态 ring/border/bg，支持 disabled）。
- `customizer-panel.tsx`：`Sheet` 容器 + 自定义头部（标题/副标题/圆形 X 关闭）+ 六个分区，组合各 section。
- `sections/`（或单文件内子组件）：`StyleSection / ModeSection / DirectionSection / ColorSection / LayoutSection / ContainerSection`。

修改：

- [app/[locale]/layout.tsx](file:///f:/code/demoProjects/dashboard-next/app/[locale]/layout.tsx)：`<html suppressHydrationWarning>`；`<head>` 注入 init `<script dangerouslySetInnerHTML>`；body 内挂 `CustomizerProvider`（包在 NextIntlClientProvider 内侧或外侧均可，置于其内部）。
- [app/[locale]/(app)/layout.tsx](file:///f:/code/demoProjects/dashboard-next/app/[locale]/(app)/layout.tsx)：抽客户端内层组件消费 `container`，boxed 时对 Header+内容整体套 `mx-auto w-full max-w-[1440px]`。
- [Header.tsx](file:///f:/code/demoProjects/dashboard-next/src/layouts/full/vertical/header/Header.tsx)：操作区加入 Customizer 触发按钮（`Settings2` 图标，ghost 圆形，与其他图标按钮一致）。
- [Light-Dark.tsx](file:///f:/code/demoProjects/dashboard-next/src/layouts/full/vertical/header/Light-Dark.tsx)：改为消费 `useCustomizer().mode/setMode`，保留 View Transition 动画；移除独立 localStorage key（统一由 provider 管理，向后兼容读取一次旧 key）。
- [Sidebar.tsx](file:///f:/code/demoProjects/dashboard-next/src/layouts/full/vertical/sidebar/Sidebar.tsx)：`side` 改为消费 context 解析后的 direction（mounted 前回退 locale 值）。
- [StyleAwareWrapper.tsx](file:///f:/code/demoProjects/dashboard-next/src/components/shared/StyleAwareWrapper.tsx)：消费当前 style，lyra 时用 `lyraClassName`，其余用 `defaultClassName`（并清理未使用的 prop 解构）。
- [globals.css](file:///f:/code/demoProjects/dashboard-next/app/globals.css)：新增 7 个 `[data-style="xxx"]` token 块（差异变量：`--radius`、`--border` 浓度、`--card-shadow` 等），默认 vega。
- `messages/{en,zh,de,es,ar}.json`：新增 `customizer` 命名空间（标题、副标题、6 个分区标题、7 风格名、Light/Dark/LTR/RTL/Vertical/Horizontal/Boxed/Full、Reset、Soon）。

## Implementation Steps

1. **数据层**：建 `customizer/types.ts`，定义全部类型、默认值（vega / light / 跟随当前 dir / vertical / full / 默认主色）、风格选项与预设色元数据。
2. **Provider + 持久化 + 防闪烁**：建 `customizer-context.tsx`（state、localStorage 持久化、html 属性/变量 effects、reset）；建 `customizer-init.ts` 内联脚本；接入 `[locale]/layout.tsx`（suppressHydrationWarning + 注入脚本 + Provider 挂载）。
3. **7 款风格 token**：在 globals.css 增加 `[data-style="vega|nova|maia|lyra|mira|luma|rhea"]` 变量块，做出圆角/描边/阴影梯度差异（vega 当前默认外观、lyra 无重边框细分隔线风格）。
4. **抽屉 UI**：`option-card.tsx` + `customizer-panel.tsx` 及六个分区（风格 4 列网格、明暗/方向/布局/容器 2 列卡片、色板行 + 铅笔取色 + 选中态）；Horizontal 卡片禁用 + Tooltip「Soon」；底部 Reset。
5. **触发入口**：Header 加齿轮按钮打开 Sheet。
6. **应用接线**：
   - Light-Dark 改用 context mode（保留圆形过渡动画）；
   - Sidebar `side` 用 context 解析 direction；
   - (app)/layout 消费 container 加 boxed 限宽容器；
   - StyleAwareWrapper 按 style 选 className；
   - 主题色 effect 写入 `--primary` / `--sidebar-primary`，前景色按亮度算黑白（自定义 hex 同样路径，深浅色模式均生效）。
7. **i18n**：5 个 messages 文件补 `customizer` 命名空间（en/zh 完整，de/es/ar 给对应译文）。
8. **验证**：`npx tsc --noEmit` 通过；dev 浏览器实测各项（见 Validation）。

## Dependencies and Considerations

- 不引入新依赖（Sheet、Tooltip、lucide、radix 均已在项目内）。
- 防闪烁脚本必须在 hydration 前同步执行，放 `<head>`；`<html>` 加 `suppressHydrationWarning` 以兼容 class/dir/data-style 与 SSR 不一致。
- direction 覆盖语义：localStorage 有值则覆盖 locale 推导（含 ar 下强制 LTR）；无值时保持服务端 locale 默认。切换 locale 不清覆盖值。
- 主题色覆盖范围限定 `--primary` 与 `--sidebar-primary`（+ foreground），ring/input 保持中性，避免连锁对比度问题。
- 旧 `localStorage["theme"]` 首次迁移读取一次后并入新存储 key（如 `dashboard-customizer`）。
- RTL 下抽屉应滑自左侧？参考站面板固定右侧；本期保持固定右侧（Sheet side="right"），面板内部用逻辑属性保证文案/排版 RTL 正确。

## Validation

- `npx tsc --noEmit` 退出码 0。
- `next dev` 浏览器实测：
  1. 抽屉从右侧滑入、overlay 淡入、X/Esc/点遮罩可关闭；
  2. 7 款风格切换后圆角/描边/阴影实时变化，刷新后保持且无白屏闪烁（FOUC）；
  3. Light/Dark 切换与 Header 圆形按钮状态同步，刷新保持；
  4. en 下切 RTL：整页方向反转、Sidebar 换到右侧；ar 下切 LTR 同理；刷新保持；
  5. 预设色与自定义取色实时改主色（按钮/图表主色等），深浅模式下均可用；
  6. Boxed/Ful l切换：boxed 时 Header 与内容居中限宽；
  7. Horizontal 卡片禁用且有 Soon 提示；Reset 恢复全部默认；
  8. zh/en 语言下面板文案完整，无 missing message 报错。

## Risks

- **Hydration 不匹配**：init 脚本提前改 html 属性 → 用 suppressHydrationWarning + mounted 后再读状态的客户端组件兜底。
- **强制 RTL 布局错位**：项目约定使用逻辑属性（start-*/ps-*），新增面板组件一律用逻辑属性；实测发现的物理方向类就地修正。
- **boxed 与 SidebarInset 内嵌结构冲突**：限宽 wrapper 同时包住 Header 与内容，sticky Header 仍相对 SidebarInset 生效；若宽度异常退回只限内容区。
- **自定义主色前景对比度**：按相对亮度阈值自动选黑/白前景；极端颜色接受有限降级。

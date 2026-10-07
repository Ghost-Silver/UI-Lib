# Soft 组件规范与 WAI-ARIA 体系指南

> UI-Lib 向上提供了一套完整的 50 个高阶语义化应用组件库（`Soft` 系列）。本指南详述全部 50 个组件的无障碍可访问性（Accessibility / WAI-ARIA APG）设计规范、键盘导航模型、焦点流转契约与物理微交互机制。

---

## 1. 架构原则与命名准则

UI-Lib 区分**应用组件（Application Components）**与**视觉动效原语（Visual Primitives）**：

- **`Soft*` 应用组件（50 个）**：应用构建块。每一个均严格遵守无障碍规范，具备明确的 `role`、`aria-*` 状态属性、完整的键盘导航行为与屏幕阅读器（Screen Reader）朗读名称。这一契约由自动化门禁 `pnpm check:api` 强制校验。
- **无前缀动效原语**：如 `GlassStage`、`Optics`、`Reveal`、`Bling`、`Magnetic` 等。属于底层渲染画布与纯装饰性图元，标记 `aria-hidden="true"`，不劫持键盘焦点与 DOM 语义。

---

## 2. 50 个 Soft 组件分类全景图

组件体系按照功能场景划分为 5 大类、共 50 个语义组件：

| 类别 | 数量 | 包含组件 |
|---|:---:|---|
| **表单与选择** | 12 | `SoftButton`, `SoftInput`, `SoftTextarea`, `SoftSelect`, `SoftCombobox`, `SoftCheckbox`, `SoftRadio`, `SoftRadioGroup`, `SoftSwitch`, `SoftSlider`, `SoftSegmentedControl`, `SoftColorPicker` |
| **数据与结构** | 12 | `SoftCard`, `SoftTable`, `SoftDataTable`, `SoftList`, `SoftTree`, `SoftAccordion`, `SoftTabs`, `SoftDrawer`, `SoftModal`, `SoftToolbar`, `SoftMenu`, `SoftTimeline` |
| **反馈与上下文** | 10 | `SoftToast`, `SoftToaster`, `SoftToastProvider`, `SoftTooltip`, `SoftPopover`, `SoftAlert`, `SoftProgress`, `SoftSkeleton`, `SoftSpinner`, `SoftEmptyState` |
| **导航与控制** | 8 | `SoftBreadcrumb`, `SoftPagination`, `SoftStepper`, `SoftCommandPalette`, `SoftFloating`, `SoftOverlay`, `SoftNavigation`, `SoftChipStepper` |
| **标识与表面** | 8 | `SoftAvatar`, `SoftTag`, `SoftChip`, `SoftBadge`, `SoftDivider`, `SoftLightPanel`, `BubbleBadge`, `WatercolorBoard` |

---

## 3. 分类规格与 WAI-ARIA APG 交互模型

### 3.1 表单与选择（12 Components）

#### 1. `SoftButton` (`PinkPaperButton`)
- **语义与角色**：`role="button"` 或原生 `<button type="button">`。
- **ARIA 契约**：`aria-disabled="true"`（禁用态），支持 `aria-haspopup` 与 `aria-expanded`。
- **键盘导航**：`Space` 与 `Enter` 触发点击；获得焦点时呈现 `--ui-lib-focus-halo` 宣纸微晕环。
- **物理手感**：二阶弹簧按下反馈，阻尼比 $\zeta = 0.55$，刚度 $k = 350$。

#### 2. `SoftInput`
- **语义与角色**：原生 `<input>` 单行输入框。
- **ARIA 契约**：`aria-invalid="true"`（校验失败），配合 `aria-describedby` 关联错误提示文案。
- **键盘导航**：原生文本光标移动，`Tab` 进出。

#### 3. `SoftTextarea`
- **语义与角色**：原生 `<textarea>` 多行文本域。
- **ARIA 契约**：`aria-invalid`、`aria-describedby`，支持字数统计状态播报。
- **键盘导航**：支持自适应高度扩展与全键盘文本漫游。

#### 4. `SoftSelect`
- **语义与角色**：`role="combobox"` 配合弹出式 `role="listbox"`。
- **ARIA 契约**：`aria-expanded`，`aria-haspopup="listbox"`，`aria-activedescendant` 指向当前高亮选项。
- **键盘导航**：
  - 闭合态：`Space` / `Enter` / `ArrowDown` 展开下拉盘；
  - 展开态：`ArrowDown` / `ArrowUp` 漫游高亮项，`Enter` / `Space` 选中并收起，`Escape` 取消并收起。
- **焦点模型**：焦点停留在触发器上，不转移至选项节点，维持连续 Tab 流程。

#### 5. `SoftCombobox`
- **语义与角色**：带搜索过滤的输入框组合体，遵循 WAI-ARIA Combobox Pattern。
- **ARIA 契约**：`aria-autocomplete="list"`（告知屏幕阅读器结果随输入动态过滤），`aria-controls` 指向浮层 ID。
- **键盘导航**：打字过滤列表；`ArrowDown` 漫游结果项；`Escape` 清空或收起。

#### 6. `SoftCheckbox`
- **语义与角色**：原生 `<input type="checkbox">` 或 `role="checkbox"`。
- **ARIA 契约**：`aria-checked="true" | "false" | "mixed"`（支持半选状态）。
- **键盘导航**：`Space` 切换选中状态。

#### 7. `SoftRadio`
- **语义与角色**：原生 `<input type="radio">` 或 `role="radio"`。
- **ARIA 契约**：`aria-checked="true" | "false"`。
- **键盘导航**：`ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight` 立即改变同组选中项。

#### 8. `SoftRadioGroup`
- **语义与角色**：`role="radiogroup"`。
- **ARIA 契约**：`aria-labelledby` 关联标题，同组选项由单一 `Tab` 停靠点管理（Roving Tabindex）。

#### 9. `SoftSwitch`
- **语义与角色**：`role="switch"` 开关。
- **ARIA 契约**：`aria-checked="true" | "false"`。
- **键盘导航**：`Space` 或 `Enter` 触发翻转，状态切换立即生效。

#### 10. `SoftSlider`
- **语义与角色**：`role="slider"` 连续滑块。
- **ARIA 契约**：`aria-valuenow`，`aria-valuemin`，`aria-valuemax`，`aria-orientation="horizontal"`。
- **键盘导航**：`ArrowLeft` / `ArrowDown` 步退，`ArrowRight` / `ArrowUp` 步进，`PageUp` / `PageDown` 大跨步，`Home` 最小，`End` 最大。

#### 11. `SoftSegmentedControl`
- **语义与角色**：原生单选组外观升华为连续滑动胶囊。
- **ARIA 契约**：`role="radiogroup"`，每个片段项具备单选语义。
- **键盘导航**：方向键切换选项并带动底衬滑块以 $\zeta = 0.55$ 物理弹簧阻尼位移。

#### 12. `SoftColorPicker`
- **语义与角色**：双引擎调色器。
- **物理与可访问性创新**：
  - 集成 Kubelka-Munk 物理吸收/散射（K/S）减色模型，彻底避开 RGB 线性插值产生的“死灰轴（Dead Grey Mud Axis）”；
  - 动态计算基底相对亮度 `computeEffectiveGroundLuminance`，提供实时的 WCAG AA 对比度判定；
  - 包含含水量与沉降微粒滑块，按键步进精度 1%。

---

### 3.2 数据与结构（12 Components）

#### 13. `SoftCard`
- **语义与角色**：结构化容器，支持 `material="wash" | "tint" | "plain"` 宣纸水彩材质表面。
- **无障碍保障**：不劫持内部可聚焦元素的 Tab 顺序。

#### 14. `SoftTable`
- **语义与角色**：标准语义化 `<table>`，具备 `<thead>`、`<tbody>` 与 `scope="col"` 表头属性。

#### 15. `SoftDataTable`
- **语义与角色**：高级数据网格。
- **ARIA 契约**：表头列排序标记 `aria-sort="ascending" | "descending" | "none"`；全选复选框具备 `aria-checked="mixed"` 级联。
- **键盘导航**：支持表头回车排序，行项键盘聚焦与高亮。

#### 16. `SoftList`
- **语义与角色**：`role="listbox"` 单选/多选列表。
- **ARIA 契约**：`aria-activedescendant` 虚拟焦点管理。

#### 17. `SoftTree`
- **语义与角色**：树形分层导航，严格遵照 WAI-ARIA Tree APG 模式。
- **ARIA 契约**：根节点 `role="tree"`，行节点 `role="treeitem"`，带子节点具备 `aria-expanded`。
- **键盘导航**：
  - `ArrowDown` / `ArrowUp`：在所有**可见的展开节点**之间单步上下移动（内部采用扁平化展开投影缓存）；
  - `ArrowRight`：若当前节点折叠则展开子级；若已展开则聚焦首个子节点；若为叶子节点则无动作；
  - `ArrowLeft`：若当前节点展开则折叠它；若已折叠则跳回父节点；
  - `*`（星号键）：展开当前层级的所有同级兄弟节点；
  - 字符键（Typeahead）：按首字母快速跳转到下一个匹配项。
- **多选支持**：纯函数自顶向下渗透与自底向上递归汇算 `indeterminate`（半选）状态。

#### 18. `SoftAccordion`
- **语义与角色**：折叠面板，Header 渲染 `<button>` 并关联 `aria-controls`，内容区为 `role="region"`。
- **键盘导航**：`Enter` / `Space` 展开或折叠。

#### 19. `SoftTabs`
- **语义与角色**：`role="tablist"`，`role="tab"`，`role="tabpanel"`。
- **键盘导航**：Roving Tabindex 机制，`ArrowLeft` / `ArrowRight` 漫游标签，`aria-selected="true"` 指示激活态。

#### 20. `SoftDrawer`
- **语义与角色**：侧滑抽屉对话框，`role="dialog"`，`aria-modal="true"`。
- **焦点陷阱**：打开时自动捕获焦点至首个可交互元素，`Escape` 键关闭，关闭后焦点原路归还触发按钮。

#### 21. `SoftModal`
- **语义与角色**：居中模态对话框，具备与 Drawer 一致的无障碍焦点闭环与背景锁滚机制。

#### 22. `SoftToolbar`
- **语义与角色**：`role="toolbar"`。
- **焦点模型**：整个工具栏占用单个 Tab 停靠点，进入后使用方向键在工具按钮间移动。

#### 23. `SoftMenu`
- **语义与角色**：`role="menu"` 弹出菜单，子项为 `role="menuitem"`。
- **焦点流动**：展开后焦点**真正移入**第一项，`ArrowDown` / `ArrowUp` 循环漫游，`Escape` 或 `Tab` 立即关闭并返还焦点。

#### 24. `SoftTimeline`
- **语义与角色**：有序时间线，底层采用 `<ol>` 与 `<time>` 语义化标签，节点由 `--moe-timeline-line` 宣纸微墨线串联。

---

### 3.3 反馈与上下文（10 Components）

#### 25. `SoftToast`
- **语义与角色**：轻提示通知。
- **ARIA 契约**：普通信息标记 `role="status"`（`aria-live="polite"`）；高优先级错误标记 `role="alert"`（`aria-live="assertive"`）。
- **交互手感**：支持手势划走（Swipe to dismiss）与 `Escape` 键快速关闭。

#### 26. `SoftToaster`
- **语义与角色**：Toast 视口容器，支持多卡片弹簧堆叠物理与屏幕位置锚定。

#### 27. `SoftToastProvider`
- **语义与角色**：React Context 调度提供者，管理全局消息生命周期与倒计时队列。

#### 28. `SoftTooltip`
- **语义与角色**：非交互式微型浮层，`role="tooltip"`。
- **无障碍边界**：**绝不争夺或转移焦点**，通过 `aria-describedby` 挂载至宿主元素，在悬停或聚焦时呈现，`Escape` 键隐藏。

#### 29. `SoftPopover`
- **语义与角色**：交互式气泡卡片，`role="dialog"`。
- **对比 Tooltip**：Popover 内部包含链接、按钮或表单输入，展开时接受焦点流转，点击外部或 `Escape` 关闭。

#### 30. `SoftAlert`
- **语义与角色**：静态警告横幅，根据 `urgency` 设置 `role="alert"` 或 `role="status"`。

#### 31. `SoftProgress`
- **语义与角色**：进度条，`role="progressbar"`，带 `aria-valuenow` 与 `aria-valuemin/max`。

#### 32. `SoftSkeleton`
- **语义与角色**：骨架屏占位，标记 `aria-hidden="true"` 防止屏幕阅读器朗读无意义节点。

#### 33. `SoftSpinner`
- **语义与角色**：无确定进度的加载旋转环，`role="status"`，自带隐藏的无障碍文本提示。

#### 34. `SoftEmptyState`
- **语义与角色**：无数据占位表面，结构化展示插画、标题与操作按钮。

---

### 3.4 导航与控制（8 Components）

#### 35. `SoftBreadcrumb`
- **语义与角色**：面包屑导航，`<nav aria-label="Breadcrumb">` 包裹 `<ol>`，末级当前项标记 `aria-current="page"`。

#### 36. `SoftPagination`
- **语义与角色**：分页控制器，`<nav aria-label="Pagination">`，激活页号赋予 `aria-current="page"`，翻页极限态设置 `aria-disabled="true"`。

#### 37. `SoftStepper`
- **语义与角色**：步骤导航条，`<nav aria-label="Steps">`，当前活跃步骤标记 `aria-current="step"`。

#### 38. `SoftCommandPalette`
- **语义与角色**：全局命令面板，`role="combobox"` 搜索框配合 `role="listbox"` 候选菜单。
- **键盘交互**：`Ctrl+K` / `Cmd+K` 全局唤出，拼音/英文字母实时模糊过滤，`Escape` 关闭。

#### 39. `SoftFloating`
- **底层引擎**：自主研发的轻量纯几何浮动定位引擎（`floating.ts`），提供视口翻转（Flip）、边界偏移约束（Shift clamping）与折射光标对齐，零第三方臃肿依赖。

#### 40. `SoftOverlay`
- **底层基础设施**：遮罩层与 Portal 挂载器，统筹背景滚动锁定（Scroll Lock）与淡入淡出动效。

#### 41. `SoftNavigation`
- **复合导航器**：统合面包屑与分页器的上层上下文状态容器。

#### 42. `SoftChipStepper`
- **复合交互项**：将步骤进阶与可点选胶囊紧密组合的高阶控制流组件。

---

### 3.5 标识与表面（8 Components）

#### 43. `SoftAvatar`
- **语义与角色**：头像标识，`role="img"` 并提供完整 `aria-label`；图片加载失败时平滑降级至字符缩写。

#### 44. `SoftTag`
- **语义与角色**：信息标签，支持 `variant="soft" | "solid"`，映射当前主题色温。

#### 45. `SoftChip`
- **语义与角色**：可交互的筛选胶囊，`role="button"`，带 `aria-pressed="true" | "false"`。

#### 46. `SoftBadge`
- **语义与角色**：数字或状态指示角标，`role="status"`，为读屏软件提供数值朗读。

#### 47. `SoftDivider`
- **语义与角色**：视觉分隔线，标准 `<hr>` 或 `role="separator"`，带 `aria-orientation`。

#### 48. `SoftLightPanel`
- **表面材质**：带 Bevel 倒角折射与柔和边缘环境晕光的微毛玻璃背板。

#### 49. `BubbleBadge`
- **液态表面**：圆润流动气泡角标，结合物理弹簧响应指针悬停。

#### 50. `WatercolorBoard`
- **宣纸底板**：全景毛细宣纸底板，承接动态沉积水痕与 Canvas 颜料图层。

---

## 4. 物理动效与手感规范（Physics & Damping）

UI-Lib 的动效摒弃了手挑无量纲常数的做法，统一建立在二阶微分方程的**阻尼比（Damping Ratio $\zeta$）**体系之上：

$$\ddot{x} + 2\zeta\omega_n\dot{x} + \omega_n^2(x - x_{\text{target}}) = 0$$

- **黄金手感 $\zeta = 0.55$**：微欠阻尼状态。在手指轻按或释放时产生极轻微、通透的快速收敛回弹，既无过阻尼的迟钝感，亦无欠阻尼的冗余震荡。
- **标准预设刚度**：
  - `press` 按下反馈：$k = 350$
  - `pop` 弹出浮层：$k = 199$
  - `badge` 角标晃动：$k = 449$
- **动效减弱（Reduced Motion）承诺**：当系统开启 `prefers-reduced-motion: reduce` 时，所有弹簧位移截断为 0，共享时钟立即停摆，所有组件无缝降级为瞬时状态响应，完全符合 WCAG 2.2 规范。

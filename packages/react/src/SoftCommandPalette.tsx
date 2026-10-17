import type { IrisTone } from "@ui-lib/core";
import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { type SoftMaterial, useMaterial } from "./material.js";
import { useStyles } from "./useStyles.js";

export interface SoftCommandItem {
	/** Unique identity */
	id: string;
	/** Visible action label */
	label: string;
	/** Secondary descriptive note or subtitle */
	note?: string;
	/** Category or group name (e.g. "Navigation", "Actions", "Settings") */
	group?: string;
	/** Keyboard shortcut key hints (e.g. ["⌘", "K"] or "Ctrl+S") */
	shortcut?: string | readonly string[];
	/** Leading icon or visual badge */
	icon?: React.ReactNode;
	/** Whether this command is disabled */
	disabled?: boolean;
	/** Triggered when selected */
	onSelect?: () => void;
	/** Additional search tokens for fuzzy matching */
	keywords?: readonly string[];
}

export interface SoftCommandPaletteProps {
	/** Whether the palette dialog is visible */
	open: boolean;
	/** Invoked when dismissed */
	onClose: () => void;
	/** Invoked when opened via global shortcut */
	onOpen?: () => void;
	/** List of available commands */
	items: readonly SoftCommandItem[];
	/** Search input placeholder */
	placeholder?: string;
	/** Callback invoked when an item is selected */
	onSelect?: (item: SoftCommandItem) => void;
	/** Accessible dialog title and listbox name */
	title?: string;
	/** Text shown when no items match the query */
	emptyText?: string;
	/** Surface material */
	material?: SoftMaterial;
	/** Tone family */
	tone?: IrisTone;
	/**
	 * Single key trigger for Cmd+<key> / Ctrl+<key> global shortcut.
	 * Set to "k" by default, or undefined / null to disable.
	 */
	shortcutKey?: string | null;
	className?: string;
	style?: React.CSSProperties;
	/** Custom footer slot (e.g., keyboard guide) */
	footer?: React.ReactNode;
}

/**
 * Computes a relevance score for fuzzy command searching.
 * Returns > 0 if matched, 0 if no match.
 */
export function matchCommand(item: SoftCommandItem, rawQuery: string): number {
	const query = rawQuery.trim().toLowerCase();
	if (!query) return 1;

	const label = item.label.toLowerCase();
	const note = (item.note ?? "").toLowerCase();
	const group = (item.group ?? "").toLowerCase();
	const keywords = (item.keywords ?? []).map((k) => k.toLowerCase()).join(" ");

	// Exact matches
	if (label === query) return 100;
	if (label.startsWith(query)) return 80 + (query.length / label.length) * 10;
	if (label.includes(query)) return 60 + (query.length / label.length) * 10;

	// Secondary field matches
	if (keywords.includes(query)) return 50;
	if (note.includes(query)) return 40;
	if (group.includes(query)) return 30;

	// Subsequence match on label
	let qi = 0;
	let score = 0;
	let consecutive = 0;
	for (let i = 0; i < label.length && qi < query.length; i++) {
		if (label[i] === query[qi]) {
			qi++;
			consecutive++;
			score += 5 + consecutive * 3;
		} else {
			consecutive = 0;
		}
	}
	if (qi === query.length) return score;

	return 0;
}

/**
 * A fast, accessible command palette wrapped in liquid glass.
 *
 * ## Features & Accessibility
 *
 * - Native `<dialog>` backdrop with smooth fade-in and focus trapping.
 * - Global `Cmd+K` / `Ctrl+K` shortcut listener for instant activation.
 * - Full WAI-ARIA combobox 1.2 compliance:
 *   - Search `<input role="combobox">` with `aria-autocomplete="list"`
 *   - Listbox with categorized `<div role="group">` and `<div role="option">`
 *   - `aria-activedescendant` tracks active choice as arrows walk the list
 * - Keyboard navigation: `ArrowDown`, `ArrowUp`, `Enter`, `Escape`, `Home`, `End`.
 *
 * ```tsx
 * <SoftCommandPalette
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   items={[
 *     { id: "new", label: "新建画板", group: "文档", shortcut: ["⌘", "N"] },
 *     { id: "export", label: "导出为水彩图", group: "导出", shortcut: ["⌘", "E"] },
 *   ]}
 * />
 * ```
 */
export const SoftCommandPalette = forwardRef<HTMLDialogElement, SoftCommandPaletteProps>(
	function SoftCommandPalette(
		{
			open,
			onClose,
			onOpen,
			items,
			placeholder = "输入命令或搜索...",
			onSelect,
			title = "命令面板",
			emptyText = "未找到匹配命令",
			material = "plain",
			tone,
			shortcutKey = "k",
			className,
			style,
			footer,
		},
		ref,
	) {
		useStyles();
		const surface = useMaterial(material && material !== "plain" ? { material, tone } : {});
		const dialogRef = useRef<HTMLDialogElement | null>(null);
		const inputRef = useRef<HTMLInputElement | null>(null);
		const listboxRef = useRef<HTMLDivElement | null>(null);

		const baseId = useId();
		const listboxId = `${baseId}-listbox`;
		const inputId = `${baseId}-input`;

		const [query, setQuery] = useState("");
		const [activeIndex, setActiveIndex] = useState(0);

		// Global keyboard listener for Cmd+K / Ctrl+K
		useEffect(() => {
			if (!shortcutKey || typeof window === "undefined") return;
			const targetKey = shortcutKey.toLowerCase();
			const handleKeyDown = (e: KeyboardEvent) => {
				if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === targetKey) {
					e.preventDefault();
					if (open) {
						onClose();
					} else {
						onOpen?.();
					}
				}
			};
			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, [shortcutKey, open, onClose, onOpen]);

		// Filter and sort items based on query
		const filteredItems = useMemo(() => {
			if (!query.trim()) return items;
			const scored = items
				.map((item) => ({ item, score: matchCommand(item, query) }))
				.filter(({ score }) => score > 0);
			scored.sort((a, b) => b.score - a.score);
			return scored.map(({ item }) => item);
		}, [items, query]);

		// Group items by category
		const groupedItems = useMemo(() => {
			const groups: { name: string; items: SoftCommandItem[] }[] = [];
			const groupMap = new Map<string, SoftCommandItem[]>();

			for (const item of filteredItems) {
				const groupName = item.group ?? "";
				let list = groupMap.get(groupName);
				if (!list) {
					list = [];
					groupMap.set(groupName, list);
					groups.push({ name: groupName, items: list });
				}
				list.push(item);
			}
			return groups;
		}, [filteredItems]);

		// Reset active index when query changes
		useEffect(() => {
			if (query !== undefined) {
				setActiveIndex(0);
			}
		}, [query]);

		// Open / close dialog lifecycle
		useEffect(() => {
			const dialog = dialogRef.current;
			if (!dialog) return;
			if (open) {
				if (!dialog.open) {
					dialog.showModal();
				}
				setQuery("");
				setActiveIndex(0);
				// Focus input after modal is rendered
				requestAnimationFrame(() => {
					inputRef.current?.focus();
				});
			} else if (dialog.open) {
				dialog.close();
			}
		}, [open]);

		// Scroll active option into view
		useEffect(() => {
			if (!open || filteredItems.length === 0) return;
			const activeOptionEl = listboxRef.current?.querySelector(
				`[data-ui-lib-index="${activeIndex}"]`,
			);
			if (activeOptionEl) {
				activeOptionEl.scrollIntoView({ block: "nearest" });
			}
		}, [activeIndex, open, filteredItems.length]);

		const handleKeyDown = useCallback(
			(e: React.KeyboardEvent) => {
				if (filteredItems.length === 0) {
					if (e.key === "Escape") {
						e.preventDefault();
						onClose();
					}
					return;
				}

				switch (e.key) {
					case "ArrowDown": {
						e.preventDefault();
						setActiveIndex((prev) => {
							let next = (prev + 1) % filteredItems.length;
							for (let i = 0; i < filteredItems.length; i++) {
								if (!filteredItems[next]?.disabled) return next;
								next = (next + 1) % filteredItems.length;
							}
							return prev;
						});
						break;
					}
					case "ArrowUp": {
						e.preventDefault();
						setActiveIndex((prev) => {
							let next = (prev - 1 + filteredItems.length) % filteredItems.length;
							for (let i = 0; i < filteredItems.length; i++) {
								if (!filteredItems[next]?.disabled) return next;
								next = (next - 1 + filteredItems.length) % filteredItems.length;
							}
							return prev;
						});
						break;
					}
					case "Home": {
						e.preventDefault();
						for (let i = 0; i < filteredItems.length; i++) {
							if (!filteredItems[i]?.disabled) {
								setActiveIndex(i);
								break;
							}
						}
						break;
					}
					case "End": {
						e.preventDefault();
						for (let i = filteredItems.length - 1; i >= 0; i--) {
							if (!filteredItems[i]?.disabled) {
								setActiveIndex(i);
								break;
							}
						}
						break;
					}
					case "Enter": {
						e.preventDefault();
						const active = filteredItems[activeIndex];
						if (active && !active.disabled) {
							active.onSelect?.();
							onSelect?.(active);
							onClose();
						}
						break;
					}
					case "Escape": {
						e.preventDefault();
						onClose();
						break;
					}
				}
			},
			[filteredItems, activeIndex, onSelect, onClose],
		);

		const handleBackdropClick = useCallback(
			(e: React.MouseEvent<HTMLDialogElement>) => {
				if (e.target === dialogRef.current) {
					onClose();
				}
			},
			[onClose],
		);

		const activeItem = filteredItems[activeIndex];
		const activeItemId = activeItem ? `${baseId}-item-${activeItem.id}` : undefined;

		let runningIndex = 0;

		return (
			// biome-ignore lint/a11y/useKeyWithClickEvents: Escape and enter are handled by dialog and input
			<dialog
				ref={(node) => {
					dialogRef.current = node;
					if (typeof ref === "function") ref(node);
					else if (ref) (ref as { current: HTMLDialogElement | null }).current = node;
				}}
				className={
					className ? `ui-lib-soft-command-palette ${className}` : "ui-lib-soft-command-palette"
				}
				aria-label={title}
				onCancel={(e) => {
					e.preventDefault();
					onClose();
				}}
				onClick={handleBackdropClick}
			>
				<div
					className={
						surface.className
							? `ui-lib-soft-command-palette__panel ${surface.className}`
							: "ui-lib-soft-command-palette__panel"
					}
					style={{ ...surface.style, ...style }}
				>
					{/* Search input header */}
					<div className="ui-lib-soft-command-palette__header">
						<svg
							className="ui-lib-soft-command-palette__icon"
							viewBox="0 0 24 24"
							width="18"
							height="18"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<circle cx="11" cy="11" r="8" />
							<line x1="21" y1="21" x2="16.65" y2="16.65" />
						</svg>
						<input
							ref={inputRef}
							id={inputId}
							type="text"
							role="combobox"
							className="ui-lib-soft-command-palette__input"
							placeholder={placeholder}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={handleKeyDown}
							aria-expanded={open}
							aria-haspopup="listbox"
							aria-controls={listboxId}
							aria-autocomplete="list"
							aria-activedescendant={activeItemId}
						/>
						{query && (
							<button
								type="button"
								className="ui-lib-soft-command-palette__clear"
								onClick={() => {
									setQuery("");
									inputRef.current?.focus();
								}}
								aria-label="清空搜索"
							>
								×
							</button>
						)}
					</div>

					{/* Command items listbox */}
					<div
						ref={listboxRef}
						id={listboxId}
						role="listbox"
						aria-label={title}
						className="ui-lib-soft-command-palette__list"
					>
						{filteredItems.length === 0 ? (
							<div className="ui-lib-soft-command-palette__empty" role="status">
								{emptyText}
							</div>
						) : (
							groupedItems.map((group) => {
								const groupId = `${baseId}-grp-${group.name || "default"}`;
								return (
									// biome-ignore lint/a11y/useSemanticElements: ARIA group inside listbox is standard combobox pattern
									<div
										key={group.name}
										role="group"
										aria-labelledby={group.name ? groupId : undefined}
										className="ui-lib-soft-command-palette__group"
									>
										{group.name && (
											<div
												id={groupId}
												className="ui-lib-soft-command-palette__group-title"
												role="presentation"
											>
												{group.name}
											</div>
										)}
										{group.items.map((item) => {
											const itemIndex = runningIndex++;
											const isSelected = itemIndex === activeIndex;
											const itemId = `${baseId}-item-${item.id}`;

											return (
												// biome-ignore lint/a11y/useFocusableInteractive: input holds focus and aria-activedescendant points here
												// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard events are captured on the combobox input
												<div
													key={item.id}
													id={itemId}
													role="option"
													data-ui-lib-index={itemIndex}
													aria-selected={isSelected}
													aria-disabled={item.disabled ? true : undefined}
													className="ui-lib-soft-command-palette__option"
													onClick={() => {
														if (item.disabled) return;
														item.onSelect?.();
														onSelect?.(item);
														onClose();
													}}
													onMouseEnter={() => {
														if (!item.disabled) setActiveIndex(itemIndex);
													}}
												>
													{item.icon && (
														<span className="ui-lib-soft-command-palette__option-icon">
															{item.icon}
														</span>
													)}
													<div className="ui-lib-soft-command-palette__option-text">
														<span className="ui-lib-soft-command-palette__option-label">
															{item.label}
														</span>
														{item.note && (
															<span className="ui-lib-soft-command-palette__option-note">
																{item.note}
															</span>
														)}
													</div>
													{item.shortcut && (
														<div className="ui-lib-soft-command-palette__shortcut">
															{Array.isArray(item.shortcut) ? (
																item.shortcut.map((key) => (
																	<kbd
																		key={`${item.id}-shortcut-${key}`}
																		className="ui-lib-soft-command-palette__kbd"
																	>
																		{key}
																	</kbd>
																))
															) : (
																<kbd className="ui-lib-soft-command-palette__kbd">
																	{item.shortcut}
																</kbd>
															)}
														</div>
													)}
												</div>
											);
										})}
									</div>
								);
							})
						)}
					</div>

					{/* Palette footer keyboard navigation guide */}
					{footer ?? (
						<div className="ui-lib-soft-command-palette__footer">
							<span className="ui-lib-soft-command-palette__footer-tip">
								<kbd className="ui-lib-soft-command-palette__kbd">↑</kbd>
								<kbd className="ui-lib-soft-command-palette__kbd">↓</kbd> 导航
							</span>
							<span className="ui-lib-soft-command-palette__footer-tip">
								<kbd className="ui-lib-soft-command-palette__kbd">↵</kbd> 确认
							</span>
							<span className="ui-lib-soft-command-palette__footer-tip">
								<kbd className="ui-lib-soft-command-palette__kbd">esc</kbd> 关闭
							</span>
						</div>
					)}
				</div>
			</dialog>
		);
	},
);

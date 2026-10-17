import type { IrisTone } from "@ui-lib/core";
import { forwardRef, useCallback, useEffect, useId, useMemo, useState } from "react";
import { type SoftMaterial, useMaterial } from "./material.js";
import { useStyles } from "./useStyles.js";

export interface SoftTreeNode {
	/** Unique identifier for the node. */
	key: string;
	/** Visible label or title of the node. */
	label: React.ReactNode;
	/** Optional leading icon (e.g. folder, file, tag). */
	icon?: React.ReactNode;
	/** Nested child nodes. */
	children?: SoftTreeNode[];
	/** Whether this node is disabled from selection and checking. */
	disabled?: boolean;
	/** Explicitly mark as a leaf node even if children is empty. */
	isLeaf?: boolean;
	/** Optional trailing badge, count, or metadata element. */
	badge?: React.ReactNode;
}

export interface SoftTreeProps {
	/** Hierarchical tree data. */
	nodes: readonly SoftTreeNode[];
	/** Keys of currently expanded nodes (controlled). */
	expandedKeys?: readonly string[];
	/** Initially expanded keys on mount (uncontrolled). */
	defaultExpandedKeys?: readonly string[];
	/** Callback when nodes are expanded or collapsed. */
	onExpand?: (expandedKeys: string[], info: { node: SoftTreeNode; expanded: boolean }) => void;
	/** Keys of currently selected nodes (controlled). */
	selectedKeys?: readonly string[];
	/** Initially selected keys on mount (uncontrolled). */
	defaultSelectedKeys?: readonly string[];
	/** Callback when nodes are selected. */
	onSelect?: (selectedKeys: string[], info: { node: SoftTreeNode; selected: boolean }) => void;
	/** Selection mode: single or multiple. Defaults to "single". */
	selectionMode?: "single" | "multiple";
	/** Enable checkbox cascade selection. */
	checkable?: boolean;
	/** Keys of currently checked nodes (controlled). */
	checkedKeys?: readonly string[];
	/** Initially checked keys on mount (uncontrolled). */
	defaultCheckedKeys?: readonly string[];
	/** Callback when checkboxes are toggled. */
	onCheck?: (checkedKeys: string[], info: { node: SoftTreeNode; checked: boolean }) => void;
	/** Screen-reader label describing the tree purpose. Required for a11y. */
	label: string;
	/** DOM id of an element that labels this tree. */
	ariaLabelledBy?: string;
	/** Whether to render organic capillary branch guide lines. Defaults to true. */
	showLines?: boolean;
	/** Optional text to filter and highlight matching nodes (auto-expands ancestors). */
	filterText?: string;
	/** Surface material ground. */
	material?: SoftMaterial;
	/** Tone family for highlights and marks. */
	tone?: IrisTone;
	/** CSS class name. */
	className?: string;
	/** Inline styles. */
	style?: React.CSSProperties;
}

interface NodeMeta {
	node: SoftTreeNode;
	parentKey: string | null;
	level: number;
	posInSet: number;
	setSize: number;
	childrenKeys: string[];
}

/**
 * A hierarchical tree navigation and selection view.
 *
 * ## WAI-ARIA Tree APG Compliance
 *
 * Adheres strictly to the WAI-ARIA Tree View pattern:
 * - `role="tree"` on container with required accessible name (`label` / `ariaLabelledBy`).
 * - `role="treeitem"` on each node with `aria-expanded`, `aria-selected`, `aria-level`,
 *   `aria-posinset`, `aria-setsize`, and `aria-disabled`.
 * - `role="group"` on child branch containers.
 * - `aria-checked="true" | "false" | "mixed"` when `checkable` is enabled.
 * - Arrow key navigation, Home/End jumping, Space/Enter selection, and type-ahead.
 *
 * ## Organic Capillary Lines
 *
 * In watercolor/wash design, hierarchical trees mirror the branching veins of
 * botanical specimens or Chinese xuan paper capillary fibers. `showLines` renders
 * delicate connecting guide lines with responsive spring-damped fold toggles.
 *
 * ```tsx
 * <SoftTree
 *   label="Project Files"
 *   nodes={[
 *     {
 *       key: "src",
 *       label: "src",
 *       children: [
 *         { key: "index.ts", label: "index.ts", isLeaf: true },
 *         { key: "SoftTree.tsx", label: "SoftTree.tsx", isLeaf: true },
 *       ],
 *     },
 *   ]}
 * />
 * ```
 */
export const SoftTree = forwardRef<HTMLDivElement, SoftTreeProps>(function SoftTree(
	{
		nodes,
		expandedKeys: controlledExpanded,
		defaultExpandedKeys = [],
		onExpand,
		selectedKeys: controlledSelected,
		defaultSelectedKeys = [],
		onSelect,
		selectionMode = "single",
		checkable = false,
		checkedKeys: controlledChecked,
		defaultCheckedKeys = [],
		onCheck,
		label,
		ariaLabelledBy,
		showLines = true,
		filterText,
		material,
		tone = "iris",
		className,
		style,
	},
	ref,
) {
	useStyles();
	const generatedId = useId();
	const surface = useMaterial(material ? { material, tone } : {});

	// Uncontrolled states
	const [internalExpanded, setInternalExpanded] = useState<string[]>(
		() => defaultExpandedKeys as string[],
	);
	const [internalSelected, setInternalSelected] = useState<string[]>(
		() => defaultSelectedKeys as string[],
	);
	const [internalChecked, setInternalChecked] = useState<string[]>(
		() => defaultCheckedKeys as string[],
	);
	const [focusedKey, setFocusedKey] = useState<string | null>(null);

	const isControlledExpand = controlledExpanded !== undefined;
	const isControlledSelect = controlledSelected !== undefined;
	const isControlledCheck = controlledChecked !== undefined;

	const expandedList = isControlledExpand ? controlledExpanded : internalExpanded;
	const selectedList = isControlledSelect ? controlledSelected : internalSelected;
	const checkedList = isControlledCheck ? controlledChecked : internalChecked;

	const expandedSet = useMemo(() => new Set(expandedList), [expandedList]);
	const selectedSet = useMemo(() => new Set(selectedList), [selectedList]);
	const checkedSet = useMemo(() => new Set(checkedList), [checkedList]);

	// Build metadata index map
	const { metaMap } = useMemo(() => {
		const map = new Map<string, NodeMeta>();

		function traverse(list: readonly SoftTreeNode[], parentKey: string | null, level: number) {
			const count = list.length;
			list.forEach((node, index) => {
				const children = node.children ?? [];
				const childrenKeys = children.map((c) => c.key);
				map.set(node.key, {
					node,
					parentKey,
					level,
					posInSet: index + 1,
					setSize: count,
					childrenKeys,
				});
				if (children.length > 0) {
					traverse(children, node.key, level + 1);
				}
			});
		}

		traverse(nodes, null, 1);
		return { metaMap: map };
	}, [nodes]);

	// Compute Indeterminate keys for checkboxes
	const indeterminateSet = useMemo(() => {
		if (!checkable) return new Set<string>();
		const set = new Set<string>();

		function checkState(key: string): { total: number; checked: number } {
			const meta = metaMap.get(key);
			if (!meta) return { total: 0, checked: 0 };
			if (meta.childrenKeys.length === 0) {
				return { total: 1, checked: checkedSet.has(key) ? 1 : 0 };
			}
			let tot = 0;
			let chk = 0;
			for (const childKey of meta.childrenKeys) {
				const res = checkState(childKey);
				tot += res.total;
				chk += res.checked;
			}
			if (chk > 0 && chk < tot) {
				set.add(key);
			}
			return { total: tot, checked: chk };
		}

		for (const node of nodes) {
			checkState(node.key);
		}
		return set;
	}, [checkable, nodes, metaMap, checkedSet]);

	// Auto-expand ancestors when filtering
	useEffect(() => {
		if (!filterText || filterText.trim() === "") return;
		const query = filterText.toLowerCase();
		const toExpand = new Set<string>(expandedSet);
		let changed = false;

		for (const [, meta] of metaMap.entries()) {
			const text = String(meta.node.label).toLowerCase();
			if (text.includes(query)) {
				// Expand all ancestors
				let curr = meta.parentKey;
				while (curr) {
					if (!toExpand.has(curr)) {
						toExpand.add(curr);
						changed = true;
					}
					curr = metaMap.get(curr)?.parentKey ?? null;
				}
			}
		}

		if (changed) {
			const arr = Array.from(toExpand);
			if (!isControlledExpand) setInternalExpanded(arr);
			const firstNode = nodes[0];
			if (firstNode) {
				onExpand?.(arr, { node: firstNode, expanded: true });
			}
		}
	}, [filterText, metaMap, isControlledExpand, onExpand, expandedSet, nodes]);

	// Calculate visible flattened list for linear keyboard navigation
	const visibleNodes = useMemo(() => {
		const list: SoftTreeNode[] = [];

		function collect(nList: readonly SoftTreeNode[]) {
			for (const node of nList) {
				list.push(node);
				const hasChildren = (node.children?.length ?? 0) > 0;
				if (hasChildren && expandedSet.has(node.key) && node.children) {
					collect(node.children);
				}
			}
		}

		collect(nodes);
		return list;
	}, [nodes, expandedSet]);

	// Ensure focused key is valid
	useEffect(() => {
		const firstNode = visibleNodes[0];
		if (focusedKey === null && firstNode) {
			setFocusedKey(firstNode.key);
		} else if (focusedKey !== null && !metaMap.has(focusedKey)) {
			setFocusedKey(firstNode?.key ?? null);
		}
	}, [focusedKey, visibleNodes, metaMap]);

	const toggleExpand = useCallback(
		(node: SoftTreeNode) => {
			const key = node.key;
			const isExpanded = expandedSet.has(key);
			const next = isExpanded ? expandedList.filter((k) => k !== key) : [...expandedList, key];
			if (!isControlledExpand) setInternalExpanded(next);
			onExpand?.(next, { node, expanded: !isExpanded });
		},
		[expandedSet, expandedList, isControlledExpand, onExpand],
	);

	const selectNode = useCallback(
		(node: SoftTreeNode) => {
			if (node.disabled) return;
			const key = node.key;
			let next: string[];
			const isSelected = selectedSet.has(key);

			if (selectionMode === "multiple") {
				next = isSelected ? selectedList.filter((k) => k !== key) : [...selectedList, key];
			} else {
				next = [key];
			}

			if (!isControlledSelect) setInternalSelected(next);
			onSelect?.(next, { node, selected: !isSelected });
		},
		[selectedSet, selectedList, selectionMode, isControlledSelect, onSelect],
	);

	const checkNode = useCallback(
		(node: SoftTreeNode) => {
			if (node.disabled) return;
			const key = node.key;
			const isChecked = checkedSet.has(key);
			const targetState = !isChecked;

			// Gather all descendants
			const descendants: string[] = [];
			function collectDescendants(k: string) {
				const meta = metaMap.get(k);
				if (!meta) return;
				for (const childKey of meta.childrenKeys) {
					descendants.push(childKey);
					collectDescendants(childKey);
				}
			}
			collectDescendants(key);

			const nextChecked = new Set(checkedSet);
			if (targetState) {
				nextChecked.add(key);
				for (const d of descendants) nextChecked.add(d);
			} else {
				nextChecked.delete(key);
				for (const d of descendants) nextChecked.delete(d);
			}

			// Recompute ancestor states up to root
			let curr = metaMap.get(key)?.parentKey;
			while (curr) {
				const meta = metaMap.get(curr);
				if (!meta) break;
				const allChildrenChecked = meta.childrenKeys.every((c) => nextChecked.has(c));
				if (allChildrenChecked) {
					nextChecked.add(curr);
				} else {
					nextChecked.delete(curr);
				}
				curr = meta.parentKey;
			}

			const arr = Array.from(nextChecked);
			if (!isControlledCheck) setInternalChecked(arr);
			onCheck?.(arr, { node, checked: targetState });
		},
		[checkedSet, metaMap, isControlledCheck, onCheck],
	);

	// Keyboard APG model
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (!focusedKey) return;
			const currentIndex = visibleNodes.findIndex((n) => n.key === focusedKey);
			if (currentIndex === -1) return;

			const currentNode = visibleNodes[currentIndex];
			if (!currentNode) return;
			const meta = metaMap.get(focusedKey);
			const hasChildren = (currentNode.children?.length ?? 0) > 0;
			const isExpanded = expandedSet.has(focusedKey);

			switch (e.key) {
				case "ArrowDown": {
					e.preventDefault();
					if (currentIndex < visibleNodes.length - 1) {
						const nextNode = visibleNodes[currentIndex + 1];
						if (nextNode) setFocusedKey(nextNode.key);
					}
					break;
				}
				case "ArrowUp": {
					e.preventDefault();
					if (currentIndex > 0) {
						const prevNode = visibleNodes[currentIndex - 1];
						if (prevNode) setFocusedKey(prevNode.key);
					}
					break;
				}
				case "ArrowRight": {
					e.preventDefault();
					if (hasChildren) {
						if (!isExpanded) {
							toggleExpand(currentNode);
						} else if (currentNode.children && currentNode.children.length > 0) {
							const firstChild = currentNode.children[0];
							if (firstChild) setFocusedKey(firstChild.key);
						}
					}
					break;
				}
				case "ArrowLeft": {
					e.preventDefault();
					if (hasChildren && isExpanded) {
						toggleExpand(currentNode);
					} else if (meta?.parentKey) {
						setFocusedKey(meta.parentKey);
					}
					break;
				}
				case "Home": {
					e.preventDefault();
					if (visibleNodes.length > 0) {
						const firstNode = visibleNodes[0];
						if (firstNode) setFocusedKey(firstNode.key);
					}
					break;
				}
				case "End": {
					e.preventDefault();
					if (visibleNodes.length > 0) {
						const lastNode = visibleNodes[visibleNodes.length - 1];
						if (lastNode) setFocusedKey(lastNode.key);
					}
					break;
				}
				case "Enter":
				case " ": {
					e.preventDefault();
					if (checkable) {
						checkNode(currentNode);
					} else {
						selectNode(currentNode);
					}
					break;
				}
				case "*": {
					// Expand all siblings at current level
					e.preventDefault();
					if (meta) {
						const siblings = meta.parentKey
							? (metaMap.get(meta.parentKey)?.childrenKeys ?? [])
							: nodes.map((n) => n.key);
						const next = new Set(expandedList);
						for (const k of siblings) {
							if ((metaMap.get(k)?.childrenKeys.length ?? 0) > 0) {
								next.add(k);
							}
						}
						const arr = Array.from(next);
						if (!isControlledExpand) setInternalExpanded(arr);
						onExpand?.(arr, { node: currentNode, expanded: true });
					}
					break;
				}
				default:
					// Type-ahead jumping
					if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
						const char = e.key.toLowerCase();
						for (let i = 1; i <= visibleNodes.length; i++) {
							const idx = (currentIndex + i) % visibleNodes.length;
							const candidate = visibleNodes[idx];
							if (candidate) {
								const text = String(candidate.label).toLowerCase();
								if (text.startsWith(char)) {
									e.preventDefault();
									setFocusedKey(candidate.key);
									break;
								}
							}
						}
					}
					break;
			}
		},
		[
			focusedKey,
			visibleNodes,
			metaMap,
			expandedSet,
			toggleExpand,
			checkable,
			checkNode,
			selectNode,
			nodes,
			expandedList,
			isControlledExpand,
			onExpand,
		],
	);

	// Recursive node renderer
	const renderTreeNode = (node: SoftTreeNode) => {
		const meta = metaMap.get(node.key);
		if (!meta) return null;

		const hasChildren = (node.children?.length ?? 0) > 0 && !node.isLeaf;
		const isExpanded = expandedSet.has(node.key);
		const isSelected = selectedSet.has(node.key);
		const isChecked = checkedSet.has(node.key);
		const isIndeterminate = indeterminateSet.has(node.key);
		const isFocused = focusedKey === node.key;
		const nodeDomId = `${generatedId}-node-${node.key}`;

		return (
			<li key={node.key} role="none" className="ui-lib-soft-tree__item-wrapper">
				<div
					id={nodeDomId}
					role="treeitem"
					tabIndex={isFocused ? 0 : -1}
					aria-expanded={hasChildren ? isExpanded : undefined}
					aria-selected={isSelected}
					aria-checked={checkable ? (isIndeterminate ? "mixed" : isChecked) : undefined}
					aria-level={meta.level}
					aria-posinset={meta.posInSet}
					aria-setsize={meta.setSize}
					aria-disabled={node.disabled ? true : undefined}
					className={[
						"ui-lib-soft-tree__node",
						isSelected ? "ui-lib-soft-tree__node--selected" : undefined,
						isFocused ? "ui-lib-soft-tree__node--focused" : undefined,
						node.disabled ? "ui-lib-soft-tree__node--disabled" : undefined,
					]
						.filter(Boolean)
						.join(" ")}
					style={{
						paddingLeft: `calc(${meta.level - 1} * var(--moe-tree-indent, 20px) + 8px)`,
					}}
					onClick={() => {
						setFocusedKey(node.key);
						if (checkable) {
							checkNode(node);
						} else {
							selectNode(node);
						}
					}}
					onKeyDown={handleKeyDown}
				>
					{/* Expand / Collapse Chevron */}
					<span
						className={[
							"ui-lib-soft-tree__chevron",
							hasChildren ? "ui-lib-soft-tree__chevron--active" : undefined,
							isExpanded ? "ui-lib-soft-tree__chevron--expanded" : undefined,
						]
							.filter(Boolean)
							.join(" ")}
						aria-hidden="true"
						onClick={(e) => {
							if (hasChildren) {
								e.stopPropagation();
								toggleExpand(node);
							}
						}}
					>
						{hasChildren && (
							<svg
								viewBox="0 0 12 12"
								width="10"
								height="10"
								aria-hidden="true"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.7"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M4.5 2.5 L8 6 L4.5 9.5" />
							</svg>
						)}
					</span>

					{/* Checkbox (if enabled) */}
					{checkable && (
						<span
							className={[
								"ui-lib-soft-tree__checkbox",
								isChecked ? "ui-lib-soft-tree__checkbox--checked" : undefined,
								isIndeterminate ? "ui-lib-soft-tree__checkbox--indeterminate" : undefined,
							]
								.filter(Boolean)
								.join(" ")}
							aria-hidden="true"
							onClick={(e) => {
								e.stopPropagation();
								checkNode(node);
							}}
						>
							{isChecked && (
								<svg
									viewBox="0 0 12 12"
									width="9"
									height="9"
									aria-hidden="true"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M2.5 6 L5 8.5 L9.5 3.5" />
								</svg>
							)}
							{isIndeterminate && (
								<svg
									viewBox="0 0 12 12"
									width="9"
									height="9"
									aria-hidden="true"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
								>
									<path d="M3 6 L9 6" />
								</svg>
							)}
						</span>
					)}

					{/* Leading Icon */}
					{node.icon && (
						<span className="ui-lib-soft-tree__icon" aria-hidden="true">
							{node.icon}
						</span>
					)}

					{/* Label */}
					<span className="ui-lib-soft-tree__label">{node.label}</span>

					{/* Badge / Metadata */}
					{node.badge && (
						<span className="ui-lib-soft-tree__badge" aria-hidden="true">
							{node.badge}
						</span>
					)}
				</div>

				{/* Child group subtree */}
				{hasChildren && isExpanded && node.children && (
					/* biome-ignore lint/a11y/useSemanticElements: WAI-ARIA Tree specification requires role="group" for tree sub-levels */
					<ul
						role="group"
						className={[
							"ui-lib-soft-tree__group",
							showLines ? "ui-lib-soft-tree__group--lines" : undefined,
						]
							.filter(Boolean)
							.join(" ")}
					>
						{node.children.map(renderTreeNode)}
					</ul>
				)}
			</li>
		);
	};

	return (
		<div
			ref={ref}
			role="tree"
			aria-label={label}
			aria-labelledby={ariaLabelledBy}
			aria-multiselectable={selectionMode === "multiple"}
			tabIndex={-1}
			onKeyDown={handleKeyDown}
			className={[
				"ui-lib-soft-tree",
				showLines ? "ui-lib-soft-tree--lines" : undefined,
				surface.className,
				className,
			]
				.filter(Boolean)
				.join(" ")}
			style={{ ...style, ...surface.style }}
			data-ui-lib-material={material && material !== "plain" ? material : undefined}
			data-ui-lib-tone={tone}
		>
			{/* biome-ignore lint/a11y/useSemanticElements: WAI-ARIA Tree specification requires role="group" for tree sub-levels */}
			<ul role="group" className="ui-lib-soft-tree__root-list">
				{nodes.map(renderTreeNode)}
			</ul>
		</div>
	);
});

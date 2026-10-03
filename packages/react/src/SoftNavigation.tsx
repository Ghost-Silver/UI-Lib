import { forwardRef } from "react";
import { pageRange } from "./softNavigationRange.js";

/* --------------------------------------------------------------- pagination -- */

export interface SoftPaginationProps
	extends Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
	/** Total pages. */
	count: number;
	/** The one-based current page. */
	page: number;
	onChange: (page: number) => void;
	/** Pages either side of the current one before it becomes an ellipsis. */
	siblingCount?: number;
	/** The first and last page are always shown, with an ellipsis between. */
	boundaryCount?: number;
	/** What the navigation is for. "分页" is the default and is usually enough. */
	label?: string;
	/** Build a link instead of a button, for a server-rendered list. */
	hrefFor?: (page: number) => string;
}

/**
 * Page numbers, as a list of links.
 *
 * ## The current page is not a control
 *
 * It is a `<span>` with `aria-current="page"`, not a button and not a link. Both
 * alternatives are worse and both are what most implementations do:
 *
 * - As a **button**, it is focusable and announced as an action, so a reader
 *   lands on a control that does nothing — pressing it re-renders the same page.
 * - As a **link**, it is announced as somewhere to go, and the user navigates to
 *   where they already are.
 *
 * `aria-current` is what tells a reader *where they are*; the absence of a
 * control is what tells them there is nothing to do here. A `class="active"` on
 * a link conveys neither.
 *
 * ## The list is a list
 *
 * `<ul>`, because page numbers are a set of peers and a reader should be able to
 * hear how many there are. A row of divs announces nothing about its length.
 *
 * ```tsx
 * <SoftPagination count={12} page={page} onChange={setPage} />
 * ```
 */
export const SoftPagination = forwardRef<HTMLElement, SoftPaginationProps>(
	function SoftPagination(
		{
			count,
			page,
			onChange,
			siblingCount = 1,
			boundaryCount = 1,
			label = "分页",
			hrefFor,
			className,
			...props
		},
		ref,
	) {
		const items = pageRange(page, count, siblingCount, boundaryCount);

		/**
		 * One page, as a control, a current marker, or an elision.
		 *
		 * The current page is rendered as a span even though the caller asked for
		 * links, because there is no page to link to — and a link that goes
		 * nowhere is the specific failure the doc comment above is about.
		 */
		const render = (value: number) => {
			const current = value === page;
			const text = String(value);
			const shared = { className: "ui-lib-soft-pagination__page" };

			if (current) {
				return (
					<span key={value} {...shared} data-ui-lib-current="" aria-current="page">
						{text}
					</span>
				);
			}
			if (hrefFor) {
				return (
					<a
						key={value}
						{...shared}
						href={hrefFor(value)}
						aria-label={`第 ${value} 页`}
						onClick={(event) => {
							// A plain left click is handled in-page; anything else (a new
							// tab, a modifier, a middle click) is left to the browser,
							// which is what a real link is for.
							if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)
								return;
							event.preventDefault();
							onChange(value);
						}}
					>
						{text}
					</a>
				);
			}
			return (
				<button
					key={value}
					{...shared}
					type="button"
					aria-label={`第 ${value} 页`}
					onClick={() => onChange(value)}
				>
					{text}
				</button>
			);
		};

		return (
			<nav
				ref={ref}
				aria-label={label}
				className={className ? `ui-lib-soft-pagination ${className}` : "ui-lib-soft-pagination"}
				{...props}
			>
				<ul className="ui-lib-soft-pagination__list">
					{items.map((item, index) =>
						item === "gap" ? (
							// The gap is not a control and has nothing to announce; a reader
							// hearing "ellipsis" learns nothing they did not already know
							// from the page numbers either side of it.
							/*
							 * Keyed by the neighbour, not by the position.
							 *
							 * The position is exactly what changes when a page is added,
							 * so a gap keyed by its index would be reused for a different
							 * gap and React would keep the wrong one. The neighbour is
							 * what the gap actually stands in for.
							 */
							<li
								key={`gap-after-${items[index - 1] ?? "start"}`}
								className="ui-lib-soft-pagination__gap"
								aria-hidden="true"
							>
								…
							</li>
						) : (
							<li key={item}>{render(item)}</li>
						),
					)}
				</ul>
			</nav>
		);
	},
);

/* --------------------------------------------------------------- breadcrumb -- */

export interface SoftBreadcrumbItem {
	label: string;
	/** Omit on the last item, which is where the reader already is. */
	href?: string;
	onClick?: () => void;
}

export interface SoftBreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
	/** In order, from the root. The last one is the current location. */
	items: readonly SoftBreadcrumbItem[];
	label?: string;
	/** The separator glyph. Decorative, so it is hidden from readers. */
	separator?: React.ReactNode;
}

/**
 * Where you are, and how you got there.
 *
 * **An ordered list, not an unordered one, and that is not pedantry.** A
 * breadcrumb is a path: `首页 › 材质 › 水彩纸` is a sequence in which the third
 * only makes sense inside the second. A reader that announces "list, 3 items"
 * has thrown away the one thing the component exists to say, and `<ol>` is how
 * the sequence survives being spoken.
 *
 * The separators are `aria-hidden`, because "›" read aloud is noise between
 * every pair — the structure already says the items are related and in order.
 *
 * The **last item is never a link**: it is where the reader already is, so
 * `aria-current="page"` marks it and there is nothing to press. A breadcrumb
 * whose last crumb links to the current page is a breadcrumb with a dead control
 * at the end of every visit.
 *
 * ```tsx
 * <SoftBreadcrumb items={[{ label: "首页", href: "/" }, { label: "材质", href: "/m" }, { label: "水彩纸" }]} />
 * ```
 */
export const SoftBreadcrumb = forwardRef<HTMLElement, SoftBreadcrumbProps>(
	function SoftBreadcrumb(
		{ items, label = "位置", separator = "›", className, ...props },
		ref,
	) {
		return (
			<nav
				ref={ref}
				aria-label={label}
				className={className ? `ui-lib-soft-breadcrumb ${className}` : "ui-lib-soft-breadcrumb"}
				{...props}
			>
				<ol className="ui-lib-soft-breadcrumb__list">
					{items.map((item, index) => {
						const last = index === items.length - 1;
						// The last item wins even if the caller passed an href for it: the
						// caller is describing a trail and the last crumb is where the trail
						// ends, whether or not they built a link for it.
						const interactive =
							!last && (item.href !== undefined || item.onClick !== undefined);
						return (
							<li
								/*
								 * The label alone is not unique here and the position alone is
								 * not stable: a trail may legitimately contain the same label
								 * twice — a folder with a subfolder of the same name — and a
								 * trail also reorders when the reader moves. The label is the
								 * identity and the position disambiguates, which is the
								 * combination that is both stable and unique for a list this
								 * short and this authored.
								 */
								// biome-ignore lint/suspicious/noArrayIndexKey: the label is the identity and the index disambiguates a legitimate repeat
								key={`${item.label}-${index}`}
								className="ui-lib-soft-breadcrumb__item"
							>
								{index > 0 && (
									<span className="ui-lib-soft-breadcrumb__sep" aria-hidden="true">
										{separator}
									</span>
								)}
								{interactive ? (
									item.href ? (
										<a
											className="ui-lib-soft-breadcrumb__link"
											href={item.href}
											onClick={(event) => {
												if (!item.onClick) return;
												if (
													event.metaKey ||
													event.ctrlKey ||
													event.shiftKey ||
													event.button !== 0
												)
													return;
												event.preventDefault();
												item.onClick();
											}}
										>
											{item.label}
										</a>
									) : (
										<button
											type="button"
											className="ui-lib-soft-breadcrumb__button"
											onClick={item.onClick}
										>
											{item.label}
										</button>
									)
								) : (
									<span
										className="ui-lib-soft-breadcrumb__current"
										// Only on the last one. Marking every crumb as current would say
										// the reader is in several places at once.
										aria-current={last ? "page" : undefined}
									>
										{item.label}
									</span>
								)}
							</li>
						);
					})}
				</ol>
			</nav>
		);
	},
);

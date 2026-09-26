const STYLE_ID = "ui-lib-styles";

const CSS = `
[data-ui-lib-glass="fallback"] {
	background: linear-gradient(140deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04));
	-webkit-backdrop-filter: blur(18px) saturate(180%);
	backdrop-filter: blur(18px) saturate(180%);
	border: 1px solid rgba(255, 255, 255, 0.22);
	box-shadow:
		0 1px 0 0 rgba(255, 255, 255, 0.35) inset,
		0 24px 60px -20px rgba(0, 0, 0, 0.55);
}
[data-ui-lib-glass="off"] {
	background: rgba(255, 255, 255, 0.06);
	border: 1px solid rgba(255, 255, 255, 0.14);
}
`;

/**
 * Injects the (tiny) fallback stylesheet once per document.
 *
 * Keeps the package import-free of CSS bundler configuration: `import
 * "@ui-lib/react/styles.css"` is nice for apps, but a library that silently
 * needs a CSS import is a support ticket waiting to happen.
 */
export function ensureStyles(doc: Document = document): void {
	if (doc.getElementById(STYLE_ID)) return;
	const style = doc.createElement("style");
	style.id = STYLE_ID;
	style.textContent = CSS;
	doc.head.appendChild(style);
}

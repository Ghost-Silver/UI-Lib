import { useEffect } from "react";
import { ensureStyles } from "./injectStyles.js";

/**
 * Make sure the stylesheet is in the document.
 *
 * ## Why this exists
 *
 * It was called from three components, and all three were the GPU side —
 * `GlassStage`, `Magnetic`, `Reveal`. **Not one `Soft*` component called it**, so
 * a page that imported `SoftCard` and nothing else rendered an unstyled
 * `div`: 74 elements with the right class names and no rule to match them, and
 * every token in the library undefined. Measured on a page built from the
 * component layer alone: `--moe-card` read as empty on `<html>`, on `<body>`,
 * and on the element using it.
 *
 * Every page in this application happened to also render a `Magnetic` nav link
 * or a `GlassStage`, which injected the sheet as a side effect — which is exactly
 * how a bug like this survives: the one place it is invisible is the place
 * everyone looks.
 *
 * ## One hook rather than one line per component
 *
 * The call is idempotent and cheap — a `getElementById` — but 24 components
 * remembering to make it is 24 chances to forget, and the failure is silent on
 * any page that happens to include a GPU component. A hook that the component
 * calls for its own reason is the version that does not depend on anyone
 * remembering.
 */
export function useStyles(): void {
	useEffect(() => {
		ensureStyles();
	}, []);
}

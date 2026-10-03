import type { IrisTone } from "@ui-lib/core";
import type { GlassPanelOptions } from "@ui-lib/renderer";
import type { CSSProperties, ReactNode } from "react";

/**
 * The prop surface every IRIS component shares.
 *
 * `tone` picks the accent; everything else is the glass panel's own optical
 * vocabulary, unrenamed, so learning one component teaches the rest. DOM
 * attributes are deliberately *not* included here: a span and a button do not
 * have the same `onClick`, and extending both would make the interface
 * unsatisfiable. Each component adds the attributes for the element it renders.
 */
export interface IrisPanelProps extends GlassPanelOptions {
	/** Accent family. Defaults to the brand violet. */
	tone?: IrisTone;
	children?: ReactNode;
	className?: string;
	style?: CSSProperties;
}

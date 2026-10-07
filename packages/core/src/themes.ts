/**
 * The four themes, as data, so they can be used without this library's components.
 *
 * ## Why this is in `core`
 *
 * The theme values used to exist only as CSS custom properties inside the React
 * package's stylesheet. That made them unreachable for the one case a design
 * system most needs to support: **someone building their own components who wants
 * this palette.** They would have had to install the React bindings, read a
 * 4000-line stylesheet string, and copy values out of it by hand.
 *
 * The definition is the specification's own — `IrisThemeTokens` from
 * `IrisUiLibDesignTokens.ts`, ten values for each of four themes, taken value for
 * value. The keys are the document's, so a caller reading the specification does
 * not have to translate.
 *
 * ## What this is not
 *
 * It is not a stylesheet. `themeToCustomProperties` produces the variable names,
 * and emitting them is the caller's business — a React app injects them, a static
 * site writes them into a `.css` file, a Canvas app reads them directly. That is
 * the difference between a palette and a framework.
 */

/** The four modes the specification names. */
export type ThemeMode = "cyberpunk" | "minimalist" | "obsidian" | "anime";

export interface ThemeTokens {
	/** The name the specification gives it, for a picker. */
	name: string;
	bgPrimary: string;
	bgSecondary: string;
	bgCard: string;
	borderHighlight: string;
	accentCyan: string;
	accentPink: string;
	accentPurple: string;
	accentGold: string;
	cardRadius: string;
}

/**
 * The palette, verbatim from the specification.
 *
 * **Not converted to OKLCH, and that is a decision.** The other half of this
 * library writes colour in OKLCH because it is perceptually uniform, which matters
 * when interpolating. These are *published values* — a designer comparing this
 * file to the document should find the same strings — and they are not
 * interpolated anywhere; `oklchToSrgb` is exported next door for a caller who
 * wants either the conversion or the contrast maths.
 */
export const THEMES: Record<ThemeMode, ThemeTokens> = {
	cyberpunk: {
		name: "Cyberpunk Neon Hologram",
		bgPrimary: "#07090e",
		bgSecondary: "rgba(15, 23, 42, 0.75)",
		bgCard: "rgba(18, 26, 47, 0.65)",
		borderHighlight: "#00f0ff",
		accentCyan: "#00f0ff",
		accentPink: "#ff0055",
		accentPurple: "#a855f7",
		accentGold: "#f59e0b",
		cardRadius: "14px",
	},
	minimalist: {
		name: "Minimalist Ceramic White",
		bgPrimary: "#f8fafc",
		bgSecondary: "#ffffff",
		bgCard: "#ffffff",
		borderHighlight: "#2563eb",
		accentCyan: "#0284c7",
		accentPink: "#e11d48",
		accentPurple: "#7c3aed",
		accentGold: "#d97706",
		cardRadius: "22px",
	},
	obsidian: {
		name: "Dark Obsidian Spatial Computing (UE5)",
		bgPrimary: "#030712",
		bgSecondary: "rgba(17, 24, 39, 0.85)",
		bgCard: "rgba(31, 41, 55, 0.6)",
		borderHighlight: "#f59e0b",
		accentCyan: "#38bdf8",
		accentPink: "#fb7185",
		accentPurple: "#c084fc",
		accentGold: "#fbbf24",
		cardRadius: "16px",
	},
	anime: {
		name: "Ethereal Pastel Anime (Su Liluo)",
		bgPrimary: "#fdf4f8",
		bgSecondary: "rgba(255, 255, 255, 0.9)",
		bgCard: "rgba(255, 255, 255, 0.8)",
		borderHighlight: "#ec4899",
		accentCyan: "#06b6d4",
		accentPink: "#f43f5e",
		accentPurple: "#d946ef",
		accentGold: "#f59e0b",
		cardRadius: "26px",
	},
};

/** The modes, in the order the specification lists them. */
export const THEME_MODES: readonly ThemeMode[] = [
	"cyberpunk",
	"minimalist",
	"obsidian",
	"anime",
];

/**
 * Whether a string is one of the four modes.
 *
 * Exported because every caller that takes a theme from outside — a query string,
 * a config file, a form — needs it, and each of them writing its own `includes`
 * check against a list it also wrote is how a fifth mode gets half-added.
 */
export function isThemeMode(value: unknown): value is ThemeMode {
	return typeof value === "string" && (THEME_MODES as readonly string[]).includes(value);
}

/** The CSS variable each token maps to, when a theme is emitted as custom properties. */
const TOKEN_VARIABLE: Record<keyof Omit<ThemeTokens, "name">, string> = {
	bgPrimary: "--ui-theme-bg-primary",
	bgSecondary: "--ui-theme-bg-secondary",
	bgCard: "--ui-theme-bg-card",
	borderHighlight: "--ui-theme-border-highlight",
	accentCyan: "--ui-theme-accent-cyan",
	accentPink: "--ui-theme-accent-pink",
	accentPurple: "--ui-theme-accent-purple",
	accentGold: "--ui-theme-accent-gold",
	cardRadius: "--ui-theme-card-radius",
};

/**
 * The theme as CSS custom properties, ready to write into a rule.
 *
 * ```ts
 * const css = `:root[data-theme="obsidian"] { ${themeToCustomProperties(THEMES.obsidian)} }`;
 * ```
 *
 * Emitted rather than injected on purpose — this package does not own a document,
 * and a function that appended a `<style>` tag would be a function that cannot run
 * on a server.
 */
export function themeToCustomProperties(mode: ThemeMode | ThemeTokens): string {
	const theme = typeof mode === "string" ? THEMES[mode] : mode;
	return (Object.keys(TOKEN_VARIABLE) as (keyof typeof TOKEN_VARIABLE)[])
		.map((key) => `${TOKEN_VARIABLE[key]}: ${theme[key]};`)
		.join(" ");
}

/** The variable name for a token, for a caller building rules by hand. */
export function themeVariable(token: keyof typeof TOKEN_VARIABLE): string {
	return TOKEN_VARIABLE[token];
}

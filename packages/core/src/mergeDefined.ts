/**
 * Merge `partial` over `defaults`, skipping any key whose value is `undefined`.
 *
 * The option objects across the library are typed as "every field optional"
 * (`shift?: [number, number]` etc.). A plain `{ ...defaults, ...options }`
 * spread lets an explicitly `undefined` key clobber a defaults value, which is
 * how a caller that simply omits a field can still crash a downstream
 * `opts.shift[0]` read. This merge enforces the real contract: "not provided"
 * — `undefined` — means "use the default".
 */
export function mergeDefined<T extends object, P extends Partial<T>>(defaults: T, partial: P): T {
	const out: T = { ...defaults };
	for (const key of Object.keys(partial) as (keyof P)[]) {
		const value = partial[key];
		if (value !== undefined) (out as Record<PropertyKey, unknown>)[key] = value;
	}
	return out;
}
/** The kinds of owned resources exposed by the debug registry. */
export type ResourceKind =
	| "renderer"
	| "layer"
	| "panel"
	| "particle-system"
	| "world-object"
	| "post-graph"
	| "backdrop";

export interface ResourceSnapshot {
	readonly total: number;
	readonly byKind: Readonly<Record<ResourceKind, number>>;
}

export interface ResourceHandle {
	dispose(): void;
}

const RESOURCE_KINDS: readonly ResourceKind[] = [
	"renderer",
	"layer",
	"panel",
	"particle-system",
	"world-object",
	"post-graph",
	"backdrop",
];

/**
 * A small logical ownership registry for browser diagnostics and leak tests.
 *
 * This is intentionally not a GPU-memory estimator: browsers do not expose a
 * portable VRAM counter. It records every resource UI-Lib owns so repeated
 * mount/unmount tests can prove that the library releases its references and
 * disposal handles. Three.js still owns the backend-specific allocation.
 */
export class ResourceRegistry {
	private readonly resources = new Map<number, ResourceKind>();
	private nextId = 1;

	track(kind: ResourceKind): ResourceHandle {
		const id = this.nextId++;
		this.resources.set(id, kind);
		let disposed = false;
		return {
			dispose: () => {
				if (disposed) return;
				disposed = true;
				this.resources.delete(id);
			},
		};
	}

	snapshot(): ResourceSnapshot {
		const byKind = Object.fromEntries(RESOURCE_KINDS.map((kind) => [kind, 0])) as Record<
			ResourceKind,
			number
		>;
		for (const kind of this.resources.values()) byKind[kind]++;
		return Object.freeze({
			total: this.resources.size,
			byKind: Object.freeze(byKind),
		});
	}

	clear(): void {
		this.resources.clear();
	}
}

/** Process-wide diagnostics registry. It is lazy in the sense that importing it never touches the DOM. */
export const resourceRegistry = new ResourceRegistry();

export function getResourceSnapshot(): ResourceSnapshot {
	return resourceRegistry.snapshot();
}

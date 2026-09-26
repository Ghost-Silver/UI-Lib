/** Minimal disposable contract shared by every UI-Lib object. */
export interface Disposable {
	dispose(): void;
}

export type Teardown = Disposable | (() => void);

/**
 * Collects teardown callbacks and guarantees they run exactly once, in reverse
 * order. Every UI-Lib effect owns one, which is what makes "mount/unmount the
 * effect 50 times" a safe operation instead of a GPU memory leak.
 */
export class Disposer implements Disposable {
	private items: Teardown[] = [];
	private disposed = false;

	get isDisposed(): boolean {
		return this.disposed;
	}

	add<T extends Teardown>(item: T): T {
		if (this.disposed) {
			runTeardown(item);
			return item;
		}
		this.items.push(item);
		return item;
	}

	/** Adds a DOM listener and returns a function that removes only it. */
	listen<K extends keyof HTMLElementEventMap>(
		target: HTMLElement,
		type: K,
		handler: (e: HTMLElementEventMap[K]) => void,
		options?: AddEventListenerOptions,
	): void;
	listen(
		target: EventTarget,
		type: string,
		handler: EventListenerOrEventListenerObject,
		options?: AddEventListenerOptions,
	): void;
	listen(
		target: EventTarget,
		type: string,
		handler: EventListenerOrEventListenerObject,
		options?: AddEventListenerOptions,
	): void {
		target.addEventListener(type, handler, options);
		this.add(() => target.removeEventListener(type, handler, options));
	}

	/** Adds any object exposing `dispose()` (ResizeObserver, our own classes…). */
	own<T extends Disposable>(item: T): T {
		return this.add(item);
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		const items = this.items;
		this.items = [];
		for (let i = items.length - 1; i >= 0; i--) runTeardown(items[i]!);
	}
}

function runTeardown(item: Teardown): void {
	try {
		if (typeof item === "function") item();
		else item.dispose();
	} catch (error) {
		// Never let one failing teardown block the rest of the cleanup.
		if (typeof console !== "undefined") console.error("[ui-lib] teardown failed", error);
	}
}

/** Run `fn` on the next animation frame, cancellable. */
export function nextFrame(fn: (time: number) => void): () => void {
	if (typeof requestAnimationFrame === "undefined") {
		const id = setTimeout(() => fn(performance.now()), 16) as unknown as number;
		return () => clearTimeout(id);
	}
	const id = requestAnimationFrame(fn);
	return () => cancelAnimationFrame(id);
}

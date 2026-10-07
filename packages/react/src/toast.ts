import type { Tone } from "@ui-lib/core";
import { createContext, type ReactNode, useContext } from "react";
import type { SoftMaterial } from "./material.js";

export type ToastVariant = "info" | "success" | "warning" | "error" | "promise";
export type ToastPosition =
	| "top-right"
	| "top-center"
	| "top-left"
	| "bottom-right"
	| "bottom-center"
	| "bottom-left";

export type ToastMaterial = "glass" | SoftMaterial;

export interface ToastData {
	id: string;
	title?: ReactNode;
	message: ReactNode;
	variant?: ToastVariant;
	tone?: Tone;
	material?: ToastMaterial;
	duration?: number; // ms, default 4000. 0 = permanent until dismissed
	dismissible?: boolean;
	action?: {
		label: string;
		onClick: () => void;
	};
	createdAt: number;
}

export type ToastOptions = Partial<Omit<ToastData, "id" | "message" | "createdAt">>;

type ToastListener = (toasts: ToastData[]) => void;

class GlobalToastStore {
	private toasts: ToastData[] = [];
	private listeners = new Set<ToastListener>();
	private counter = 0;

	public getToasts(): ToastData[] {
		return [...this.toasts];
	}

	public subscribe(listener: ToastListener): () => void {
		this.listeners.add(listener);
		listener(this.getToasts());
		return () => {
			this.listeners.delete(listener);
		};
	}

	private notify() {
		const snapshot = this.getToasts();
		for (const listener of this.listeners) {
			listener(snapshot);
		}
	}

	public show(message: ReactNode, options: ToastOptions = {}): string {
		this.counter += 1;
		const id = `toast-${Date.now()}-${this.counter}`;
		const toast: ToastData = {
			id,
			message,
			variant: options.variant ?? "info",
			title: options.title,
			tone: options.tone,
			material: options.material ?? "glass",
			duration: options.duration ?? 4000,
			dismissible: options.dismissible ?? true,
			action: options.action,
			createdAt: Date.now(),
		};

		this.toasts = [toast, ...this.toasts];
		this.notify();
		return id;
	}

	public info(message: ReactNode, options?: ToastOptions): string {
		return this.show(message, { ...options, variant: "info", tone: options?.tone ?? "iris" });
	}

	public success(message: ReactNode, options?: ToastOptions): string {
		return this.show(message, {
			...options,
			variant: "success",
			tone: options?.tone ?? "mist",
		});
	}

	public warning(message: ReactNode, options?: ToastOptions): string {
		return this.show(message, {
			...options,
			variant: "warning",
			tone: options?.tone ?? "blossom",
		});
	}

	public error(message: ReactNode, options?: ToastOptions): string {
		return this.show(message, {
			...options,
			variant: "error",
			tone: options?.tone ?? "blossom",
		});
	}

	public async promise<T>(
		promiseObj: Promise<T>,
		messages: {
			loading: ReactNode;
			success: ReactNode | ((data: T) => ReactNode);
			error: ReactNode | ((err: unknown) => ReactNode);
		},
		options?: ToastOptions,
	): Promise<T> {
		const id = this.show(messages.loading, {
			...options,
			variant: "promise",
			duration: 0,
			dismissible: false,
		});

		try {
			const result = await promiseObj;
			const successMsg =
				typeof messages.success === "function" ? messages.success(result) : messages.success;

			this.update(id, {
				message: successMsg,
				variant: "success",
				tone: "mist",
				duration: 3500,
				dismissible: true,
			});
			return result;
		} catch (err) {
			const errorMsg =
				typeof messages.error === "function" ? messages.error(err) : messages.error;

			this.update(id, {
				message: errorMsg,
				variant: "error",
				tone: "blossom",
				duration: 5000,
				dismissible: true,
			});
			throw err;
		}
	}

	public update(id: string, patch: Partial<ToastData>): void {
		this.toasts = this.toasts.map((t) => (t.id === id ? { ...t, ...patch } : t));
		this.notify();
	}

	public dismiss(id?: string): void {
		if (id) {
			this.toasts = this.toasts.filter((t) => t.id !== id);
		} else {
			this.toasts = [];
		}
		this.notify();
	}
}

/** Global singleton toast dispatcher. */
export const toast = new GlobalToastStore();

export interface ToastContextValue {
	toast: typeof toast;
	toasts: ToastData[];
	dismiss: (id?: string) => void;
}

export const ToastContext = createContext<ToastContextValue>({
	toast,
	toasts: [],
	dismiss: (id) => toast.dismiss(id),
});

export function useToast(): ToastContextValue {
	return useContext(ToastContext);
}

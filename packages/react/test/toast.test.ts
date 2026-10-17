import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SoftToast, type ToastData, toast } from "../src/index.js";

describe("Toast store management", () => {
	it("dispatches show and updates toasts list", () => {
		toast.dismiss(); // Clear
		const id = toast.show("普通通知");

		const list = toast.getToasts();
		expect(list.length).toBe(1);
		const first = list[0];
		expect(first?.id).toBe(id);
		expect(first?.message).toBe("普通通知");
		expect(first?.variant).toBe("info");
	});

	it("dispatches typed helpers: info, success, warning, error", () => {
		toast.dismiss();
		const idInfo = toast.info("消息提示");
		const idSuccess = toast.success("操作成功");
		const idWarn = toast.warning("操作警告");
		const idError = toast.error("操作失败");

		const list = toast.getToasts();
		expect(list.length).toBe(4);
		expect(list.find((t) => t.id === idInfo)?.variant).toBe("info");
		expect(list.find((t) => t.id === idSuccess)?.variant).toBe("success");
		expect(list.find((t) => t.id === idWarn)?.variant).toBe("warning");
		expect(list.find((t) => t.id === idError)?.variant).toBe("error");
	});

	it("dismisses individual toast by id", () => {
		toast.dismiss();
		const id1 = toast.info("第1条");
		const id2 = toast.info("第2条");

		expect(toast.getToasts().length).toBe(2);
		toast.dismiss(id1);

		const remaining = toast.getToasts();
		expect(remaining.length).toBe(1);
		expect(remaining[0]?.id).toBe(id2);
	});

	it("handles promise toasts on resolution", async () => {
		toast.dismiss();
		const promise = Promise.resolve("done");

		const result = await toast.promise(promise, {
			loading: "正在处理...",
			success: (data) => `完成: ${data}`,
			error: "失败",
		});

		expect(result).toBe("done");
		const current = toast.getToasts();
		expect(current.length).toBe(1);
		expect(current[0]?.variant).toBe("success");
		expect(current[0]?.message).toBe("完成: done");
	});

	it("handles promise toasts on rejection", async () => {
		toast.dismiss();
		const promise = Promise.reject(new Error("network error"));

		await expect(
			toast.promise(promise, {
				loading: "正在处理...",
				success: "成功",
				error: (err) => `失败: ${(err as Error).message}`,
			}),
		).rejects.toThrow("network error");

		const current = toast.getToasts();
		expect(current.length).toBe(1);
		expect(current[0]?.variant).toBe("error");
		expect(current[0]?.message).toBe("失败: network error");
	});
});

describe("SoftToast component SSR", () => {
	const sampleToast: ToastData = {
		id: "toast-1",
		title: "同步完成",
		message: "所有水墨纹理已上传完毕",
		variant: "success",
		tone: "mist",
		material: "glass",
		duration: 3000,
		dismissible: true,
		createdAt: Date.now(),
		action: {
			label: "撤销",
			onClick: () => {},
		},
	};

	it("renders accessible status role and content", () => {
		const html = renderToString(
			React.createElement(SoftToast, { toast: sampleToast, onDismiss: () => {} }),
		);

		expect(html).toContain('role="status"');
		expect(html).toContain('aria-live="polite"');
		expect(html).toContain("同步完成");
		expect(html).toContain("所有水墨纹理已上传完毕");
		expect(html).toContain("撤销");
		expect(html).toContain("ui-lib-soft-toast--success");
		expect(html).toContain("ui-lib-soft-toast--glass");
	});

	it("renders alert role for error variants", () => {
		const errorToast: ToastData = {
			...sampleToast,
			id: "toast-err",
			variant: "error",
			title: "错误",
			message: "渲染崩溃",
		};

		const html = renderToString(
			React.createElement(SoftToast, { toast: errorToast, onDismiss: () => {} }),
		);

		expect(html).toContain('role="alert"');
		expect(html).toContain('aria-live="assertive"');
		expect(html).toContain("ui-lib-soft-toast--error");
	});
});

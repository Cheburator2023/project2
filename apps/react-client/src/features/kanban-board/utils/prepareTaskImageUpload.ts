import { KANBAN_BOARD_TASK_IMAGE_MAX_FULL_BYTES } from "@smart-anketa/api-contract";
/** Максимальная сторона полного изображения (lossless re-encode через canvas). */
const MAX_FULL_EDGE = 4096;
/** Максимальная сторона превью для списка / карточки. */
const THUMB_MAX_EDGE = 320;

export type PreparedTaskImageUpload = {
	full: Blob;
	thumb: Blob;
	mimeType: "image/png" | "image/webp";
	width: number;
	height: number;
	name: string;
};

function isImageFile(file: File): boolean {
	if (file.type.startsWith("image/")) return true;
	return /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name);
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Не удалось прочитать изображение"));
		};
		img.src = url;
	});
}

function fitDimensions(
	width: number,
	height: number,
	maxEdge: number,
): { width: number; height: number } {
	if (width <= maxEdge && height <= maxEdge) {
		return { width, height };
	}
	const scale = maxEdge / Math.max(width, height);
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale)),
	};
}

function drawToCanvas(
	img: HTMLImageElement,
	width: number,
	height: number,
): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Canvas недоступен в этом браузере");
	}
	ctx.drawImage(img, 0, 0, width, height);
	return canvas;
}

function canvasToBlob(
	canvas: HTMLCanvasElement,
	type: string,
	quality?: number,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) =>
				blob
					? resolve(blob)
					: reject(new Error("Не удалось закодировать изображение")),
			type,
			quality,
		);
	});
}

/**
 * Lossless-пайплайн: canvas снимает EXIF/метаданные, PNG — гарантированно без потерь;
 * WebP q=1 выбирается только если меньше PNG (визуально идентично для UI-скринов).
 */
async function encodeLossless(
	canvas: HTMLCanvasElement,
): Promise<{ blob: Blob; mimeType: "image/png" | "image/webp" }> {
	const png = await canvasToBlob(canvas, "image/png");
	try {
		const webp = await canvasToBlob(canvas, "image/webp", 1);
		if (webp.size > 0 && webp.size < png.size) {
			return { blob: webp, mimeType: "image/webp" };
		}
	} catch {
		// WebP недоступен — остаёмся на PNG
	}
	return { blob: png, mimeType: "image/png" };
}

export async function prepareTaskImageUpload(
	file: File,
): Promise<PreparedTaskImageUpload> {
	if (!isImageFile(file)) {
		throw new Error("Поддерживаются только файлы изображений");
	}

	const img = await loadImageFromFile(file);
	const naturalWidth = img.naturalWidth || img.width;
	const naturalHeight = img.naturalHeight || img.height;
	if (!naturalWidth || !naturalHeight) {
		throw new Error("Пустое или повреждённое изображение");
	}

	const fullSize = fitDimensions(naturalWidth, naturalHeight, MAX_FULL_EDGE);
	const fullCanvas = drawToCanvas(img, fullSize.width, fullSize.height);
	const fullEncoded = await encodeLossless(fullCanvas);
	if (fullEncoded.blob.size > KANBAN_BOARD_TASK_IMAGE_MAX_FULL_BYTES) {
		throw new Error(
			"Изображение после сжатия больше 2 МБ — уменьшите размер или обрежьте скриншот",
		);
	}

	const thumbSize = fitDimensions(fullSize.width, fullSize.height, THUMB_MAX_EDGE);
	const thumbCanvas = drawToCanvas(img, thumbSize.width, thumbSize.height);
	const thumbEncoded = await encodeLossless(thumbCanvas);

	return {
		full: fullEncoded.blob,
		thumb: thumbEncoded.blob,
		mimeType: fullEncoded.mimeType,
		width: fullSize.width,
		height: fullSize.height,
		name: file.name.trim() || "image",
	};
}

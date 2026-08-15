import { Writable } from "node:stream";

export const EXPORT_XLSX_CHUNK_BYTES = 256 * 1024;

export type ExportChunkWritable = Writable & {
	readonly sizeBytes: number;
	readonly chunkCount: number;
};

export function createExportChunkWritable(
	persist: (chunkIndex: number, content: Buffer) => Promise<void>,
	chunkBytes = EXPORT_XLSX_CHUNK_BYTES,
): ExportChunkWritable {
	let pending = Buffer.alloc(0);
	let chunkCount = 0;
	let sizeBytes = 0;

	const flush = async (forceAll: boolean) => {
		while (
			pending.length >= chunkBytes ||
			(forceAll && pending.length > 0)
		) {
			const take =
				forceAll && pending.length < chunkBytes
					? pending.length
					: Math.min(chunkBytes, pending.length);
			if (!forceAll && take < chunkBytes) break;
			const piece = Buffer.from(pending.subarray(0, take));
			pending = pending.subarray(take);
			await persist(chunkCount, piece);
			chunkCount += 1;
		}
	};

	const writable = new Writable({
		write(chunk, _encoding, callback) {
			const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
			sizeBytes += buf.length;
			pending = pending.length === 0 ? buf : Buffer.concat([pending, buf]);
			void flush(false).then(() => callback()).catch(callback);
		},
		final(callback) {
			void flush(true).then(() => callback()).catch(callback);
		},
	}) as ExportChunkWritable;

	Object.defineProperty(writable, "sizeBytes", {
		get: () => sizeBytes,
	});
	Object.defineProperty(writable, "chunkCount", {
		get: () => chunkCount,
	});
	return writable;
}

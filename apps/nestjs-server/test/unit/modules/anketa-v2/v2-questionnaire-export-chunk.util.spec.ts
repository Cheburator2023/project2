import { once } from "node:events";
import {
	EXPORT_XLSX_CHUNK_BYTES,
	createExportChunkWritable,
} from "../../../../src/modules/anketa-v2/utils/v2-questionnaire-export-chunk.util";

describe("createExportChunkWritable", () => {
	it("flushes fixed-size chunks and a remainder without keeping the whole file", async () => {
		const persisted: Buffer[] = [];
		const sink = createExportChunkWritable(async (_index, content) => {
			persisted.push(content);
		}, 8);

		sink.write(Buffer.from("abcdefghij")); // 10 bytes → 8 + 2
		sink.end();
		await once(sink, "finish");

		expect(persisted.map((buf) => buf.toString())).toEqual(["abcdefgh", "ij"]);
		expect(sink.sizeBytes).toBe(10);
		expect(sink.chunkCount).toBe(2);
	});

	it("uses the production chunk size so a small xlsx stays one row", async () => {
		const persisted: Buffer[] = [];
		const sink = createExportChunkWritable(async (_index, content) => {
			persisted.push(content);
		});
		sink.write(Buffer.alloc(100, 1));
		sink.end();
		await once(sink, "finish");
		expect(persisted).toHaveLength(1);
		expect(persisted[0]?.length).toBe(100);
		expect(EXPORT_XLSX_CHUNK_BYTES).toBeGreaterThan(100);
	});
});

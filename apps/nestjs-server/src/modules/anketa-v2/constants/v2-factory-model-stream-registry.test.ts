import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	V2_MODEL_STREAM_FACTORY_WORK_IDS,
	V2_MODEL_STREAM_EXECUTOR,
	typicalWorkAssignedToExecutorStream,
	V2_IMPLEMENTATION_STREAM,
	V2_MODEL_IMPLEMENTATION_STREAM_CODES,
} from "@smart-anketa/api-contract";

type RegistryItem = {
	id: string;
	streams: string[];
	normsByStream: Record<string, number | null>;
};

describe("factory model stream registry assignments", () => {
	it("assigns 10 model works to mother stream only (current.json etalon)", () => {
		const registry = JSON.parse(
			readFileSync(
				join(__dirname, "v2-factory-template-typical-works.registry.json"),
				"utf8",
			),
		) as { works?: RegistryItem[]; items?: RegistryItem[] };
		const items = registry.works ?? registry.items ?? [];

		for (const workId of V2_MODEL_STREAM_FACTORY_WORK_IDS) {
			const item = items.find((entry) => entry.id === workId);
			expect(item, workId).toBeDefined();
			expect(item!.streams).toEqual([V2_MODEL_STREAM_EXECUTOR]);
			expect(item!.normsByStream[V2_MODEL_STREAM_EXECUTOR]).toEqual(
				expect.any(Number),
			);
			/** Mother umbrella still covers child implementation streams at runtime. */
			for (const code of V2_MODEL_IMPLEMENTATION_STREAM_CODES) {
				expect(
					typicalWorkAssignedToExecutorStream(item!.streams, code),
				).toBe(true);
			}
			expect(
				typicalWorkAssignedToExecutorStream(
					item!.streams,
					V2_IMPLEMENTATION_STREAM.IDSRC,
				),
			).toBe(false);
		}
	});
});

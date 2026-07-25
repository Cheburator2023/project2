import { describe, expect, it } from "vitest";
import {
	V2_IMPLEMENTATION_STREAM,
	V2_MODEL_STREAM_EXECUTOR,
} from "@smart-anketa/api-contract";
import { buildExecutorStreamPickerRows } from "./typicalWorksAreas";

describe("buildExecutorStreamPickerRows", () => {
	it("inserts umbrella before nested model children", () => {
		const rows = buildExecutorStreamPickerRows([
			V2_IMPLEMENTATION_STREAM.IDSRC,
			V2_IMPLEMENTATION_STREAM.KMBKCB,
			V2_IMPLEMENTATION_STREAM.RB,
			V2_IMPLEMENTATION_STREAM.DADM,
		]);
		expect(rows).toEqual([
			{ kind: "stream", value: V2_IMPLEMENTATION_STREAM.IDSRC, nested: false },
			{
				kind: "umbrella",
				value: V2_MODEL_STREAM_EXECUTOR,
				label: `${V2_MODEL_STREAM_EXECUTOR} (зонтик)`,
			},
			{ kind: "stream", value: V2_IMPLEMENTATION_STREAM.KMBKCB, nested: true },
			{ kind: "stream", value: V2_IMPLEMENTATION_STREAM.RB, nested: true },
			{ kind: "stream", value: V2_IMPLEMENTATION_STREAM.DADM, nested: false },
		]);
	});
});

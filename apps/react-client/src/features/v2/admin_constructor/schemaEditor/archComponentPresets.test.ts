import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { RJSFSchema } from "@rjsf/utils";
import { ARCH_COMPONENT_PRESET_DEFS } from "./archComponentPresets";

const snapshotPath = join(
	import.meta.dirname,
	"../../../../../../nestjs-server/src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

const snapshot = JSON.parse(readFileSync(snapshotPath, "utf-8")) as {
	jsonSchema: RJSFSchema;
};

function schemaAt(dot: string): RJSFSchema {
	let cur: RJSFSchema = snapshot.jsonSchema;
	for (const seg of dot.split(".")) {
		cur = (cur.properties as Record<string, RJSFSchema>)[seg]!;
	}
	return cur;
}

function propertyKeys(node: RJSFSchema): string[] {
	if (node.type === "array" && node.items && typeof node.items === "object") {
		return Object.keys((node.items as RJSFSchema).properties ?? {});
	}
	return Object.keys(node.properties ?? {});
}

describe("ARCH_COMPONENT_PRESET_DEFS", () => {
	const cases = {
		modelService: "generalInfo.modelService",
		sourceSystem: "detailInfo.sourceSystems",
		dataProcess: "detailInfo.dataProcess",
		dataMart: "detailInfo.dataMart",
		model: "detailInfo.model",
		atypicalWork: "detailInfo.detailAtypicalTasks",
	} as const;

	for (const [arch, dotPath] of Object.entries(cases)) {
		it(`${arch} совпадает со снепшотом по набору полей`, () => {
			const preset = ARCH_COMPONENT_PRESET_DEFS[arch as keyof typeof cases].make();
			const expected = schemaAt(dotPath);
			expect(propertyKeys(preset).sort()).toEqual(propertyKeys(expected).sort());
		});
	}
});

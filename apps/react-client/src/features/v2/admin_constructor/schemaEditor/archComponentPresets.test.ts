import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { RJSFSchema } from "@rjsf/utils";
import {
	ARCH_COMPONENT_PRESET_DEFS,
	ATYPICAL_WORK_NEW_ROW_DEFAULTS,
} from "./archComponentPresets";

const snapshotPath = join(
	import.meta.dirname,
	"../../../../../../nestjs-server/src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

const snapshot = JSON.parse(readFileSync(snapshotPath, "utf-8")) as {
	jsonSchema: RJSFSchema;
};

type SchemaPath = string | { path: string; leaf?: string };

function schemaAt(def: SchemaPath): RJSFSchema {
	const { path, leaf } =
		typeof def === "string" ? { path: def, leaf: undefined } : def;
	let cur: RJSFSchema = snapshot.jsonSchema;
	for (const seg of path.split(".")) {
		cur = (cur.properties as Record<string, RJSFSchema>)[seg]!;
	}
	if (leaf) {
		cur = (cur as Record<string, RJSFSchema>)[leaf] as RJSFSchema;
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
		model: { path: "detailInfo.modelsList", leaf: "items" },
		atypicalWork: "detailInfo.field_npwqpBHt",
	} as const;

	for (const [arch, dotPath] of Object.entries(cases)) {
		it(`${arch} совпадает со снепшотом по набору полей`, () => {
			const preset = ARCH_COMPONENT_PRESET_DEFS[arch as keyof typeof cases].make();
			const expected = schemaAt(dotPath);
			expect(propertyKeys(preset).sort()).toEqual(propertyKeys(expected).sort());
		});
	}

	it("typicalWork preset exposes canonical item fields", () => {
		const preset = ARCH_COMPONENT_PRESET_DEFS.typicalWork.make();
		expect(propertyKeys(preset).sort()).toEqual(
			["coefficient", "estimateHoursPerDay", "name", "total"].sort(),
		);
		const itemProps = (preset.items as RJSFSchema).properties as Record<
			string,
			RJSFSchema
		>;
		expect(itemProps.name?.title).toBe("Название типовой работы");
		expect(itemProps.estimateHoursPerDay?.title).toBe("Базовая оценка");
		expect(itemProps.coefficient?.title).toBe("Коэффициент");
		expect(itemProps.total?.title).toBe("Итог");
	});

	// snapshot-as-source-of-truth: у нетиповой работы НЕ должно быть schema
	// `default`, иначе RJSF подставит их в недостающие ключи существующего
	// снепшота. Дефолты для новой строки задаются явно.
	it("у нетиповой работы нет schema default (значения новой строки заданы явно)", () => {
		const itemProps = (
			ARCH_COMPONENT_PRESET_DEFS.atypicalWork.make().items as RJSFSchema
		).properties as Record<string, RJSFSchema>;
		for (const field of Object.values(itemProps)) {
			expect(field.default).toBeUndefined();
		}
		expect(ATYPICAL_WORK_NEW_ROW_DEFAULTS).toEqual({
			includeInCalculation: true,
		});
	});
});

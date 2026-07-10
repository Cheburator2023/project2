import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RJSFSchema } from "@rjsf/utils";
import { describe, expect, it } from "vitest";
import {
	listSchemaFields,
	resolveSchemaNode,
	readUiSchemaBranchAtPointer,
} from "@react-client/features/v2/admin_constructor/utils/schemaMutators";
import {
	jsonPointerToFormDataVarPath,
	pointerSegments,
} from "@react-client/features/v2/admin_constructor/utils/schemaPaths";
import { readLeafUiOptions, isLayoutGroupUi } from "../../propertiesFieldKind";
import {
	buildSchemaWorkParameters,
	isSchemaLaborParamCandidate,
} from "./schemaWorkParameters";

const legacySchemaPath = join(
	dirname(fileURLToPath(import.meta.url)),
	"../../../../../../../../../llm/v18_analytic_edits/json_sc.json",
);
const legacyUiPath = join(
	dirname(fileURLToPath(import.meta.url)),
	"../../../../../../../../../llm/v18_analytic_edits/ui_sc.json",
);

type LegacySnapshot = {
	jsonSchema: RJSFSchema;
	uiSchema: Record<string, unknown>;
};

function loadLegacySnapshot(): LegacySnapshot {
	return {
		jsonSchema: JSON.parse(readFileSync(legacySchemaPath, "utf8")) as RJSFSchema,
		uiSchema: JSON.parse(readFileSync(legacyUiPath, "utf8")) as Record<
			string,
			unknown
		>,
	};
}

function buildEditorFieldPathHints(
	jsonSchema: RJSFSchema,
	uiSchema: Record<string, unknown>,
	enumMapByCode: Record<string, { enums: string[]; enumNames: string[] }>,
) {
	const ui = uiSchema;
	return listSchemaFields(jsonSchema, "/", 0, uiSchema)
		.filter((row) => {
			const leaf = readUiSchemaBranchAtPointer(ui, row.pointer);
			return !isLayoutGroupUi(readLeafUiOptions(leaf));
		})
		.map((row) => {
			const segs = pointerSegments(row.pointer);
			const node = resolveSchemaNode(jsonSchema, segs);
			const title = typeof node?.title === "string" ? node.title : null;
			const leaf = readUiSchemaBranchAtPointer(ui, row.pointer);
			let dictionaryCode: string | null = null;
			const opts = leaf?.["ui:options"];
			if (opts && typeof opts === "object" && !Array.isArray(opts)) {
				const dc = (opts as Record<string, unknown>).dictionaryCode;
				if (typeof dc === "string" && dc.trim()) dictionaryCode = dc.trim();
			}
			const varPath = jsonPointerToFormDataVarPath(row.pointer);
			const codesPreview =
				dictionaryCode && enumMapByCode[dictionaryCode]
					? enumMapByCode[dictionaryCode]!.enums.slice(0, 8)
					: null;
			return {
				pointer: row.pointer,
				key: row.key,
				title,
				varPath,
				dictionaryCode,
				codesPreview,
			};
		});
}

describe("buildSchemaWorkParameters on legacy v18 schema", () => {
	const legacy = loadLegacySnapshot();

	it("includes Количество метрик from inline enum when dictionaries are not loaded", () => {
		const hints = buildEditorFieldPathHints(
			legacy.jsonSchema,
			legacy.uiSchema,
			{},
		);
		const params = buildSchemaWorkParameters({
			fieldPathHints: hints,
			uiSchema: legacy.uiSchema,
			jsonSchema: legacy.jsonSchema,
			enumMapByCode: {},
		});

		expect(
			params.some(
				(p) =>
					p.name === "Количество метрик" || p.code === "field_28IPlEQu",
			),
		).toBe(true);
	});

	it("exposes dictionary-bound legacy fields in labor picker before enums load", () => {
		const hints = buildEditorFieldPathHints(
			legacy.jsonSchema,
			legacy.uiSchema,
			{},
		);
		const params = buildSchemaWorkParameters({
			fieldPathHints: hints,
			uiSchema: legacy.uiSchema,
			jsonSchema: legacy.jsonSchema,
			enumMapByCode: {},
		});

		const laborOptions = params.filter(isSchemaLaborParamCandidate);
		expect(
			laborOptions.some((p) => p.name === "Количество метрик"),
		).toBe(true);
	});
});

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RJSFSchema } from "@rjsf/utils";
import { describe, expect, it } from "vitest";
import { listSchemaFields } from "@react-client/features/v2/admin_constructor/utils/schemaMutators";
import { pointerSegments } from "@react-client/features/v2/admin_constructor/utils/schemaPaths";
import { resolveArchComponentAtPointer } from "../../propertiesFieldKind";
import { buildSchemaWorkParameters } from "./schemaWorkParameters";

const snapshotPath = join(
	dirname(fileURLToPath(import.meta.url)),
	"../../../../../../../../nestjs-server/src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

type Snapshot = {
	jsonSchema: RJSFSchema;
	uiSchema: Record<string, unknown>;
};

function loadSnapshot(): Snapshot {
	return JSON.parse(readFileSync(snapshotPath, "utf8")) as Snapshot;
}

function buildHints(snapshot: Snapshot) {
	return listSchemaFields(snapshot.jsonSchema, "/", 0, snapshot.uiSchema).map(
		(row) => {
			const segs = pointerSegments(row.pointer);
			let cur: unknown = snapshot.uiSchema;
			for (const s of segs) {
				cur = (cur as Record<string, unknown>)?.[s];
			}
			let dictionaryCode: string | null = null;
			const opts = (cur as Record<string, unknown> | undefined)?.["ui:options"];
			if (opts && typeof opts === "object" && !Array.isArray(opts)) {
				const dc = (opts as Record<string, unknown>).dictionaryCode;
				if (typeof dc === "string" && dc.trim()) dictionaryCode = dc.trim();
			}
			return {
				pointer: row.pointer,
				key: row.key,
				title: null as string | null,
				varPath: row.pointer,
				dictionaryCode,
				codesPreview: null as string[] | null,
			};
		},
	);
}

describe("buildSchemaWorkParameters on default snapshot", () => {
	const snapshot = loadSnapshot();
	const hints = buildHints(snapshot);

	it("has modelService fields with arch resolution", () => {
		const modelFields = hints.filter(
			(h) =>
				resolveArchComponentAtPointer(snapshot.uiSchema, h.pointer) ===
				"modelService",
		);
		expect(modelFields.length).toBeGreaterThan(0);
		expect(
			modelFields.some((h) => h.pointer.endsWith("/workType")),
		).toBe(true);
	});

	it("returns params for Модельный сервис fields from snapshot", () => {
		const params = buildSchemaWorkParameters({
			fieldPathHints: hints,
			uiSchema: snapshot.uiSchema,
			jsonSchema: snapshot.jsonSchema,
			enumMapByCode: {},
		});
		expect(params.length).toBeGreaterThan(0);
		expect(params.some((p) => p.code === "workType")).toBe(true);
	});

	it("returns the same schema-wide param set for any work arch type", () => {
		const base = buildSchemaWorkParameters({
			fieldPathHints: hints,
			uiSchema: snapshot.uiSchema,
			jsonSchema: snapshot.jsonSchema,
			enumMapByCode: {},
		});

		for (const archComponentType of [
			"Система-источник",
			"Объект / Витрина данных",
			"Модельный сервис",
		]) {
			const params = buildSchemaWorkParameters({
				archComponentType,
				fieldPathHints: hints,
				uiSchema: snapshot.uiSchema,
				jsonSchema: snapshot.jsonSchema,
				enumMapByCode: {},
			});
			expect(params.length, archComponentType).toBe(base.length);
		}
	});
});

#!/usr/bin/env node
/**
 * Синхронизирует packages/api-contract/src/v2-arch-component-presets.ts
 * с арх. компонентами из v2-default-anketa.snapshot.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = join(
	root,
	"apps/nestjs-server/src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);
const outPath = join(root, "packages/api-contract/src/v2-arch-component-presets.ts");

const snap = JSON.parse(readFileSync(snapshotPath, "utf-8"));

const SNAPSHOT_ARCH_PATHS = {
	modelService: { schema: "generalInfo.modelService", ui: "generalInfo.modelService" },
	sourceSystem: { schema: "detailInfo.sourceSystems", ui: "detailInfo.sourceSystems" },
	dataProcess: { schema: "detailInfo.dataProcess", ui: "detailInfo.dataProcess" },
	dataMart: { schema: "detailInfo.dataMart", ui: "detailInfo.dataMart" },
	/** v35: «Модели» — массив `modelsList`, пресет = schema/ui элемента строки. */
	model: {
		schema: "detailInfo.modelsList",
		ui: "detailInfo.modelsList",
		leaf: "items",
	},
};

function getSchema(pathDef) {
	const { schema, leaf } =
		typeof pathDef === "string" ? { schema: pathDef, leaf: undefined } : pathDef;
	let cur = snap.jsonSchema;
	for (const s of schema.split(".")) {
		cur = cur?.properties?.[s];
		if (!cur) return undefined;
	}
	return leaf ? cur[leaf] : cur;
}

function getUi(pathDef) {
	const { ui, leaf } =
		typeof pathDef === "string" ? { ui: pathDef, leaf: undefined } : pathDef;
	let cur = snap.uiSchema;
	for (const s of ui.split(".")) {
		cur = cur?.[s];
		if (!cur) return undefined;
	}
	return leaf ? cur[leaf] : cur;
}

function stripUiRoot(ui) {
	if (!ui || typeof ui !== "object" || Array.isArray(ui)) {
		return { uiOptions: {}, uiBranch: undefined };
	}
	const clone = structuredClone(ui);
	const uiOptions = clone["ui:options"] ?? {};
	delete clone["ui:options"];
	const keys = Object.keys(clone);
	return {
		uiOptions,
		uiBranch: keys.length > 0 ? clone : undefined,
	};
}

const raw = {};
for (const [arch, dotPath] of Object.entries(SNAPSHOT_ARCH_PATHS)) {
	const { uiOptions, uiBranch } = stripUiRoot(getUi(dotPath));
	raw[arch] = {
		schema: getSchema(dotPath),
		uiOptions,
		...(uiBranch ? { uiBranch } : {}),
	};
}

const archKeys = Object.keys(SNAPSHOT_ARCH_PATHS);
const archUnion = archKeys.map((k) => `"${k}"`).join(" | ");

const file = `import type { RJSFSchema } from "@rjsf/utils";
import type { V2ArchComponentType } from "./v2-anketa-section-ui.util";

export type V2ArchComponentPresetDef = {
\tmake: () => RJSFSchema;
\tuiOptions?: Record<string, unknown>;
\t/** Дочерние ветки uiSchema (ключи — имена properties), без ui:options корня. */
\tuiBranch?: Record<string, unknown>;
};

type SnapshotArchPresetRaw = {
\tschema: RJSFSchema;
\tuiOptions: Record<string, unknown>;
\tuiBranch?: Record<string, unknown>;
};

/** Канонические jsonSchema/ui для арх. компонентов (из v2-default-anketa.snapshot.json). */
const SNAPSHOT_ARCH_PRESETS: Record<string, SnapshotArchPresetRaw> = ${JSON.stringify(raw, null, "\t")};

function presetFromSnapshot(raw: SnapshotArchPresetRaw): V2ArchComponentPresetDef {
\treturn {
\t\tmake: () => structuredClone(raw.schema) as RJSFSchema,
\t\t...(Object.keys(raw.uiOptions).length > 0 ? { uiOptions: raw.uiOptions } : {}),
\t\t...(raw.uiBranch && Object.keys(raw.uiBranch).length > 0
\t\t\t? { uiBranch: raw.uiBranch }
\t\t\t: {}),
\t};
}

export const V2_ARCH_COMPONENT_PRESET_DEFS_FROM_SNAPSHOT: Pick<
\tRecord<V2ArchComponentType, V2ArchComponentPresetDef>,
\t${archUnion}
> = {
${archKeys
	.map((arch) => `\t${arch}: presetFromSnapshot(SNAPSHOT_ARCH_PRESETS.${arch}),`)
	.join("\n")}
};
`;

writeFileSync(outPath, file);
console.log(`Updated ${outPath}`);

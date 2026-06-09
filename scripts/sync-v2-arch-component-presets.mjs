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
	modelService: "generalInfo.modelService",
	sourceSystem: "detailInfo.sourceSystems",
	dataProcess: "detailInfo.dataProcess",
	dataMart: "detailInfo.dataMart",
	model: "detailInfo.model",
};

function getSchema(dot) {
	let cur = snap.jsonSchema;
	for (const s of dot.split(".")) cur = cur.properties[s];
	return cur;
}

function getUi(dot) {
	let cur = snap.uiSchema;
	for (const s of dot.split(".")) cur = cur[s];
	return cur;
}

function stripUiRoot(ui) {
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

#!/usr/bin/env node
/**
 * Копирует v35 (jsonSchema, uiSchema, logic, dictionariesSnapshot) в
 * v2-default-anketa.snapshot.json без изменений.
 *
 * Использование:
 *   node scripts/sync-factory-snapshot.mjs path-to-export-or-version.json
 *
 * Принимает:
 * - объект одной версии (jsonSchema + uiSchema + logic);
 * - полный smart-anketa-v2 export (версия с versionNumber === 35).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(__dirname, "..");
const snapshotPath = join(
	serverRoot,
	"src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

const FACTORY_VERSION_NUMBER = 35;

function isVersionRecord(value) {
	return (
		value &&
		typeof value === "object" &&
		value.jsonSchema &&
		value.uiSchema &&
		value.logic
	);
}

function findVersionInExport(exportPayload) {
	if (isVersionRecord(exportPayload)) {
		return exportPayload;
	}

	const versions = exportPayload?.templateVersions ?? exportPayload?.versions;
	if (!Array.isArray(versions)) {
		throw new Error(
			"Ожидается объект версии или полный export с templateVersions[]",
		);
	}

	const factoryVersion = versions.find(
		(v) => v.versionNumber === FACTORY_VERSION_NUMBER,
	);
	if (factoryVersion) {
		return factoryVersion;
	}

	throw new Error(
		`В экспорте не найдена версия шаблона versionNumber=${FACTORY_VERSION_NUMBER}`,
	);
}

const sourcePath = process.argv[2];
if (!sourcePath) {
	console.error(
		"Usage: node scripts/sync-factory-snapshot.mjs <export-or-version.json>",
	);
	process.exit(1);
}
const raw = JSON.parse(readFileSync(sourcePath, "utf-8"));
const version = findVersionInExport(raw);

const snapshot = {
	jsonSchema: version.jsonSchema,
	uiSchema: version.uiSchema,
	logic: version.logic,
	...(version.dictionariesSnapshot && {
		dictionariesSnapshot: version.dictionariesSnapshot,
	}),
};

writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, "\t")}\n`, "utf-8");

console.log("Updated factory snapshot (v35):", snapshotPath);
console.log("  source:", sourcePath);
console.log(
	"  version:",
	version.versionNumber ?? "?",
	version.status ?? "",
);
console.log(
	"  schema props:",
	Object.keys(snapshot.jsonSchema.properties ?? {}).length,
);
console.log("  uiSchema keys:", Object.keys(snapshot.uiSchema ?? {}).length);
console.log("  logic rules:", snapshot.logic.rules?.length ?? 0);
console.log(
	"  dictionary refs:",
	snapshot.dictionariesSnapshot?.referencedDictionaryCodes?.length ?? 0,
);

execSync("node ../../scripts/sync-v2-arch-component-presets.mjs", {
	cwd: serverRoot,
	stdio: "inherit",
});



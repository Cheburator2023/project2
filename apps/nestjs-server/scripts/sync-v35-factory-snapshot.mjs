#!/usr/bin/env node
/**
 * Записывает эталон v35 (jsonSchema, uiSchema, logic) в v2-default-anketa.snapshot.json.
 *
 * Использование:
 *   node scripts/sync-v35-factory-snapshot.mjs [path-to-export.json]
 *
 * По умолчанию берёт версию 35 шаблона «Новая схема» из полного экспорта smart-anketa-v2.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const snapshotPath = join(
	__dirname,
	"../src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

const V35_VERSION_ID = "cb2fb7f2-f8cd-490f-a701-3a16d0c085d4";

function findV35Version(exportPayload) {
	if (exportPayload?.id === V35_VERSION_ID) {
		return exportPayload;
	}

	const versions = exportPayload?.versions ?? exportPayload?.templateVersions;
	if (Array.isArray(versions)) {
		const byId = versions.find((v) => v.id === V35_VERSION_ID);
		if (byId) return byId;
		const byNumber = versions.find((v) => v.versionNumber === 35);
		if (byNumber) return byNumber;
	}

	throw new Error(
		`В экспорте не найдена версия v35 (id ${V35_VERSION_ID}). Передайте JSON-фрагмент версии.`,
	);
}

const exportPath =
	process.argv[2] ??
	join(process.env.HOME ?? "", "Desktop/smart-anketa-v2-2026-06-28.json");

const raw = JSON.parse(readFileSync(exportPath, "utf-8"));
const v35 = findV35Version(raw);

if (!v35.jsonSchema || !v35.uiSchema || !v35.logic) {
	throw new Error("В версии v35 отсутствуют jsonSchema, uiSchema или logic");
}

const snapshot = {
	jsonSchema: {
		$schema: "http://json-schema.org/draft-07/schema#",
		...v35.jsonSchema,
	},
	uiSchema: v35.uiSchema,
	logic: v35.logic,
};

writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, "\t")}\n`, "utf-8");

console.log("Updated factory snapshot from v35:", snapshotPath);
console.log(
	"  schema props:",
	Object.keys(snapshot.jsonSchema.properties ?? {}).length,
);
console.log("  uiSchema keys:", Object.keys(snapshot.uiSchema ?? {}).length);
console.log("  logic rules:", snapshot.logic.rules?.length ?? 0);

execSync("node scripts/patch-works-catalog-logic.mjs", {
	cwd: __dirname,
	stdio: "inherit",
});
execSync("node scripts/fix-v35-ui-dictionary-codes.mjs", {
	cwd: __dirname,
	stdio: "inherit",
});

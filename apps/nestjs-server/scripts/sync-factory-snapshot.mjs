#!/usr/bin/env node
/**
 * Записывает эталон заводского шаблона (jsonSchema, uiSchema, logic) в v2-default-anketa.snapshot.json.
 *
 * Использование:
 *   node scripts/sync-factory-snapshot.mjs [path-to-export.json]
 *
 * По умолчанию берёт эталонную версию шаблона «Новая схема» из полного экспорта smart-anketa-v2.
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

const FACTORY_TEMPLATE_VERSION_ID = "cb2fb7f2-f8cd-490f-a701-3a16d0c085d4";

function findFactoryTemplateVersion(exportPayload) {
	if (exportPayload?.id === FACTORY_TEMPLATE_VERSION_ID) {
		return exportPayload;
	}

	const versions = exportPayload?.versions ?? exportPayload?.templateVersions;
	if (Array.isArray(versions)) {
		const byId = versions.find((v) => v.id === FACTORY_TEMPLATE_VERSION_ID);
		if (byId) return byId;
	}

	throw new Error(
		`В экспорте не найдена эталонная версия шаблона (id ${FACTORY_TEMPLATE_VERSION_ID}). Передайте JSON-фрагмент версии.`,
	);
}

const exportPath =
	process.argv[2] ??
	join(process.env.HOME ?? "", "Desktop/smart-anketa-v2-2026-06-28.json");

const raw = JSON.parse(readFileSync(exportPath, "utf-8"));
const factoryVersion = findFactoryTemplateVersion(raw);

if (!factoryVersion.jsonSchema || !factoryVersion.uiSchema || !factoryVersion.logic) {
	throw new Error(
		"В эталонной версии отсутствуют jsonSchema, uiSchema или logic",
	);
}

const snapshot = {
	jsonSchema: {
		$schema: "http://json-schema.org/draft-07/schema#",
		...factoryVersion.jsonSchema,
	},
	uiSchema: factoryVersion.uiSchema,
	logic: factoryVersion.logic,
};

writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, "\t")}\n`, "utf-8");

console.log("Updated factory snapshot:", snapshotPath);
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
execSync("node scripts/fix-factory-ui-dictionary-codes.mjs", {
	cwd: __dirname,
	stdio: "inherit",
});

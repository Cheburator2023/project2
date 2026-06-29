#!/usr/bin/env node
/**
 * Переводит task_trigger «типовые работы» в snapshot на worksCatalog (БД-каталог).
 * Удаляет огромные статические массивы tasks[] — источник правды: v2_typical_work*.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const snapshotPath = join(
	dirname(fileURLToPath(import.meta.url)),
	"../src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

/** @type {Record<string, { worksCatalogArchComponent: string; worksCatalogStream: string }>} */
const RULE_PATCHES = {
	"unified-source-typical-works": {
		worksCatalogArchComponent: "Система-источник",
		worksCatalogStream: "fromSourceType",
	},
	"unified-control-typical-works": {
		worksCatalogArchComponent: "Модельный сервис",
		worksCatalogStream: "Контроль моделей",
	},
};

const snapshot = JSON.parse(readFileSync(snapshotPath, "utf-8"));
const rules = snapshot.logic?.rules;
if (!Array.isArray(rules)) {
	throw new Error("snapshot.logic.rules missing");
}

let patched = 0;
for (const rule of rules) {
	const patch = RULE_PATCHES[rule.id];
	if (!patch || rule.kind !== "task_trigger") continue;
	const payload = rule.payload && typeof rule.payload === "object" ? rule.payload : {};
	payload.worksCatalog = true;
	payload.worksCatalogArchComponent = patch.worksCatalogArchComponent;
	payload.worksCatalogStream = patch.worksCatalogStream;
	if ("tasks" in payload) {
		delete payload.tasks;
	}
	rule.payload = payload;
	patched++;
}

writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, "\t")}\n`, "utf-8");
console.log(`Patched ${patched} task_trigger rules → worksCatalog in`, snapshotPath);

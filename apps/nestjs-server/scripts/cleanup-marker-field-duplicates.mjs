#!/usr/bin/env node
/**
 * Удаляет orphan-дубликаты sourceSystems (поля без актуальных CSV-ключей).
 * Префикс «Маркер:» у оставшихся полей сохраняется.
 *
 *   node scripts/cleanup-marker-field-duplicates.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");

const ANKETA_PATH = join(
	__dirname,
	"../src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);
const PRESETS_PATH = join(
	ROOT,
	"packages/api-contract/src/v2-arch-component-presets.ts",
);

/** Orphan-поля — удаляем (работы на актуальных CSV-ключах). */
const ORPHAN_KEYS = [
	"field_DJJtx7nX",
	"field_1bl3dfSX",
	"field_WgK6lIS-",
	"field_lDw9gG39",
];

function loadJson(p) {
	return JSON.parse(readFileSync(p, "utf8"));
}
function saveJson(p, data) {
	writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function removeOrphansFromSchema(anketa) {
	const items =
		anketa.jsonSchema?.properties?.detailInfo?.properties?.sourceSystems
			?.items;
	const props = items?.properties;
	if (!props || typeof props !== "object") {
		throw new Error("sourceSystems.items.properties not found");
	}
	for (const key of ORPHAN_KEYS) {
		if (!(key in props)) {
			console.warn(`orphan missing in schema: ${key}`);
			continue;
		}
		delete props[key];
		console.log(`removed schema prop ${key}`);
	}
	if (Array.isArray(items.required)) {
		items.required = items.required.filter((k) => !ORPHAN_KEYS.includes(k));
	}

	const uiItems = anketa.uiSchema?.detailInfo?.sourceSystems?.items;
	if (uiItems && typeof uiItems === "object") {
		for (const key of ORPHAN_KEYS) {
			if (key in uiItems) {
				delete uiItems[key];
				console.log(`removed uiSchema leaf ${key}`);
			}
		}
		if (Array.isArray(uiItems["ui:order"])) {
			uiItems["ui:order"] = uiItems["ui:order"].filter(
				(k) => !ORPHAN_KEYS.includes(k),
			);
		}
	}
}

function cleanupPresetsTs(src) {
	let next = src;
	for (const key of ORPHAN_KEYS) {
		const re = new RegExp(
			`\\t{4,5}"${key.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}":\\s*\\{[\\s\\S]*?\\},\\n`,
			"g",
		);
		const before = next.length;
		next = next.replace(re, "");
		if (next.length === before) {
			console.warn(`preset block not removed for ${key}`);
		} else {
			console.log(`removed preset block ${key}`);
		}
		const orderRe = new RegExp(
			`\\s*"${key.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}",\\n`,
			"g",
		);
		next = next.replace(orderRe, "\n");
	}
	return next;
}

const anketa = loadJson(ANKETA_PATH);
removeOrphansFromSchema(anketa);
saveJson(ANKETA_PATH, anketa);
console.log("saved anketa snapshot");

const presets = readFileSync(PRESETS_PATH, "utf8");
writeFileSync(PRESETS_PATH, cleanupPresetsTs(presets), "utf8");
console.log("saved presets");

const a2 = loadJson(ANKETA_PATH);
const props =
	a2.jsonSchema.properties.detailInfo.properties.sourceSystems.items.properties;
for (const k of ORPHAN_KEYS) {
	if (k in props) throw new Error(`orphan still present: ${k}`);
}
console.log("OK: orphans gone; Маркер: prefixes kept");

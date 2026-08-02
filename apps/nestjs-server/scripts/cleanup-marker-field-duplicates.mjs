#!/usr/bin/env node
/**
 * Удаляет orphan-дубликаты sourceSystems без префикса «Маркер:»
 * и снимает префикс «Маркер:» с оставшихся полей + paramName в factory works.
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
const SNAPSHOT_PATH = join(
	__dirname,
	"../src/modules/anketa-v2/constants/v2-factory-typical-works.snapshot.json",
);
const PRESETS_PATH = join(
	ROOT,
	"packages/api-contract/src/v2-arch-component-presets.ts",
);

/** Orphan-поля без «Маркер:» — удаляем (работы уже на Маркер-ключах). */
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

function stripMarkerPrefix(title) {
	if (typeof title !== "string") return title;
	const m = title.match(/^Маркер:\s*(.*)$/i);
	if (!m) return title;
	const rest = m[1] ?? "";
	if (!rest) return title;
	return rest.charAt(0).toLocaleUpperCase("ru-RU") + rest.slice(1);
}

function stripMarkerFromParamLabel(label) {
	if (typeof label !== "string") return label;
	// "Маркер: foo @ field_x|маркер_foo" → "Foo @ field_x|foo"
	const at = label.indexOf(" @ ");
	if (at < 0) {
		const stripped = stripMarkerPrefix(label);
		return stripped.replace(/\|маркер_/gi, "|");
	}
	const namePart = stripMarkerPrefix(label.slice(0, at));
	let rest = label.slice(at); // " @ code|slug"
	rest = rest.replace(/\|маркер_/gi, "|");
	return namePart + rest;
}

function deepStripMarkerTitles(node) {
	if (!node || typeof node !== "object") return;
	if (Array.isArray(node)) {
		for (const item of node) deepStripMarkerTitles(item);
		return;
	}
	if (typeof node.title === "string" && /^Маркер:/i.test(node.title)) {
		node.title = stripMarkerPrefix(node.title);
	}
	for (const v of Object.values(node)) deepStripMarkerTitles(v);
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

function cleanupWorksSnapshot(snap) {
	let renamed = 0;
	const walkStrings = (obj) => {
		if (typeof obj === "string") {
			if (!obj.includes("Маркер")) return obj;
			const next = stripMarkerFromParamLabel(obj);
			if (next !== obj) renamed++;
			return next;
		}
		if (!obj || typeof obj !== "object") return obj;
		if (Array.isArray(obj)) return obj.map(walkStrings);
		const out = {};
		for (const [k, v] of Object.entries(obj)) out[k] = walkStrings(v);
		return out;
	};
	const next = walkStrings(snap);
	console.log(`works snapshot: stripped Маркер from ${renamed} string(s)`);
	return next;
}

function cleanupPresetsTs(src) {
	let next = src;
	// Remove orphan property blocks: "field_xxx": { ... },
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
		// remove from ui:order arrays: "field_xxx",
		const orderRe = new RegExp(
			`\\s*"${key.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}",\\n`,
			"g",
		);
		next = next.replace(orderRe, "\n");
	}
	// Strip Маркер: from title strings in presets
	next = next.replace(
		/"title":\s*"Маркер:\s*([^"]*)"/g,
		(_, rest) => {
			const fixed =
				rest.charAt(0).toLocaleUpperCase("ru-RU") + rest.slice(1);
			return `"title": "${fixed}"`;
		},
	);
	return next;
}

const anketa = loadJson(ANKETA_PATH);
removeOrphansFromSchema(anketa);
deepStripMarkerTitles(anketa.jsonSchema);
deepStripMarkerTitles(anketa.uiSchema);
saveJson(ANKETA_PATH, anketa);
console.log("saved anketa snapshot");

const works = loadJson(SNAPSHOT_PATH);
saveJson(SNAPSHOT_PATH, cleanupWorksSnapshot(works));
console.log("saved works snapshot");

const presets = readFileSync(PRESETS_PATH, "utf8");
writeFileSync(PRESETS_PATH, cleanupPresetsTs(presets), "utf8");
console.log("saved presets");

// verify
const a2 = loadJson(ANKETA_PATH);
const props =
	a2.jsonSchema.properties.detailInfo.properties.sourceSystems.items.properties;
for (const k of ORPHAN_KEYS) {
	if (k in props) throw new Error(`orphan still present: ${k}`);
}
const markerLeft = Object.values(props).filter(
	(p) => typeof p?.title === "string" && /^Маркер:/i.test(p.title),
);
if (markerLeft.length) {
	throw new Error(`Маркер titles remain: ${markerLeft.map((p) => p.title)}`);
}
const w2 = JSON.stringify(loadJson(SNAPSHOT_PATH));
if (w2.includes("Маркер:")) {
	throw new Error("Маркер: still present in works snapshot");
}
console.log("OK: orphans gone, no Маркер: titles left in schema/works");

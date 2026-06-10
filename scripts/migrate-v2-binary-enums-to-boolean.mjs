#!/usr/bin/env node
/**
 * Заменяет в v2-default-anketa.snapshot.json двузначные enum
 * («Да/Нет», «Требуется/Не требуется») на type: boolean + ui:widget: checkbox.
 *
 * npm run migrate:v2-binary-booleans
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = join(
	root,
	"apps/nestjs-server/src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

const BINARY_YES_NO_KEYS = new Set(["да|нет", "нет|да"]);
const BINARY_REQUIRED_KEYS = new Set([
	"требуется|не требуется",
	"не требуется|требуется",
]);

function binaryEnumKey(values) {
	return values
		.map((v) => v.trim().toLowerCase())
		.sort()
		.join("|");
}

function isBinaryBooleanEnum(values) {
	if (!Array.isArray(values) || values.length !== 2) return false;
	const key = binaryEnumKey(values.filter((v) => typeof v === "string"));
	return BINARY_YES_NO_KEYS.has(key) || BINARY_REQUIRED_KEYS.has(key);
}

const convertedPaths = [];

function visitSchema(node, pointer) {
	if (!node || typeof node !== "object" || Array.isArray(node)) return;

	const enums = Array.isArray(node.enum)
		? node.enum.filter((v) => typeof v === "string")
		: [];

	if (isBinaryBooleanEnum(enums)) {
		delete node.enum;
		delete node.enumNames;
		node.type = "boolean";
		delete node.default;
		convertedPaths.push(pointer);
		return;
	}

	const props = node.properties;
	if (props && typeof props === "object" && !Array.isArray(props)) {
		for (const [key, child] of Object.entries(props)) {
			const childPtr =
				pointer === "/" ? `/${key}` : `${pointer.replace(/\/$/, "")}/${key}`;
			visitSchema(child, childPtr);
		}
	}

	const items = node.items;
	if (items && typeof items === "object" && !Array.isArray(items)) {
		const itemsProps = items.properties;
		if (itemsProps && typeof itemsProps === "object") {
			for (const [key, child] of Object.entries(itemsProps)) {
				visitSchema(child, `${pointer.replace(/\/$/, "")}/items/${key}`);
			}
		} else {
			visitSchema(items, `${pointer.replace(/\/$/, "")}/items`);
		}
	}
}

function pointerToUiSegments(pointer) {
	return pointer.replace(/^\//, "").split("/").filter(Boolean);
}

function patchUiBranch(ui, segments) {
	let cur = ui;
	for (let i = 0; i < segments.length; i++) {
		const seg = segments[i];
		if (!cur[seg] || typeof cur[seg] !== "object" || Array.isArray(cur[seg])) {
			cur[seg] = {};
		}
		if (i === segments.length - 1) {
			const branch = cur[seg];
			branch["ui:widget"] = "checkbox";
			delete branch["ui:placeholder"];
			if (branch["ui:options"] && typeof branch["ui:options"] === "object") {
				delete branch["ui:options"].dictionaryCode;
			}
			return;
		}
		cur = cur[seg];
	}
}

const snap = JSON.parse(readFileSync(snapshotPath, "utf-8"));
visitSchema(snap.jsonSchema, "/");

for (const pointer of convertedPaths) {
	patchUiBranch(snap.uiSchema, pointerToUiSegments(pointer));
}

writeFileSync(snapshotPath, `${JSON.stringify(snap, null, "\t")}\n`, "utf-8");
console.log(
	`Migrated ${convertedPaths.length} fields to boolean in ${snapshotPath}`,
);
for (const p of convertedPaths) {
	console.log(`  ${p}`);
}

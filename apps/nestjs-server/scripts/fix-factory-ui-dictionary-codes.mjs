#!/usr/bin/env node
/**
 * Синхронизирует dictionaryCode в uiSchema с актуальными путями схемы (modelsList вместо model).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = join(
	root,
	"src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);
const allowlistPath = join(
	root,
	"src/modules/anketa-v2/constants/factory-dictionary-codes.ts",
);

const REPLACEMENTS = [
	["v2.detailInfo.model.workType", "v2.detailInfo.modelsList.items.workType"],
	[
		"v2.detailInfo.model.algorithmType",
		"v2.detailInfo.modelsList.items.algorithmType",
	],
];

function walkReplace(node) {
	if (!node || typeof node !== "object") return;
	if (Array.isArray(node)) {
		for (const item of node) walkReplace(item);
		return;
	}
	const opts = node["ui:options"];
	if (opts && typeof opts === "object" && typeof opts.dictionaryCode === "string") {
		for (const [from, to] of REPLACEMENTS) {
			if (opts.dictionaryCode === from) opts.dictionaryCode = to;
		}
	}
	for (const value of Object.values(node)) walkReplace(value);
}

const snapshot = JSON.parse(readFileSync(snapshotPath, "utf-8"));
walkReplace(snapshot.uiSchema);
writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, "\t")}\n`, "utf-8");

let allowlist = readFileSync(allowlistPath, "utf-8");
for (const [from, to] of REPLACEMENTS) {
	allowlist = allowlist.replaceAll(`"${from}"`, `"${to}"`);
}
writeFileSync(allowlistPath, allowlist, "utf-8");

console.log("Fixed uiSchema dictionaryCode paths:", REPLACEMENTS.map(([f, t]) => `${f} → ${t}`).join(", "));

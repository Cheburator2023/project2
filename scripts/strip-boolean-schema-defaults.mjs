#!/usr/bin/env node
/**
 * Убирает default: false у boolean-полей в снепшоте — иначе RJSF подставляет
 * значения в formData и арх. компоненты выглядят «заполненными».
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const snapshotPath = join(
	dirname(fileURLToPath(import.meta.url)),
	"../apps/nestjs-server/src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

function visit(node) {
	if (!node || typeof node !== "object" || Array.isArray(node)) return 0;
	let count = 0;
	if (node.type === "boolean" && node.default === false) {
		delete node.default;
		count += 1;
	}
	const props = node.properties;
	if (props && typeof props === "object") {
		for (const child of Object.values(props)) {
			count += visit(child);
		}
	}
	const items = node.items;
	if (items && typeof items === "object" && !Array.isArray(items)) {
		count += visit(items);
		if (items.properties) {
			for (const child of Object.values(items.properties)) {
				count += visit(child);
			}
		}
	}
	return count;
}

const snap = JSON.parse(readFileSync(snapshotPath, "utf-8"));
const stripped = visit(snap.jsonSchema);
writeFileSync(snapshotPath, `${JSON.stringify(snap, null, "\t")}\n`, "utf-8");
console.log(`Removed default:false from ${stripped} boolean fields`);

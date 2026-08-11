#!/usr/bin/env node
/**
 * Реестр Excel 2026.08.10: новые поля generalInfo в factory anketa snapshot.
 *
 *   node scripts/add-generalinfo-registry-fields-2026-08-10.mjs
 *
 * Идемпотентно: повторный запуск не дублирует ключи.
 */
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ANKETA_PATH = join(
	__dirname,
	"../src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

/** @typedef {{ key: string, title: string, help?: string, widget?: string, uid?: string }} NewField */

/** @type {NewField[]} */
const NEW_FIELDS = [
	{
		key: "initiative",
		title: "Инициатива",
		help: "",
	},
	{
		key: "project",
		title: "Проект",
	},
	{
		key: "gbl",
		title: "ГБЛ",
	},
	{
		key: "taskDescription",
		title: "Описание задачи",
		widget: "string_markdown",
	},
	{
		key: "budgetCampaign",
		title: "Бюджетная кампания",
	},
];

function loadJson(p) {
	return JSON.parse(readFileSync(p, "utf8"));
}

function saveJson(p, data) {
	writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function newUid() {
	return `field_${randomUUID()}`;
}

function insertOrderKeys(order, afterKey, keys) {
	const next = order.filter((k) => !keys.includes(k));
	const idx = next.indexOf(afterKey);
	if (idx < 0) {
		next.unshift(...keys);
		return next;
	}
	next.splice(idx + 1, 0, ...keys);
	return next;
}

function ensureBudgetCampaignOrder(order) {
	const next = order.filter((k) => k !== "budgetCampaign");
	const prodIdx = next.indexOf("productionAdditionalReports");
	if (prodIdx >= 0) {
		next.splice(prodIdx, 0, "budgetCampaign");
		return next;
	}
	next.push("budgetCampaign");
	return next;
}

function main() {
	const snap = loadJson(ANKETA_PATH);
	const schemaProps =
		snap.jsonSchema?.properties?.generalInfo?.properties ?? null;
	const uiNode = snap.uiSchema?.generalInfo ?? null;
	if (!schemaProps || !uiNode) {
		throw new Error("generalInfo missing in anketa snapshot");
	}

	const added = [];
	const skipped = [];

	for (const def of NEW_FIELDS) {
		if (schemaProps[def.key]) {
			skipped.push(def.key);
			continue;
		}
		const uid = def.uid ?? newUid();
		schemaProps[def.key] = {
			type: "string",
			title: def.title,
		};
		uiNode[def.key] = {
			...(def.widget ? { "ui:widget": def.widget } : {}),
			"ui:options": {
				schemaFieldUid: uid,
				...(def.widget === "string_markdown" ? { fullWidth: true } : {}),
			},
			"ui:placeholder": def.title,
			...(def.help ? { "ui:help": def.help } : {}),
		};
		added.push({ key: def.key, uid, title: def.title });
	}

	const headKeys = ["initiative", "project", "gbl", "taskDescription"].filter(
		(k) => schemaProps[k],
	);
	let order = Array.isArray(uiNode["ui:order"])
		? [...uiNode["ui:order"]]
		: Object.keys(schemaProps);
	order = insertOrderKeys(order, "field__iu-GEg1", headKeys);
	if (schemaProps.budgetCampaign) {
		order = ensureBudgetCampaignOrder(order);
	}
	uiNode["ui:order"] = order;

	saveJson(ANKETA_PATH, snap);

	console.log(
		JSON.stringify(
			{
				anketa: ANKETA_PATH,
				added,
				skipped,
				uiOrder: uiNode["ui:order"],
			},
			null,
			2,
		),
	);
}

main();

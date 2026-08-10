#!/usr/bin/env node
/**
 * LEGACY / недостаточный sync: обновляет ТОЛЬКО тонкий registry
 * (id, name, streams, norms) — без rules / labor / formulas.
 *
 * Для полного переноса карточек админки в factory bundle используйте:
 *   npm run publish:factory-typical-works -- <dump.json> [--write]
 *
 * Usage:
 *   node scripts/sync-factory-template-works-registry.mjs <works-list.json> [templateId]
 *
 * works-list.json — массив как GET /v2/works или data-transfer typicalWorks.
 * templateId — по умолчанию 424b8ab7-1be4-4d0a-a0a9-05edadd77ff5 (Схема для СА 10.07).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATE_ID = "424b8ab7-1be4-4d0a-a0a9-05edadd77ff5";
const outPath = join(
	__dirname,
	"../src/modules/anketa-v2/constants/v2-factory-template-typical-works.registry.json",
);

const sourcePath = process.argv[2];
const templateId = process.argv[3]?.trim() || DEFAULT_TEMPLATE_ID;

if (!sourcePath) {
	console.error(
		"Usage: node scripts/sync-factory-template-works-registry.mjs <works-list.json> [templateId]",
	);
	process.exit(1);
}

const raw = JSON.parse(readFileSync(sourcePath, "utf-8"));
const list = Array.isArray(raw)
	? raw
	: Array.isArray(raw.typicalWorks)
		? raw.typicalWorks
		: [];

const filtered = list
	.filter((row) => String(row.templateId ?? "") === templateId)
	.map((row) => ({
		id: String(row.id),
		name: String(row.name ?? ""),
		archComponentType: String(row.archComponentType ?? ""),
		workType: row.workType ?? null,
		streams: Array.isArray(row.streams) ? row.streams : ["Источники данных"],
		normsByStream:
			row.normsByStream && typeof row.normsByStream === "object"
				? row.normsByStream
				: {},
	}))
	.sort((a, b) => a.name.localeCompare(b.name, "ru"));

if (filtered.length === 0) {
	console.error(`No works for templateId=${templateId}`);
	process.exit(1);
}

const templateName =
	list.find((row) => row.templateId === templateId)?.templateName ?? "";

const snapshot = {
	meta: {
		snapshotVersion: 1,
		factoryBundle: true,
		description: `Типовые работы эталонной схемы (templateId=${templateId})`,
		sourceTemplateId: templateId,
		sourceTemplateName: templateName || undefined,
		counts: { works: filtered.length },
	},
	works: filtered,
};

writeFileSync(outPath, `${JSON.stringify(snapshot, null, "\t")}\n`, "utf-8");
console.log("Updated:", outPath);
console.log("  works:", filtered.length);
console.log("  template:", templateName || templateId);

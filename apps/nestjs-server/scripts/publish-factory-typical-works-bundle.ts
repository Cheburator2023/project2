#!/usr/bin/env tsx
/**
 * Публикует полные карточки типовых работ из админки в factory bundle:
 *   - v2-factory-template-typical-works.registry.json
 *   - v2-factory-typical-works.snapshot.json (upsert catalog rows)
 *
 * Вход: JSON вкладки «Типовые работы» / «Полный dump»
 *   { typicalWorks: V2TypicalWorkCardDto[], templateId?, templateName? }
 * или data-transfer-подобный объект с typicalWorks[].
 *
 * По умолчанию dry-run (только отчёт). Запись: --write
 *
 *   npm run publish:factory-typical-works -- path/to/dump.json
 *   npm run publish:factory-typical-works -- path/to/dump.json --write
 *   npm run publish:factory-typical-works -- path/to/dump.json --write --template-id <uuid>
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	publishFactoryTypicalWorksBundle,
	rebuildFactoryCatalogSnapshotMeta,
	type V2FactoryCatalogWorkRow,
} from "@smart-anketa/api-contract";
import type { V2FactoryTypicalWorksSnapshot } from "../src/modules/anketa-v2/constants/v2-factory-typical-works-catalog";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONSTANTS_DIR = join(
	__dirname,
	"../src/modules/anketa-v2/constants",
);
const REGISTRY_PATH = join(
	CONSTANTS_DIR,
	"v2-factory-template-typical-works.registry.json",
);
const CATALOG_PATH = join(
	CONSTANTS_DIR,
	"v2-factory-typical-works.snapshot.json",
);
const DEFAULT_TEMPLATE_ID = "424b8ab7-1be4-4d0a-a0a9-05edadd77ff5";
const REPORT_DIR = join(__dirname, "output");

function parseArgs(argv: string[]) {
	const positional: string[] = [];
	let write = false;
	let templateId: string | undefined;
	let templateName: string | undefined;
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--write") {
			write = true;
			continue;
		}
		if (arg === "--template-id") {
			templateId = argv[++i]?.trim();
			continue;
		}
		if (arg === "--template-name") {
			templateName = argv[++i]?.trim();
			continue;
		}
		if (arg?.startsWith("-")) {
			console.error(`Unknown flag: ${arg}`);
			process.exit(1);
		}
		if (arg) positional.push(arg);
	}
	return {
		sourcePath: positional[0],
		write,
		templateId,
		templateName,
	};
}

function extractCards(raw: unknown): {
	cards: unknown[];
	templateId?: string;
	templateName?: string;
} {
	if (Array.isArray(raw)) {
		return { cards: raw };
	}
	if (!raw || typeof raw !== "object") {
		throw new Error("Ожидается JSON-объект или массив карточек");
	}
	const obj = raw as Record<string, unknown>;
	const cards = Array.isArray(obj.typicalWorks)
		? obj.typicalWorks
		: Array.isArray(obj.works)
			? obj.works
			: null;
	if (!cards) {
		throw new Error(
			"В JSON нет typicalWorks[] (dump «Типовые работы» / «Полный dump»)",
		);
	}
	return {
		cards,
		templateId:
			typeof obj.templateId === "string" ? obj.templateId : undefined,
		templateName:
			typeof obj.templateName === "string" ? obj.templateName : undefined,
	};
}

const args = parseArgs(process.argv.slice(2));
if (!args.sourcePath) {
	console.error(
		"Usage: npm run publish:factory-typical-works -- <dump.json> [--write] [--template-id id] [--template-name name]",
	);
	process.exit(1);
}

const raw = JSON.parse(readFileSync(args.sourcePath, "utf-8"));
const extracted = extractCards(raw);
const templateId =
	args.templateId || extracted.templateId || DEFAULT_TEMPLATE_ID;
const templateName = args.templateName || extracted.templateName;

const catalogSnapshot = JSON.parse(
	readFileSync(CATALOG_PATH, "utf-8"),
) as V2FactoryTypicalWorksSnapshot;

const result = publishFactoryTypicalWorksBundle({
	cards: extracted.cards as never,
	existingCatalog: catalogSnapshot.typicalWorks as V2FactoryCatalogWorkRow[],
	templateId,
	templateName,
});

const reportPath = join(
	REPORT_DIR,
	`publish-factory-typical-works-${Date.now()}.json`,
);
mkdirSync(REPORT_DIR, { recursive: true });
writeFileSync(
	reportPath,
	`${JSON.stringify(
		{
			source: args.sourcePath,
			templateId,
			templateName,
			write: args.write,
			report: result.report,
			droppedSample: result.report.dropped.slice(0, 40),
		},
		null,
		"\t",
	)}\n`,
	"utf-8",
);

console.log("Publish factory typical-works bundle");
console.log("  source:", args.sourcePath);
console.log("  templateId:", templateId);
console.log("  registry works:", result.report.registryWorks);
console.log("  catalog added:", result.report.catalogAdded);
console.log("  catalog updated:", result.report.catalogUpdated);
console.log("  catalog unchanged:", result.report.catalogUnchanged);
console.log("  catalog preserved:", result.report.catalogPreserved);
console.log("  dropped fields:", result.report.dropped.length);
console.log("  legacy stream rows:", result.report.legacyStreamCatalogRows);
console.log("  report:", reportPath);

if (result.report.dropped.length > 0) {
	console.log("\nDropped (sample):");
	for (const item of result.report.dropped.slice(0, 15)) {
		console.log(
			`  - ${item.workName} [${item.streamExecutor}] ${item.field}: ${item.reason}`,
		);
	}
	if (result.report.dropped.length > 15) {
		console.log(`  … +${result.report.dropped.length - 15} more (see report)`);
	}
}

if (!args.write) {
	console.log("\nDry-run only. Re-run with --write to update factory JSON.");
	process.exit(0);
}

const catalogMeta = rebuildFactoryCatalogSnapshotMeta(result.catalogRows, {
	snapshotVersion: catalogSnapshot.meta.snapshotVersion,
	description: catalogSnapshot.meta.description,
});

const nextCatalog: V2FactoryTypicalWorksSnapshot = {
	...catalogSnapshot,
	meta: {
		...catalogMeta,
		counts: {
			...catalogMeta.counts,
			dictionaries: catalogSnapshot.dictionaries?.length ?? 0,
		},
	},
	typicalWorks: result.catalogRows as V2FactoryTypicalWorksSnapshot["typicalWorks"],
	dictionaries: catalogSnapshot.dictionaries,
};

writeFileSync(
	REGISTRY_PATH,
	`${JSON.stringify(result.registry, null, "\t")}\n`,
	"utf-8",
);
writeFileSync(CATALOG_PATH, `${JSON.stringify(nextCatalog, null, "\t")}\n`, "utf-8");

console.log("\nUpdated:");
console.log("  ", REGISTRY_PATH);
console.log("  ", CATALOG_PATH);

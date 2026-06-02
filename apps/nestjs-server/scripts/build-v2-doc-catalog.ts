/**
 * Генератор каталога V2 из авторитетных документов методолога.
 *
 * Источники истины (llm/v2_new_docs):
 *  • работы.csv               — справочник типовых работ (компонент + параметр-триггер → работа + норматив ч/д)
 *  • справочники_сфера_документы.csv — методологические справочники (веса, классы, виды контроля, каналы и т.д.)
 *
 * Результат: src/modules/anketa-v2/constants/generated/v2-doc-catalog.generated.json
 *   { meta, typicalWorks[], dictionaries[] }
 *
 * Принцип (FR-16, глоссарий «Справочник типовых работ»): добавление работы/параметра =
 * строка в CSV, а не правка кода. Этот скрипт переносит данные доков в каталог,
 * который потребляют seed-сервис и заводская логика. Запуск: `npm run build:doc-catalog`.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const DOCS_DIR = join(REPO_ROOT, "llm", "v2_new_docs");
const WORKS_CSV = join(DOCS_DIR, "работы.csv");
const DICTS_CSV = join(DOCS_DIR, "справочники_сфера_документы.csv");
const OUT_FILE = join(
	__dirname,
	"..",
	"src",
	"modules",
	"anketa-v2",
	"constants",
	"generated",
	"v2-doc-catalog.generated.json",
);

/** RFC4180-подобный парсер: разделитель `;`, поддержка кавычек и переносов строк внутри полей. */
function parseCsv(text: string, delimiter = ";"): string[][] {
	const rows: string[][] = [];
	let field = "";
	let row: string[] = [];
	let inQuotes = false;
	const src = text.replace(/^\uFEFF/, "");

	for (let i = 0; i < src.length; i++) {
		const ch = src[i];
		if (inQuotes) {
			if (ch === '"') {
				if (src[i + 1] === '"') {
					field += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				field += ch;
			}
			continue;
		}
		if (ch === '"') {
			inQuotes = true;
		} else if (ch === delimiter) {
			row.push(field);
			field = "";
		} else if (ch === "\n") {
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
		} else if (ch === "\r") {
			// игнорируем — \r\n обрабатываем по \n
		} else {
			field += ch;
		}
	}
	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function clean(value: string | undefined): string {
	return (value ?? "").replace(/\s+/g, " ").trim();
}

/** Норматив ч/д: "0,7" → 0.7; "1" → 1; "Да"/пусто → null. */
function parseNorm(raw: string | undefined): number | null {
	const v = clean(raw).replace(",", ".");
	if (!v) return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

/** Нормализуем код арх-компонента из текста "Арх.Компонент.Система источник". */
function normalizeComponent(raw: string): string {
	const v = clean(raw)
		.replace(/^Арх\.?\s*Компонент\.?\s*/i, "")
		.replace(/\s+/g, " ")
		.trim();
	const map: Record<string, string> = {
		"Система источник": "Система-источник",
		"Система-источник": "Система-источник",
		"Объект данных": "Объект/Витрина данных",
		"Процессы Обработки данных": "Процесс обработки данных",
		"Модельный сервис": "Модельный сервис",
		Модель: "Модель",
	};
	return map[v] ?? v;
}

type TypicalWork = {
	stream: string;
	component: string;
	stage: string;
	name: string;
	originalName: string;
	workType: string;
	norm: number | null;
	normRaw: string;
	triggerParam: string;
	triggerParams: string[];
	laborParams: string[];
};

function buildTypicalWorks(): TypicalWork[] {
	const rows = parseCsv(readFileSync(WORKS_CSV, "utf-8"));
	const [header, ...body] = rows;
	const idx = (name: string) =>
		header.findIndex((h) => clean(h).toLowerCase().startsWith(name.toLowerCase()));
	const cStream = idx("Стрим");
	const cComponent = idx("Арх");
	const cOriginal = idx("Название оригинальное");
	const cName = idx("Название");
	const cContext = idx("Контекст");
	const cWorkType = idx("Тип работы");
	const cNorm = idx("Наличие норматива");
	const cTrigger = idx("Параметр-триггер");
	const cLabor = idx("Параметры трудоемкости");

	const splitList = (raw: string): string[] =>
		clean(raw)
			.split(/[,\n]/)
			.map((s) => s.trim())
			.filter(Boolean);

	return body
		.map((r): TypicalWork => {
			const originalName = clean(r[cOriginal]);
			const name = clean(r[cName]) || originalName;
			const triggerRaw = clean(r[cTrigger]);
			return {
				stream: clean(r[cStream]),
				component: normalizeComponent(r[cComponent] ?? ""),
				stage: clean(r[cContext]),
				name,
				originalName,
				workType: clean(r[cWorkType]),
				norm: parseNorm(r[cNorm]),
				normRaw: clean(r[cNorm]),
				triggerParam: triggerRaw,
				triggerParams: splitList(triggerRaw),
				laborParams: cLabor >= 0 ? splitList(r[cLabor] ?? "") : [],
			};
		})
		.filter((w) => w.name.length > 0);
}

type DictValue = {
	raw: string;
	label: string;
	coeffRaw: string | null;
	coeff: number | null;
};

type Dictionary = {
	id: string;
	name: string;
	category: string;
	novelty: string;
	controlType: string;
	sources: string;
	values: DictValue[];
	attributes: string;
	comments: string;
};

/** Из строки значения справочника извлекаем подпись и коэффициент "(×N)". */
function parseDictValue(line: string): DictValue {
	const raw = line.trim();
	const m = raw.match(/\(×\s*([^)]*)\)/i);
	const coeffRaw = m ? m[1].trim() : null;
	// единичный числовой коэффициент → number; составной ("1 / 0.75 / 1") оставляем в coeffRaw.
	let coeff: number | null = null;
	if (coeffRaw) {
		const single = coeffRaw.replace(",", ".");
		const n = Number(single);
		if (Number.isFinite(n)) coeff = n;
	}
	const label = raw.replace(/\s*\(×[^)]*\)\s*$/i, "").trim();
	return { raw, label, coeffRaw, coeff };
}

function buildDictionaries(): Dictionary[] {
	const rows = parseCsv(readFileSync(DICTS_CSV, "utf-8"));
	const [, ...body] = rows;
	// Колонки фиксированы: №;Наименование;Категория;Существующий/новый;Тип контрола;Источник;Значения;Атрибуты записи;Комментарии
	return body
		.map((r): Dictionary => {
			const valueLines = (r[6] ?? "")
				.split("\n")
				.map((l) => l.trim())
				.filter(Boolean);
			return {
				id: clean(r[0]),
				name: clean(r[1]),
				category: clean(r[2]),
				novelty: clean(r[3]),
				controlType: clean(r[4]),
				sources: clean(r[5]),
				values: valueLines.map(parseDictValue),
				attributes: clean(r[7]),
				comments: clean(r[8]),
			};
		})
		.filter((d) => d.name.length > 0);
}

function docCatalogSourcesAvailable(): boolean {
	return existsSync(WORKS_CSV) && existsSync(DICTS_CSV);
}

function main(): void {
	if (!docCatalogSourcesAvailable()) {
		if (existsSync(OUT_FILE)) {
			console.log(
				"V2 doc-catalog: CSV источники не найдены, используется закоммиченный артефакт:",
			);
			console.log(`  → ${OUT_FILE}`);
			return;
		}
		throw new Error(
			[
				"V2 doc-catalog: не найдены CSV источники и отсутствует сгенерированный каталог.",
				`Ожидались: ${WORKS_CSV}, ${DICTS_CSV}`,
				`Или артефакт: ${OUT_FILE}`,
				"Локально: положите CSV в llm/v2_new_docs и запустите npm run build:doc-catalog.",
			].join("\n"),
		);
	}

	const typicalWorks = buildTypicalWorks();
	const dictionaries = buildDictionaries();

	const streams = [...new Set(typicalWorks.map((w) => w.stream))].filter(Boolean);
	const components = [...new Set(typicalWorks.map((w) => w.component))].filter(Boolean);
	const stages = [...new Set(typicalWorks.map((w) => w.stage))].filter(Boolean);
	const withNorm = typicalWorks.filter((w) => w.norm !== null).length;

	const payload = {
		meta: {
			generatedAt: new Date().toISOString(),
			sources: {
				works: "llm/v2_new_docs/работы.csv",
				dictionaries: "llm/v2_new_docs/справочники_сфера_документы.csv",
			},
			counts: {
				typicalWorks: typicalWorks.length,
				typicalWorksWithNorm: withNorm,
				dictionaries: dictionaries.length,
				streams: streams.length,
				components: components.length,
				stages: stages.length,
			},
			streams,
			components,
			stages,
		},
		typicalWorks,
		dictionaries,
	};

	mkdirSync(dirname(OUT_FILE), { recursive: true });
	writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");

	console.log("V2 doc-catalog сгенерирован:");
	console.log(`  типовых работ:        ${typicalWorks.length} (с нормативом: ${withNorm})`);
	console.log(`  справочников:         ${dictionaries.length}`);
	console.log(`  стримов:              ${streams.join(", ")}`);
	console.log(`  компонентов:          ${components.join(", ")}`);
	console.log(`  → ${OUT_FILE}`);
}

main();

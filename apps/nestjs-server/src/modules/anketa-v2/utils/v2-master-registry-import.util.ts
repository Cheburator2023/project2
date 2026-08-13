/**
 * Маппинг «Оценка Инициативы» → formData по реестру Excel 2026.08.10.
 * Загружаем только поля из маппинга; «Проект» — schema-only (не из файла).
 */

export const V2_MASTER_REGISTRY_SHEET_NAME = "Оценка Инициативы";
/** 0-based: строка заголовков «Инициатива / Департамент / …». */
export const V2_MASTER_REGISTRY_HEADER_ROW = 3;
/** 0-based: первая строка данных. */
export const V2_MASTER_REGISTRY_DATA_START = 4;

export const V2_MASTER_REGISTRY_COLS = {
	no: 0,
	initiative: 1, // B
	department: 2, // C
	customerFio: 4, // E
	gbl: 5, // F
	name: 7, // H
	taskDescription: 8, // I
	production: 14, // O
	stream: 16, // Q
} as const;

const STREAM_ALIASES: Array<{ re: RegExp; code: string; label: string }> = [
	{ re: /^моделирование\s*рб$/i, code: "rb", label: "Моделирование РБ" },
	{
		re: /^стрим\s*разработка\s*моделей\s*(киб|кмб).*(смб|ксб)/i,
		code: "kmbkcb",
		label: "Разработка моделей КМБ/КСБ",
	},
	{
		re: /^разработка\s*моделей\s*(кмб|киб).*(ксб|смб)/i,
		code: "kmbkcb",
		label: "Разработка моделей КМБ/КСБ",
	},
	{ re: /^моделирование\s*rnd$/i, code: "rnd", label: "Моделирование RnD" },
	{ re: /^источники\s*данных$/i, code: "idsrc", label: "Источники данных" },
	{
		re: /контроль\s*(качества\s*)?модел/i,
		code: "mdlctl",
		label: "Контроль качества моделей",
	},
	{
		re: /^стрим\s*["«]?контроль\s*моделей["»]?$/i,
		code: "mdlctl",
		label: "Контроль качества моделей",
	},
	{ re: /цифров(ые|ых)\s*агент/i, code: "digagt", label: "Цифровые агенты" },
	{ re: /^потоковые\s*данные$/i, code: "strdat", label: "Потоковые данные" },
	{
		re: /ai[-\s]*модели\s*партнерств/i,
		code: "ptitpc",
		label: "AI-модели партнерств",
	},
	{ re: /^стрим\s*дадм$|^дадм$/i, code: "dadm", label: "Стрим ДАДМ" },
	{
		re: /финансовое\s*моделирование/i,
		code: "finmdl",
		label: "Финансовое моделирование",
	},
	{
		re: /платформ.*решени.*моделир|^пирм$/i,
		code: "pirm",
		label: "ПИРМ",
	},
];

const STREAM_SUGGESTION_LABELS = [
	...new Map(STREAM_ALIASES.map((a) => [a.code, a.label])).entries(),
].map(([code, label]) => `${label} → ${code}`);

const DEPT_ACRONYM_STOPWORDS = new Set([
	"и",
	"по",
	"для",
	"с",
	"в",
	"на",
	"из",
	"к",
	"от",
	"а",
	"или",
	"the",
	"of",
]);

export type V2MasterRegistryIssueCode =
	| "dept_unmatched"
	| "stream_unmatched"
	| "prod_invalid"
	| "name_missing";

export type V2MasterRegistryIssue = {
	code: V2MasterRegistryIssueCode;
	value?: string;
	/** Близкие значения из справочника СА (для дебага несопоставленных). */
	suggestions?: string[];
};

/** Ручные сопоставления из dry-run UI → применяются при повторной проверке / merge. */
export type V2MasterRegistryImportOverrides = {
	departments?: Record<string, string>;
	streams?: Record<string, string>;
	production?: Record<string, string>;
};

/** Короткий стабильный хеш для имени-заглушки. */
export function shortMasterHash(input: string): string {
	let h = 2166136261;
	for (let i = 0; i < input.length; i += 1) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0).toString(16).padStart(8, "0").slice(0, 8);
}

/**
 * Заглушка названия, если в Excel пустое «Наименование задачи».
 * Пример: «Анкета без названия — 2026-08-13 — a1b2c3d4».
 */
export function buildPlaceholderCalcName(parts: {
	masterRow: number;
	masterNo: string;
	initiative?: string;
	/** Для уникальности при повторных импортах. */
	nonce?: string | number;
}): string {
	const date = new Date().toISOString().slice(0, 10);
	const seed = [
		parts.masterRow,
		parts.masterNo,
		parts.initiative ?? "",
		parts.nonce ?? Date.now(),
	].join("|");
	return `Анкета без названия — ${date} — ${shortMasterHash(seed)}`;
}

export function lookupOverride(
	raw: string,
	overrides: Record<string, string> | undefined,
): string | null {
	if (!overrides) return null;
	const text = normMasterText(raw);
	if (!text) return null;
	const direct = overrides[text];
	if (direct) return normMasterText(direct) || null;
	const soft = softNormKey(text);
	for (const [from, to] of Object.entries(overrides)) {
		if (softNormKey(from) === soft) {
			const value = normMasterText(to);
			if (value) return value;
		}
	}
	return null;
}

/** Из подсказки стрима «Моделирование РБ → rb» достаёт код. */
export function streamCodeFromSuggestion(suggestion: string): string | null {
	const text = normMasterText(suggestion);
	const arrow = text.split(/\s*→\s*/);
	if (arrow.length >= 2) {
		const code = normMasterText(arrow[arrow.length - 1]).toLowerCase();
		return code || null;
	}
	const resolved = resolveStreamCode(text);
	return resolved;
}

export type V2MasterRegistryMappedRow = {
	masterRow: number;
	masterNo: string;
	calcName: string;
	formData: {
		meta: Record<string, unknown>;
		generalInfo: Record<string, unknown>;
	};
	issues: V2MasterRegistryIssue[];
};

export type V2MasterRegistryParseStats = {
	rowsTotal: number;
	rowsSkippedEmpty: number;
	rowsReady: number;
	rowsWithoutName: number;
	mapped: {
		initiative: number;
		businessCustomer: number;
		implementationStream: number;
		name: number;
		customerFio: number;
		gbl: number;
		taskDescription: number;
		productionAdditionalReports: number;
		budgetCampaign: number;
	};
	issues: {
		dept_unmatched: number;
		stream_unmatched: number;
		prod_invalid: number;
		name_missing: number;
	};
};

export function normMasterText(value: unknown): string {
	const s = String(value ?? "")
		.replace(/\u00a0/g, " ")
		.replace(/[\u200b\u200c\u200d\ufeff]/g, "");
	return s.replace(/\s+/g, " ").trim();
}

export function normMasterKey(value: unknown): string {
	const s = normMasterText(value)
		.replace(/[‐‑‒–—―]/g, "-")
		.replace(/\s*-\s*/g, "-");
	return s.toLocaleLowerCase("ru");
}

/** Мягкий ключ: дефисы/точки как пробелы (комплаенс-контроля ≈ комплаенс контроля). */
export function softNormKey(value: unknown): string {
	return normMasterKey(value)
		.replace(/[.\-_]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function cellAt(row: readonly unknown[], idx: number): string {
	if (idx < 0 || idx >= row.length) return "";
	return normMasterText(row[idx]);
}

/** Аббревиатура департамента: «Департамент внутреннего аудита» → «ДВА». */
export function deptAcronym(label: string, keepConjunctions = false): string {
	const main = (label.split(/[._]/)[0] ?? label).trim();
	const words = main.split(/[\s/]+/).filter(Boolean);
	const letters: string[] = [];
	for (const word of words) {
		const key = word.toLocaleLowerCase("ru");
		if (!keepConjunctions && DEPT_ACRONYM_STOPWORDS.has(key)) continue;
		if (keepConjunctions && key === "и") {
			letters.push("и");
			continue;
		}
		if (keepConjunctions && DEPT_ACRONYM_STOPWORDS.has(key)) continue;
		for (const part of word.split("-").filter(Boolean)) {
			const ch = part[0];
			if (ch) letters.push(ch.toLocaleUpperCase("ru"));
		}
	}
	return letters.join("");
}

function deptAcronymVariants(label: string): string[] {
	const variants = [
		deptAcronym(label, false),
		deptAcronym(label, true),
	].filter(Boolean);
	return [...new Set(variants)];
}

function acronymsEquivalent(rawAbbrev: string, candidateAcr: string): boolean {
	const a = rawAbbrev.toLocaleUpperCase("ru");
	const b = candidateAcr.toLocaleUpperCase("ru");
	return a === b;
}

function tokenSet(value: string): Set<string> {
	return new Set(
		softNormKey(value)
			.split(" ")
			.filter((t) => t.length > 1 && !DEPT_ACRONYM_STOPWORDS.has(t)),
	);
}

function jaccard(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 || b.size === 0) return 0;
	let inter = 0;
	for (const t of a) if (b.has(t)) inter += 1;
	return inter / (a.size + b.size - inter);
}

function levenshtein(a: string, b: string): number {
	if (a === b) return 0;
	if (!a.length) return b.length;
	if (!b.length) return a.length;
	const prev = new Array<number>(b.length + 1);
	const cur = new Array<number>(b.length + 1);
	for (let j = 0; j <= b.length; j += 1) prev[j] = j;
	for (let i = 1; i <= a.length; i += 1) {
		cur[0] = i;
		for (let j = 1; j <= b.length; j += 1) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			cur[j] = Math.min(
				(prev[j] ?? 0) + 1,
				(cur[j - 1] ?? 0) + 1,
				(prev[j - 1] ?? 0) + cost,
			);
		}
		for (let j = 0; j <= b.length; j += 1) prev[j] = cur[j] ?? 0;
	}
	return prev[b.length] ?? 0;
}

/**
 * Близкие значения из справочника СА для несопоставленного значения из файла.
 * Аббревиатуры (ДАДМ, ДВА) сопоставляются с акронимами подписей.
 */
export function suggestSimilarLabels(
	raw: string,
	candidates: readonly string[],
	limit = 3,
): string[] {
	const text = normMasterText(raw);
	if (!text || text === "?" || text === "??") return [];
	const softRaw = softNormKey(text);
	const acrRaw = text.replace(/[^a-zA-Zа-яА-ЯёЁ0-9]/g, "").toLocaleUpperCase("ru");
	const rawTokens = tokenSet(text);
	const isAbbrev = acrRaw.length >= 2 && acrRaw.length <= 8 && !/\s/.test(text);

	type Scored = { label: string; score: number; parentFirst: boolean };
	const scored: Scored[] = [];

	for (const label of candidates) {
		const softLabel = softNormKey(label);
		if (!softLabel) continue;
		let score = 0;
		if (softLabel === softRaw) score = 100;
		else if (isAbbrev) {
			const variants = deptAcronymVariants(label);
			if (variants.some((acr) => acronymsEquivalent(acrRaw, acr))) {
				score = 92;
			} else if (
				variants.some(
					(acr) =>
						acr.length >= 4 &&
						acrRaw.length >= 4 &&
						(acr.toLocaleUpperCase("ru").startsWith(acrRaw) ||
							acrRaw.startsWith(acr.toLocaleUpperCase("ru"))),
				)
			) {
				score = 78;
			} else if (
				softLabel.includes(softRaw) &&
				softRaw.length >= 3
			) {
				score = 60;
			}
		} else if (softLabel.includes(softRaw) || softRaw.includes(softLabel)) {
			score = 85;
		} else {
			const jac = jaccard(rawTokens, tokenSet(label));
			if (jac >= 0.5) score = 55 + jac * 30;
			else if (softRaw.length >= 8 && softLabel.length >= 8) {
				const dist = levenshtein(
					softRaw.slice(0, 64),
					softLabel.slice(0, 64),
				);
				const maxLen = Math.max(softRaw.length, softLabel.length, 1);
				const ratio = 1 - dist / maxLen;
				if (ratio >= 0.72) score = 50 + ratio * 30;
			}
		}
		if (score <= 0) continue;
		scored.push({
			label,
			score,
			parentFirst: !label.includes(".") && !label.includes("_"),
		});
	}

	scored.sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		if (a.parentFirst !== b.parentFirst) return a.parentFirst ? -1 : 1;
		return a.label.length - b.label.length;
	});

	const out: string[] = [];
	const seen = new Set<string>();
	for (const item of scored) {
		if (seen.has(item.label)) continue;
		seen.add(item.label);
		out.push(item.label);
		if (out.length >= limit) break;
	}
	return out;
}

export function suggestStreamLabels(raw: string, limit = 3): string[] {
	const text = normMasterText(raw);
	if (!text) return [];
	return suggestSimilarLabels(
		text,
		STREAM_SUGGESTION_LABELS.map((s) => s.split(" → ")[0] ?? s),
		limit,
	).map((label) => {
		const hit = STREAM_ALIASES.find((a) => a.label === label);
		return hit ? `${hit.label} → ${hit.code}` : label;
	});
}

export function suggestProductionValues(raw: string): string[] {
	const text = normMasterText(raw);
	if (!text) return [];
	const key = softNormKey(text);
	if (key === "да" || key === "yes" || key === "true") {
		return ["1", "Не требуется"];
	}
	if (key === "нет" || key === "no" || key === "false") {
		return ["Не требуется"];
	}
	return ["Не требуется", "1", "2", "3"];
}

export function buildDeptDictionary(
	schemaEnumLabels: readonly string[],
	extraLabels: readonly string[] = [],
): {
	byKey: Map<string, string>;
	bySoftKey: Map<string, string>;
	schemaKeys: Set<string>;
	schemaLabels: string[];
} {
	const byKey = new Map<string, string>();
	const bySoftKey = new Map<string, string>();
	const schemaKeys = new Set<string>();
	const schemaLabels: string[] = [];
	for (const label of schemaEnumLabels) {
		const text = normMasterText(label);
		if (!text) continue;
		schemaLabels.push(text);
		const key = normMasterKey(text);
		const soft = softNormKey(text);
		if (key) {
			byKey.set(key, text);
			schemaKeys.add(key);
		}
		if (soft && !bySoftKey.has(soft)) bySoftKey.set(soft, text);
	}
	for (const label of extraLabels) {
		const text = normMasterText(label);
		if (!text || /^блок$/i.test(text)) continue;
		const key = normMasterKey(text);
		const soft = softNormKey(text);
		if (key && !byKey.has(key)) byKey.set(key, text);
		if (soft && !bySoftKey.has(soft)) bySoftKey.set(soft, text);
	}
	return { byKey, bySoftKey, schemaKeys, schemaLabels };
}

export function resolveDeptLabel(
	raw: string,
	byKey: Map<string, string>,
	schemaKeys: Set<string>,
	bySoftKey?: Map<string, string>,
): string | null {
	const key = normMasterKey(raw);
	if (!key) return null;
	const hit = byKey.get(key);
	if (hit && schemaKeys.has(normMasterKey(hit))) return hit;
	if (bySoftKey) {
		const softHit = bySoftKey.get(softNormKey(raw));
		if (softHit && schemaKeys.has(normMasterKey(softHit))) return softHit;
	}
	return null;
}

const STREAM_CODES = new Set(STREAM_ALIASES.map((a) => a.code));

/**
 * @param mode `fuzzy` — dry-run / подсказки (regex-алиасы);
 * `exact` — загрузка в БД: только точное имя стрима или код enum.
 */
export function resolveStreamCode(
	raw: string,
	mode: "fuzzy" | "exact" = "fuzzy",
): string | null {
	const t = normMasterText(raw);
	if (!t) return null;
	const asCode = t.toLowerCase();
	if (STREAM_CODES.has(asCode)) return asCode;

	const soft = softNormKey(t);
	const key = normMasterKey(t);
	for (const { label, code } of STREAM_ALIASES) {
		if (normMasterKey(label) === key || softNormKey(label) === soft) {
			return code;
		}
	}
	if (mode === "exact") return null;

	for (const { re, code } of STREAM_ALIASES) {
		if (re.test(t) || re.test(key)) return code;
	}
	return null;
}

export function productionAllowedValues(): Set<string> {
	const allowed = new Set<string>(["Не требуется"]);
	for (let n = 1; n < 100; n += 1) allowed.add(String(n));
	return allowed;
}

export function findBudgetCampaignColumn(header: readonly unknown[]): number {
	for (let i = 0; i < header.length; i += 1) {
		const key = normMasterKey(header[i]);
		if (key.includes("бюджетн") && key.includes("кампан")) return i;
	}
	return -1;
}

export function rowHasRegistryData(row: readonly unknown[]): boolean {
	const cols = V2_MASTER_REGISTRY_COLS;
	return (
		Boolean(cellAt(row, cols.initiative)) ||
		Boolean(cellAt(row, cols.department)) ||
		Boolean(cellAt(row, cols.customerFio)) ||
		Boolean(cellAt(row, cols.gbl)) ||
		Boolean(cellAt(row, cols.name)) ||
		Boolean(cellAt(row, cols.taskDescription)) ||
		Boolean(cellAt(row, cols.production)) ||
		Boolean(cellAt(row, cols.stream))
	);
}

export type V2MasterRegistryRowMapResult = {
	row: V2MasterRegistryMappedRow;
	mappedFlags: {
		initiative: boolean;
		businessCustomer: boolean;
		implementationStream: boolean;
		name: boolean;
		customerFio: boolean;
		gbl: boolean;
		taskDescription: boolean;
		productionAdditionalReports: boolean;
		budgetCampaign: boolean;
	};
};

export function mapMasterRegistryRow(
	row: readonly unknown[],
	options: {
		masterRow1Based: number;
		budgetCol: number;
		deptByKey: Map<string, string>;
		deptBySoftKey: Map<string, string>;
		schemaDeptKeys: Set<string>;
		schemaDeptLabels: readonly string[];
		allowedProd: Set<string>;
		overrides?: V2MasterRegistryImportOverrides;
		/**
		 * true — загрузка в БД: только точные имена + явные overrides.
		 * Несовпавшие справочные поля остаются пустыми (анкета всё равно создаётся).
		 * Аббревиатуры / soft-match / regex-стримы не подставляются сами;
		 * suggestions для UI не считаются.
		 */
		strictMatching?: boolean;
	},
): V2MasterRegistryRowMapResult | null {
	if (!rowHasRegistryData(row)) return null;

	const cols = V2_MASTER_REGISTRY_COLS;
	const masterNo =
		cellAt(row, cols.no) ||
		String(
			options.masterRow1Based - (V2_MASTER_REGISTRY_DATA_START + 1) + 1,
		);
	const formData = {
		meta: {} as Record<string, unknown>,
		generalInfo: {} as Record<string, unknown>,
	};
	const issues: V2MasterRegistryIssue[] = [];
	const mappedFlags = {
		initiative: false,
		businessCustomer: false,
		implementationStream: false,
		name: false,
		customerFio: false,
		gbl: false,
		taskDescription: false,
		productionAdditionalReports: false,
		budgetCampaign: false,
	};
	const overrides = options.overrides ?? {};
	const strict = Boolean(options.strictMatching);
	const deptSoft = strict ? undefined : options.deptBySoftKey;
	const streamMode = strict ? "exact" : "fuzzy";

	const initiative = cellAt(row, cols.initiative);
	if (initiative) {
		formData.generalInfo.initiative = initiative;
		mappedFlags.initiative = true;
	}

	const deptRaw = cellAt(row, cols.department);
	if (deptRaw) {
		const overridden = lookupOverride(deptRaw, overrides.departments);
		let resolved: string | null = null;
		if (overridden) {
			resolved =
				resolveDeptLabel(
					overridden,
					options.deptByKey,
					options.schemaDeptKeys,
					deptSoft,
				) ||
				(options.schemaDeptKeys.has(normMasterKey(overridden))
					? overridden
					: null);
		}
		if (!resolved) {
			resolved = resolveDeptLabel(
				deptRaw,
				options.deptByKey,
				options.schemaDeptKeys,
				deptSoft,
			);
		}
		if (resolved) {
			formData.generalInfo.businessCustomer = [resolved];
			mappedFlags.businessCustomer = true;
		} else {
			/** Строгий режим: поле пустое; suggestions только для dry-run UI. */
			const suggestions = strict
				? []
				: suggestSimilarLabels(deptRaw, options.schemaDeptLabels, 3);
			issues.push({
				code: "dept_unmatched",
				value: deptRaw,
				...(suggestions.length > 0 ? { suggestions } : {}),
			});
		}
	}

	const streamRaw = cellAt(row, cols.stream);
	if (streamRaw) {
		const overridden = lookupOverride(streamRaw, overrides.streams);
		const code =
			(overridden
				? resolveStreamCode(overridden, streamMode) ||
					(STREAM_CODES.has(overridden.toLowerCase())
						? overridden.toLowerCase()
						: null)
				: null) || resolveStreamCode(streamRaw, streamMode);
		if (code) {
			formData.generalInfo.implementationStream = code;
			mappedFlags.implementationStream = true;
		} else {
			const suggestions = strict ? [] : suggestStreamLabels(streamRaw, 3);
			issues.push({
				code: "stream_unmatched",
				value: streamRaw,
				...(suggestions.length > 0 ? { suggestions } : {}),
			});
		}
	}

	const nameRaw = cellAt(row, cols.name);
	let name = nameRaw;
	if (name) {
		formData.meta.name = name;
		mappedFlags.name = true;
	} else {
		name = buildPlaceholderCalcName({
			masterRow: options.masterRow1Based,
			masterNo,
			initiative: initiative || undefined,
		});
		formData.meta.name = name;
		mappedFlags.name = true;
		issues.push({
			code: "name_missing",
			value: "(пусто в Excel)",
		});
	}

	const fio = cellAt(row, cols.customerFio);
	if (fio) {
		formData.generalInfo.field_vz9bm7A3 = fio;
		mappedFlags.customerFio = true;
	}

	const gbl = cellAt(row, cols.gbl);
	if (gbl) {
		formData.generalInfo.gbl = gbl;
		mappedFlags.gbl = true;
	}

	const taskDescription = cellAt(row, cols.taskDescription);
	if (taskDescription) {
		formData.generalInfo.taskDescription = taskDescription;
		mappedFlags.taskDescription = true;
	}

	const prodRaw = cellAt(row, cols.production);
	if (prodRaw) {
		const overridden = lookupOverride(prodRaw, overrides.production);
		const prodValue =
			overridden && options.allowedProd.has(overridden)
				? overridden
				: options.allowedProd.has(prodRaw)
					? prodRaw
					: null;
		if (prodValue) {
			formData.generalInfo.productionAdditionalReports = prodValue;
			mappedFlags.productionAdditionalReports = true;
		} else {
			const suggestions = strict ? [] : suggestProductionValues(prodRaw);
			issues.push({
				code: "prod_invalid",
				value: prodRaw,
				...(suggestions.length > 0 ? { suggestions } : {}),
			});
		}
	}

	if (options.budgetCol >= 0) {
		const budget = cellAt(row, options.budgetCol);
		if (budget) {
			formData.generalInfo.budgetCampaign = budget;
			mappedFlags.budgetCampaign = true;
		}
	}

	return {
		row: {
			masterRow: options.masterRow1Based,
			masterNo,
			calcName: name,
			formData,
			issues,
		},
		mappedFlags,
	};
}

/** Разбор матрицы строк листа (уже как string[][]). */
export function parseMasterRegistryRows(
	rows: readonly (readonly unknown[])[],
	options: {
		schemaDeptLabels: readonly string[];
		extraDeptLabels?: readonly string[];
		overrides?: V2MasterRegistryImportOverrides;
		/** Загрузка в БД без dry-run — только точные совпадения (+ overrides). */
		strictMatching?: boolean;
	},
): {
	rows: V2MasterRegistryMappedRow[];
	stats: V2MasterRegistryParseStats;
	budgetCampaignColumn: number | null;
} {
	const header =
		rows[V2_MASTER_REGISTRY_HEADER_ROW] ?? ([] as unknown[]);
	const budgetCol = findBudgetCampaignColumn(header);
	const { byKey, bySoftKey, schemaKeys, schemaLabels } = buildDeptDictionary(
		options.schemaDeptLabels,
		options.extraDeptLabels ?? [],
	);
	const allowedProd = productionAllowedValues();

	const stats: V2MasterRegistryParseStats = {
		rowsTotal: 0,
		rowsSkippedEmpty: 0,
		rowsReady: 0,
		rowsWithoutName: 0,
		mapped: {
			initiative: 0,
			businessCustomer: 0,
			implementationStream: 0,
			name: 0,
			customerFio: 0,
			gbl: 0,
			taskDescription: 0,
			productionAdditionalReports: 0,
			budgetCampaign: 0,
		},
		issues: {
			dept_unmatched: 0,
			stream_unmatched: 0,
			prod_invalid: 0,
			name_missing: 0,
		},
	};

	const mappedRows: V2MasterRegistryMappedRow[] = [];

	for (let r = V2_MASTER_REGISTRY_DATA_START; r < rows.length; r += 1) {
		stats.rowsTotal += 1;
		const row = rows[r] ?? [];
		const result = mapMasterRegistryRow(row, {
			masterRow1Based: r + 1,
			budgetCol,
			deptByKey: byKey,
			deptBySoftKey: bySoftKey,
			schemaDeptKeys: schemaKeys,
			schemaDeptLabels: schemaLabels,
			allowedProd,
			overrides: options.overrides,
			strictMatching: options.strictMatching,
		});
		if (!result) {
			stats.rowsSkippedEmpty += 1;
			continue;
		}
		for (const [key, on] of Object.entries(result.mappedFlags)) {
			if (on && key in stats.mapped) {
				stats.mapped[key as keyof typeof stats.mapped] += 1;
			}
		}
		for (const issue of result.row.issues) {
			stats.issues[issue.code] += 1;
		}
		const hadGeneratedName = result.row.issues.some(
			(issue) => issue.code === "name_missing",
		);
		if (hadGeneratedName) {
			stats.rowsWithoutName += 1;
		}
		if (result.row.calcName) {
			stats.rowsReady += 1;
		}
		mappedRows.push(result.row);
	}

	return {
		rows: mappedRows,
		stats,
		budgetCampaignColumn: budgetCol >= 0 ? budgetCol : null,
	};
}

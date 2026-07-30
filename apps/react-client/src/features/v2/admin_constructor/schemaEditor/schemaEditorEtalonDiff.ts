import type {
	V2TypicalWorkCardDto,
	V2WorkRefIndexItemDto,
} from "@smart-anketa/api-contract";
import { normalizeParamLabel } from "@smart-anketa/api-contract";

/** Любой UUID-подобный id (в т.ч. factory f8e3… с «версией» 6). */
const LOOSE_UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const WORK_ID_ARRAY_KEYS = new Set(["allowedWorkIds", "boundWorkIds"]);

/** Суффикс reconcile: «Название @ field_a|slug» — не семантическое отличие. */
const PARAM_SOURCE_KEYS_SUFFIX_RE = /\s+@\s+([\p{L}\p{N}_|,-]+)$/u;

type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;
type JsonObject = { [key: string]: JsonValue };

export type SnapshotChange =
	| { kind: "added"; path: string; value: unknown }
	| { kind: "removed"; path: string; value: unknown }
	| { kind: "changed"; path: string; from: unknown; to: unknown };

function isObject(value: unknown): value is JsonObject {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stripParamNameSourceKeysLocal(paramName: string): string {
	const match = paramName.match(PARAM_SOURCE_KEYS_SUFFIX_RE);
	if (!match || match.index == null) return paramName.trim();
	return paramName.slice(0, match.index).trim();
}

/**
 * Ключ условия после seed/reconcile:
 * убирает @ field|slug, кавычки, пояснения в скобках.
 */
export function normalizeTriggerParamKey(paramName: string): string {
	const stripped = stripParamNameSourceKeysLocal(paramName);
	const withoutParen = stripped.replace(/\([^)]*\)/g, " ");
	return normalizeParamLabel(withoutParen);
}

/** Совпадение с учётом усечения имени при formatParamNameWithSourceKeys. */
export function triggerParamKeysEquivalent(a: string, b: string): boolean {
	if (a === b) return true;
	if (!a || !b) return false;
	const minLen = Math.min(a.length, b.length);
	return minLen >= 20 && (a.startsWith(b) || b.startsWith(a));
}

/**
 * Правила → набор {param, operator} без paramCode/value* (их переписывает reconcile).
 */
export function normalizeRulesForDiff(rules: unknown): JsonObject[] {
	if (!Array.isArray(rules)) return [];
	const byKey = new Map<string, JsonObject>();
	for (const raw of rules) {
		if (!isObject(raw)) continue;
		const param = normalizeTriggerParamKey(String(raw.paramName ?? ""));
		if (!param) continue;
		const operator = String(raw.operator ?? "=");
		const key = `${param}\0${operator}`;
		if (!byKey.has(key)) {
			byKey.set(key, { param, operator });
		}
	}
	return [...byKey.values()].sort((a, b) =>
		JSON.stringify(a).localeCompare(JSON.stringify(b)),
	);
}

function isTriggerRuleFingerprintArray(
	value: unknown,
): value is JsonObject[] {
	return (
		Array.isArray(value) &&
		value.length > 0 &&
		value.every(
			(item) =>
				isObject(item) &&
				typeof item.param === "string" &&
				typeof item.operator === "string" &&
				Object.keys(item).every((key) => key === "param" || key === "operator"),
		)
	);
}

/**
 * Сравнение наборов условий по param+operator с soft-match имён.
 */
function collectTriggerRulesChanges(
	etalon: JsonObject[],
	current: JsonObject[],
	path: string,
	out: SnapshotChange[],
	max: number,
): void {
	const usedRight = new Set<number>();
	for (const left of etalon) {
		if (out.length >= max) return;
		const leftParam = String(left.param);
		const leftOp = String(left.operator);
		const matchIdx = current.findIndex((right, index) => {
			if (usedRight.has(index)) return false;
			return (
				String(right.operator) === leftOp &&
				triggerParamKeysEquivalent(leftParam, String(right.param))
			);
		});
		if (matchIdx >= 0) {
			usedRight.add(matchIdx);
			continue;
		}
		out.push({
			kind: "removed",
			path: pathJoin(path, `[${leftParam}|${leftOp}]`),
			value: left,
		});
	}
	for (let index = 0; index < current.length; index += 1) {
		if (out.length >= max) return;
		if (usedRight.has(index)) continue;
		const right = current[index]!;
		out.push({
			kind: "added",
			path: pathJoin(
				path,
				`[${String(right.param)}|${String(right.operator)}]`,
			),
			value: right,
		});
	}
}

/** Стабильный ключ карточки (с стримом) — для списка typicalWorks. */
export function typicalWorkStableKey(card: {
	archComponentType: string;
	name: string;
	streamExecutor?: string | null;
}): string {
	const stream = (card.streamExecutor ?? "").trim();
	return stream
		? `${card.archComponentType}|${card.name}|${stream}`
		: `${card.archComponentType}|${card.name}`;
}

/** Идентичность сущности работы без стрима — для allowedWorkIds / boundWorkIds. */
export function typicalWorkEntityKey(card: {
	archComponentType: string;
	name: string;
}): string {
	return `${card.archComponentType}|${card.name}`;
}

function sortKeysDeep(value: unknown): JsonValue {
	if (Array.isArray(value)) {
		return value.map((item) => sortKeysDeep(item));
	}
	if (!isObject(value)) {
		return value as JsonValue;
	}
	const out: JsonObject = {};
	for (const key of Object.keys(value).sort()) {
		out[key] = sortKeysDeep(value[key]);
	}
	return out;
}

function scrubEntityNoise(
	value: unknown,
	idMap: Map<string, string>,
	keyHint?: string,
): JsonValue {
	if (typeof value === "string") {
		if (idMap.has(value)) return idMap.get(value)!;
		if (LOOSE_UUID_RE.test(value)) return "<id>";
		return value;
	}
	if (Array.isArray(value)) {
		const mapped = value.map((item) => scrubEntityNoise(item, idMap));
		if (keyHint && WORK_ID_ARRAY_KEYS.has(keyHint)) {
			const asStrings = mapped.map((item) =>
				typeof item === "string" ? item : JSON.stringify(item),
			);
			return [...new Set(asStrings)].sort((a, b) => a.localeCompare(b));
		}
		if (
			mapped.every(isObject) &&
			mapped.some(
				(item) =>
					"paramCode" in (item as JsonObject) ||
					"paramName" in (item as JsonObject),
			)
		) {
			return [...mapped].sort((a, b) =>
				JSON.stringify(a).localeCompare(JSON.stringify(b)),
			);
		}
		return mapped;
	}
	if (!isObject(value)) {
		return value as JsonValue;
	}

	const out: JsonObject = {};
	for (const [key, child] of Object.entries(value)) {
		if (
			key === "id" ||
			key === "assignmentId" ||
			key === "assignmentStatus" ||
			key === "usedOnSchemasCount" ||
			key === "triggerStatus" ||
			key === "formulaBadge" ||
			key === "calculationLogic" ||
			key === "schemaFieldUid" ||
			key === "archBlockUid" ||
			key === "semanticRole" ||
			key === "sortOrder"
		) {
			continue;
		}
		out[key] = scrubEntityNoise(child, idMap, key);
	}
	return out;
}

function replaceIdsInValue(
	value: unknown,
	idMap: Map<string, string>,
): JsonValue {
	if (typeof value === "string") {
		return idMap.get(value) ?? value;
	}
	if (Array.isArray(value)) {
		return value.map((item) => replaceIdsInValue(item, idMap));
	}
	if (!isObject(value)) {
		return value as JsonValue;
	}
	const out: JsonObject = {};
	for (const [key, child] of Object.entries(value)) {
		out[key] = replaceIdsInValue(child, idMap);
	}
	return out;
}

function normalizeWorkCard(
	card: V2TypicalWorkCardDto,
	idMap: Map<string, string>,
): JsonObject {
	const stableId = typicalWorkStableKey(card);
	/** Только условия появления — paramCode/value* после reconcile не сравниваем. */
	const conditionSlice = {
		rules: normalizeRulesForDiff(card.rules ?? []),
		triggerMode: card.triggerMode ?? "simple",
		triggerFormula: card.triggerFormula ?? null,
		triggerArchCount: card.triggerArchCount ?? null,
	};
	const scrubbed = scrubEntityNoise(
		structuredClone(conditionSlice) as unknown,
		idMap,
	) as JsonObject;
	return {
		...scrubbed,
		id: stableId,
		streamExecutor: card.streamExecutor,
	};
}

/** Карточки → id сущности → arch|name (без стрима). */
export function buildWorkIdMap(
	works: readonly V2TypicalWorkCardDto[],
	workRefIndex?: readonly V2WorkRefIndexItemDto[] | null,
): Map<string, string> {
	const idMap = new Map<string, string>();
	for (const ref of workRefIndex ?? []) {
		if (!ref.id) continue;
		idMap.set(ref.id, typicalWorkEntityKey(ref));
	}
	for (const card of works) {
		const entity = typicalWorkEntityKey(card);
		if (card.id) idMap.set(card.id, entity);
		if (card.assignmentId) {
			idMap.set(card.assignmentId, `${typicalWorkStableKey(card)}#assignment`);
		}
	}
	return idMap;
}

export type EditorSnapshotDumpInput = {
	jsonSchema: unknown;
	uiSchema: unknown;
	logic: unknown;
	dictionariesSnapshot?: unknown;
	typicalWorks: V2TypicalWorkCardDto[] | null | undefined;
	/** Доп. id→arch|name (factory registry / эталон). */
	workRefIndex?: V2WorkRefIndexItemDto[] | null;
	/**
	 * Общий idMap для парного сравнения (эталон + текущая).
	 * Если не задан — строится только из своих works + workRefIndex.
	 */
	sharedIdMap?: Map<string, string>;
};

export function buildNormalizedEditorSnapshotDump(
	input: EditorSnapshotDumpInput,
): Record<string, unknown> {
	const works = input.typicalWorks ?? [];
	const idMap =
		input.sharedIdMap ?? buildWorkIdMap(works, input.workRefIndex);

	return sortKeysDeep({
		jsonSchema: scrubEntityNoise(
			replaceIdsInValue(input.jsonSchema ?? {}, idMap),
			idMap,
		),
		uiSchema: scrubEntityNoise(
			replaceIdsInValue(input.uiSchema ?? {}, idMap),
			idMap,
		),
		logic: scrubEntityNoise(
			replaceIdsInValue(input.logic ?? { rules: [] }, idMap),
			idMap,
		),
		dictionariesSnapshot: scrubEntityNoise(
			input.dictionariesSnapshot ?? null,
			idMap,
		),
		typicalWorks: works
			.map((card) => normalizeWorkCard(card, idMap))
			.sort((a, b) => String(a.id).localeCompare(String(b.id))),
	}) as Record<string, unknown>;
}

export function formatEditorSnapshotDumpJson(
	input: EditorSnapshotDumpInput,
): string {
	return JSON.stringify(buildNormalizedEditorSnapshotDump(input), null, "\t");
}

function pathJoin(base: string, key: string): string {
	return base ? `${base}.${key}` : key;
}

/** Полный JSON значения для панели изменений (без обрезки). */
function formatChangeValue(value: unknown): string {
	const text = JSON.stringify(value);
	return text == null ? "null" : text;
}

/**
 * Рекурсивный diff нормализованных объектов.
 * Для массивов объектов с `id` сравнивает по id; иначе — по индексу.
 */
export function collectJsonChanges(
	etalon: unknown,
	current: unknown,
	path = "",
	out: SnapshotChange[] = [],
	max = 500,
): SnapshotChange[] {
	if (out.length >= max) {
		if (out.length === max) {
			out.push({
				kind: "changed",
				path: path || "(root)",
				from: `…лимит ${max}`,
				to: "ещё есть отличия",
			});
		}
		return out;
	}

	if (Object.is(etalon, current)) return out;
	if (JSON.stringify(etalon) === JSON.stringify(current)) return out;

	if (Array.isArray(etalon) || Array.isArray(current)) {
		const left = Array.isArray(etalon) ? etalon : [];
		const right = Array.isArray(current) ? current : [];

		if (
			(left.length === 0 || isTriggerRuleFingerprintArray(left)) &&
			(right.length === 0 || isTriggerRuleFingerprintArray(right)) &&
			(isTriggerRuleFingerprintArray(left) ||
				isTriggerRuleFingerprintArray(right))
		) {
			collectTriggerRulesChanges(
				left as JsonObject[],
				right as JsonObject[],
				path,
				out,
				max,
			);
			return out;
		}

		const leftObjects = left.every(isObject);
		const rightObjects = right.every(isObject);
		const useId =
			leftObjects &&
			rightObjects &&
			(left.some((item) => typeof item.id === "string") ||
				right.some((item) => typeof item.id === "string"));

		if (useId) {
			const leftById = new Map(
				left.map((item) => [String((item as JsonObject).id ?? ""), item]),
			);
			const rightById = new Map(
				right.map((item) => [String((item as JsonObject).id ?? ""), item]),
			);
			const ids = new Set([...leftById.keys(), ...rightById.keys()]);
			for (const id of [...ids].sort()) {
				const l = leftById.get(id);
				const r = rightById.get(id);
				const itemPath = pathJoin(path, `[${id || "?"}]`);
				if (l == null && r != null) {
					out.push({ kind: "added", path: itemPath, value: r });
					continue;
				}
				if (l != null && r == null) {
					out.push({ kind: "removed", path: itemPath, value: l });
					continue;
				}
				collectJsonChanges(l, r, itemPath, out, max);
			}
			return out;
		}

		const n = Math.max(left.length, right.length);
		for (let i = 0; i < n && out.length < max; i += 1) {
			const itemPath = pathJoin(path, `[${i}]`);
			if (i >= left.length) {
				out.push({ kind: "added", path: itemPath, value: right[i] });
				continue;
			}
			if (i >= right.length) {
				out.push({ kind: "removed", path: itemPath, value: left[i] });
				continue;
			}
			collectJsonChanges(left[i], right[i], itemPath, out, max);
		}
		return out;
	}

	if (isObject(etalon) || isObject(current)) {
		const left = isObject(etalon) ? etalon : {};
		const right = isObject(current) ? current : {};
		const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
		for (const key of [...keys].sort()) {
			const childPath = pathJoin(path, key);
			if (!(key in left)) {
				out.push({ kind: "added", path: childPath, value: right[key] });
				continue;
			}
			if (!(key in right)) {
				out.push({ kind: "removed", path: childPath, value: left[key] });
				continue;
			}
			collectJsonChanges(left[key], right[key], childPath, out, max);
		}
		return out;
	}

	out.push({
		kind: "changed",
		path: path || "(root)",
		from: etalon,
		to: current,
	});
	return out;
}

/** Только изменения текущего snapshot относительно эталона (эталон в отчёт не включаем). */
export function buildSnapshotChangesReport(input: {
	etalon: EditorSnapshotDumpInput;
	current: EditorSnapshotDumpInput;
	etalonLabel?: string;
}): string {
	const etalonWorks = input.etalon.typicalWorks ?? [];
	const currentWorks = input.current.typicalWorks ?? [];

	const sharedIdMap = buildWorkIdMap(
		[...etalonWorks, ...currentWorks],
		[
			...(input.etalon.workRefIndex ?? []),
			...(input.current.workRefIndex ?? []),
		],
	);

	const etalonDump = buildNormalizedEditorSnapshotDump({
		...input.etalon,
		sharedIdMap,
	});
	const currentDump = buildNormalizedEditorSnapshotDump({
		...input.current,
		sharedIdMap,
	});
	const changes = collectJsonChanges(etalonDump, currentDump);

	const lines: string[] = [];
	const label = input.etalonLabel?.trim() || "заводской эталон";
	lines.push(`# Изменения относительно: ${label}`);
	lines.push(`# Всего: ${changes.length}`);
	lines.push("");

	if (changes.length === 0) {
		lines.push("Отличий нет.");
		return lines.join("\n");
	}

	for (const change of changes) {
		if (change.kind === "added") {
			lines.push(`+ ${change.path}`);
			lines.push(`  = ${formatChangeValue(change.value)}`);
		} else if (change.kind === "removed") {
			lines.push(`− ${change.path}`);
			lines.push(`  (было ${formatChangeValue(change.value)})`);
		} else {
			lines.push(`~ ${change.path}`);
			lines.push(
				`  ${formatChangeValue(change.from)} → ${formatChangeValue(change.to)}`,
			);
		}
		lines.push("");
	}

	return lines.join("\n").trimEnd();
}

export function looksLikeUuid(value: string): boolean {
	return LOOSE_UUID_RE.test(value);
}

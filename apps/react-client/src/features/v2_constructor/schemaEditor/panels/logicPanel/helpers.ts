import type { V2LogicRuleDto } from "@smart-anketa/api-contract";
import {
	applyLogic,
	type JsonLogicValue,
} from "@react-client/features/jsonLoginBuilder";
import type { ComputedRulePayload } from "../../../utils/calculationEngine";
import {
	jsonPointerToFormDataVarPath,
	normalizeJsonPointer,
} from "../../../utils/schemaPaths";
import { ruleKindLabel } from "../../constants";
import type { FieldPathHint } from "../../types";
import { evaluateRuleCondition } from "../../../utils/logicPreview";
import { isOverwrittenByLegacyStageEngine } from "../../../utils/v2LegacyStageEngine";

export function readComputedPayload(rule: V2LogicRuleDto): ComputedRulePayload {
	const raw = rule.payload;
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
	return raw as ComputedRulePayload;
}

export function readPayloadString(
	rule: V2LogicRuleDto | undefined,
	key: string,
): string {
	const value = rule?.payload?.[key];
	return typeof value === "string" ? value : "";
}

export function nextPayload(
	rule: V2LogicRuleDto,
	patch: Record<string, unknown>,
): Record<string, unknown> {
	return { ...(rule.payload ?? {}), ...patch };
}

export function fieldLabel(
	fieldPathHints: FieldPathHint[],
	pointerOrVar: string,
): string {
	const hint = fieldPathHints.find(
		(h) => h.pointer === pointerOrVar || h.varPath === pointerOrVar,
	);
	if (!hint) return pointerOrVar || "—";
	const title = hint.title ? ` — ${hint.title}` : "";
	const suffix = hint.dictionaryCode ? ` · ${hint.dictionaryCode}` : "";
	return `${hint.varPath || hint.pointer}${title}${suffix}`;
}

export function rulePrimaryLabel(
	rule: V2LogicRuleDto,
	fieldPathHints: FieldPathHint[],
): string {
	const payloadLabel = readPayloadString(rule, "label");
	if (payloadLabel) return payloadLabel;
	const target = fieldLabel(fieldPathHints, rule.targetPath);
	return `${ruleKindLabel(rule.kind)} → ${target}`;
}

export function ruleHelperText(rule: V2LogicRuleDto): string {
	switch (rule.kind) {
		case "visibility":
			return "Показывает или скрывает целевое поле, когда условие истинно.";
		case "required":
			return "Делает поле обязательным, когда условие истинно.";
		case "computed":
			return "Считает значение и записывает в целевое поле (агрегат).";
		case "row_computed":
			return "Считает значение для каждой строки массива.";
		case "validation":
			return "Проверяет условие; при ошибке показывается сообщение.";
		case "hint":
			return "Добавляет подсказку (ui:help) к полю; условие обычно всегда true.";
		case "task_trigger":
			return "Отмечает типовую работу в калькуляции, если условие истинно.";
		default:
			return "Правило логики шаблона.";
	}
}

export function ruleMatchesFilter(
	rule: V2LogicRuleDto,
	fieldPathHints: FieldPathHint[],
	query: string,
	kindFilter: string,
): boolean {
	if (kindFilter !== "all" && rule.kind !== kindFilter) return false;
	if (!query.trim()) return true;
	const q = query.trim().toLowerCase();
	const label = rulePrimaryLabel(rule, fieldPathHints).toLowerCase();
	return (
		label.includes(q) ||
		rule.targetPath.toLowerCase().includes(q) ||
		rule.kind.toLowerCase().includes(q) ||
		(rule.description ?? "").toLowerCase().includes(q)
	);
}

/** Извлекает все var-пути из JsonLogic-выражения, рекурсивно. */
/** var внутри тела `reduce` — не пути formData. */
function isReduceScopedVar(varPath: string): boolean {
	return varPath === "accumulator" || varPath.startsWith("current.");
}

export function extractVarsFromLogic(value: unknown): string[] {
	const out = new Set<string>();
	const walk = (node: unknown) => {
		if (node === null || node === undefined) return;
		if (Array.isArray(node)) {
			for (const child of node) walk(child);
			return;
		}
		if (typeof node !== "object") return;
		const obj = node as Record<string, unknown>;
		if ("var" in obj) {
			const arg = obj.var;
			if (typeof arg === "string") {
				if (arg) out.add(arg);
			} else if (Array.isArray(arg) && typeof arg[0] === "string") {
				if (arg[0]) out.add(arg[0] as string);
			}
			return;
		}
		for (const v of Object.values(obj)) walk(v);
	};
	walk(value);
	return [...out];
}

/** Список var-путей условия, которых нет в dependencies (сравнение через pointer). */
export function findUnclaimedVars(
	rule: V2LogicRuleDto,
	fieldPathHints: FieldPathHint[],
): string[] {
	const vars = extractVarsFromLogic(rule.condition);
	const declared = new Set(
		(rule.dependencies ?? []).map((d) => normalizeJsonPointer(d)),
	);
	const result: string[] = [];
	for (const v of vars) {
		if (isReduceScopedVar(v)) continue;
		const hint = fieldPathHints.find((h) => h.varPath === v || h.pointer === v);
		const pointer = hint?.pointer ?? normalizeJsonPointer(v);
		if (!declared.has(pointer)) result.push(v);
	}
	return result;
}

/** Возвращает уникальные dependencies с добавлением var из условия. */
export function mergeDependenciesWithVars(
	rule: V2LogicRuleDto,
	fieldPathHints: FieldPathHint[],
): string[] {
	const declared = (rule.dependencies ?? []).map((d) =>
		normalizeJsonPointer(d),
	);
	const vars = extractVarsFromLogic(rule.condition);
	for (const v of vars) {
		if (isReduceScopedVar(v)) continue;
		const hint = fieldPathHints.find((h) => h.varPath === v || h.pointer === v);
		const pointer = hint?.pointer ?? normalizeJsonPointer(v);
		if (pointer && !declared.includes(pointer)) declared.push(pointer);
	}
	return [...new Set(declared)];
}

export type LiveEvalResult =
	| { kind: "boolean"; value: boolean }
	| { kind: "number"; value: number }
	| { kind: "string"; value: string }
	| { kind: "other"; raw: unknown }
	| { kind: "skipped"; reason: string }
	| { kind: "error"; message: string };

/** Вычисляет условие правила на текущих данных формы для индикатора в шапке. */
export function evaluateRuleLive(
	rule: V2LogicRuleDto,
	formData: Record<string, unknown>,
): LiveEvalResult {
	if (rule.kind === "row_computed") {
		return {
			kind: "skipped",
			reason: "Считается по строке массива на бекенде",
		};
	}
	if (rule.kind === "validation") {
		const passes = evaluateRuleCondition(rule.condition, formData);
		return { kind: "boolean", value: passes };
	}
	try {
		const raw = applyLogic(rule.condition as JsonLogicValue, formData);
		if (typeof raw === "boolean") return { kind: "boolean", value: raw };
		if (typeof raw === "number" && Number.isFinite(raw)) {
			return { kind: "number", value: raw };
		}
		if (typeof raw === "string") return { kind: "string", value: raw };
		return { kind: "other", raw };
	} catch (err) {
		return {
			kind: "error",
			message: err instanceof Error ? err.message : String(err),
		};
	}
}

export type RuleValidationIssue = {
	severity: "error" | "warning";
	message: string;
};

/** Базовая валидация правила без обращения к серверу. */
export function validateRule(
	rule: V2LogicRuleDto,
	fieldPathHints: FieldPathHint[],
): RuleValidationIssue[] {
	const issues: RuleValidationIssue[] = [];
	const targetPointer = normalizeJsonPointer(rule.targetPath);
	const targetExists = fieldPathHints.some((h) => h.pointer === targetPointer);

	if (rule.kind !== "task_trigger" && !targetExists) {
		issues.push({
			severity: "error",
			message: `Целевое поле «${rule.targetPath}» не найдено в схеме`,
		});
	}

	const payload = (rule.payload ?? {}) as Record<string, unknown>;
	if (rule.kind === "row_computed") {
		const arrayPath =
			typeof payload.arrayPath === "string" ? payload.arrayPath : "";
		const fieldVar =
			typeof payload.fieldVar === "string" ? payload.fieldVar : "";
		if (!arrayPath) {
			issues.push({
				severity: "error",
				message: "Не указан путь к массиву (arrayPath)",
			});
		}
		if (!fieldVar) {
			issues.push({
				severity: "error",
				message: "Не указано имя поля строки (fieldVar)",
			});
		}
	}
	if (rule.kind === "task_trigger") {
		const taskCode =
			typeof payload.taskCode === "string" ? payload.taskCode : "";
		if (!taskCode) {
			issues.push({
				severity: "error",
				message: "Не указан код типовой работы (taskCode)",
			});
		}
	}
	if (rule.kind === "validation") {
		const message =
			typeof payload.message === "string"
				? payload.message
				: typeof payload.text === "string"
					? payload.text
					: "";
		if (!message.trim()) {
			issues.push({
				severity: "error",
				message: "Укажите текст ошибки (payload.message)",
			});
		}
	}
	if (
		rule.kind === "computed" &&
		isOverwrittenByLegacyStageEngine(rule.targetPath)
	) {
		issues.push({
			severity: "warning",
			message:
				"Целевое поле перезаписывается движком этапов v1 на /calculate — значение JsonLogic в formData не сохранится.",
		});
	}
	if (rule.kind === "computed") {
		const mode = payload.mode === "expert" ? "expert" : "preset";
		if (mode === "preset") {
			const operands = Array.isArray(payload.operands) ? payload.operands : [];
			if (operands.length === 0) {
				issues.push({
					severity: "warning",
					message: "Не выбраны операнды формулы",
				});
			}
		}
	}

	const unclaimed = findUnclaimedVars(rule, fieldPathHints);
	if (unclaimed.length > 0) {
		issues.push({
			severity: "warning",
			message: `var в условии без зависимости: ${unclaimed.join(", ")}`,
		});
	}

	return issues;
}

/** Проверяет, упоминается ли правило в строках циклов (по targetPath/var). */
export function isRuleInCycle(rule: V2LogicRuleDto, cycles: string[]): boolean {
	if (cycles.length === 0) return false;
	const targetPointer = normalizeJsonPointer(rule.targetPath);
	const targetVar = jsonPointerToFormDataVarPath(targetPointer);
	return cycles.some(
		(c) => c.includes(targetPointer) || (targetVar && c.includes(targetVar)),
	);
}

/** Очень компактный человеко-читаемый рендер JsonLogic. */
export function describeJsonLogic(value: unknown): string {
	if (value === null) return "null";
	if (typeof value === "boolean") return value ? "истина" : "ложь";
	if (typeof value === "number") return String(value);
	if (typeof value === "string") return JSON.stringify(value);
	if (Array.isArray(value)) {
		return `[${value.map(describeJsonLogic).join(", ")}]`;
	}
	if (typeof value !== "object") return String(value);

	const obj = value as Record<string, unknown>;
	const keys = Object.keys(obj);
	if (keys.length !== 1) return JSON.stringify(obj);
	const [op] = keys;
	const args = obj[op];

	if (op === "var") {
		if (typeof args === "string") return args;
		if (Array.isArray(args) && typeof args[0] === "string") return args[0];
		return "var";
	}
	const list = Array.isArray(args) ? args : [args];
	const ds = list.map(describeJsonLogic);

	const binary: Record<string, string> = {
		"==": "=",
		"===": "≡",
		"!=": "≠",
		"!==": "≢",
		">": ">",
		">=": "≥",
		"<": "<",
		"<=": "≤",
		"+": "+",
		"-": "−",
		"*": "·",
		"/": "/",
		"%": "mod",
	};
	if (binary[op] && ds.length === 2) {
		return `(${ds[0]} ${binary[op]} ${ds[1]})`;
	}
	if (op === "and") return `(${ds.join(" И ")})`;
	if (op === "or") return `(${ds.join(" ИЛИ ")})`;
	if (op === "!") return `НЕ ${ds[0] ?? "?"}`;
	if (op === "if") {
		if (ds.length === 3) return `если ${ds[0]} то ${ds[1]} иначе ${ds[2]}`;
		return `if(${ds.join(", ")})`;
	}
	if (op === "in") return `${ds[0]} ∈ ${ds[1]}`;
	if (op === "missing") return `отсутствуют: ${ds.join(", ")}`;
	if (op === "cat") return `concat(${ds.join(", ")})`;
	if (op === "reduce" && ds.length >= 2) {
		const init = ds.length >= 3 ? `, начало ${ds[2]}` : "";
		return `Σ по ${ds[0]} (${ds[1]}${init})`;
	}
	return `${op}(${ds.join(", ")})`;
}

/** Дружелюбное описание правила: «Скрывать X, если Y». */
export function summarizeRule(
	rule: V2LogicRuleDto,
	fieldPathHints: FieldPathHint[],
): string {
	const target = fieldLabel(fieldPathHints, rule.targetPath);
	const cond = describeJsonLogic(rule.condition);
	const payload = (rule.payload ?? {}) as Record<string, unknown>;
	switch (rule.kind) {
		case "visibility":
			return `Показывать «${target}», если ${cond}`;
		case "required":
			return `Делать «${target}» обязательным, если ${cond}`;
		case "computed":
			return `Вычислить «${target}» = ${cond}`;
		case "row_computed": {
			const arrayPath =
				typeof payload.arrayPath === "string" ? payload.arrayPath : "?";
			const fieldVar =
				typeof payload.fieldVar === "string" ? payload.fieldVar : "?";
			return `Для каждой строки «${arrayPath}» записать row.${fieldVar} = ${cond}`;
		}
		case "validation":
			return `Ошибка для «${target}», если НЕ ${cond}`;
		case "hint":
			return `Подсказка к «${target}»`;
		case "task_trigger": {
			const code =
				typeof payload.taskCode === "string" ? payload.taskCode : "?";
			return `Включить типовую работу ${code}, если ${cond}`;
		}
		default:
			return `${ruleKindLabel(rule.kind)} → ${target}`;
	}
}

/** Группирует правила по верхней секции схемы (первый сегмент JSON Pointer). */
export function groupRulesBySection(
	rules: V2LogicRuleDto[],
	fieldPathHints: FieldPathHint[],
): Array<{ section: string; sectionTitle: string; rules: V2LogicRuleDto[] }> {
	const map = new Map<string, V2LogicRuleDto[]>();
	for (const r of rules) {
		const pointer = normalizeJsonPointer(r.targetPath || "/");
		const segs = pointer.split("/").filter(Boolean);
		const section = segs[0] ?? "";
		if (!map.has(section)) map.set(section, []);
		(map.get(section) as V2LogicRuleDto[]).push(r);
	}
	const result: Array<{
		section: string;
		sectionTitle: string;
		rules: V2LogicRuleDto[];
	}> = [];
	for (const [section, list] of map) {
		const sectionPointer = section ? `/${section}` : "/";
		const hint = fieldPathHints.find((h) => h.pointer === sectionPointer);
		result.push({
			section,
			sectionTitle: hint?.title ?? section ?? "Корень",
			rules: list,
		});
	}
	result.sort((a, b) => a.section.localeCompare(b.section));
	return result;
}

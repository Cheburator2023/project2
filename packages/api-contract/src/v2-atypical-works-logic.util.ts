import type { V2JsonLogicValue, V2LogicGraphDto, V2LogicRuleDto } from "./v2-template.types";
import { resolveV2AnketaArchComponent } from "./v2-anketa-section-ui.util";
import {
	patchV2TypicalWorksLogicRules,
	type PatchV2TypicalWorksLogicOptions,
} from "./v2-default-typical-works-logic.util";

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function readByDotPath(data: Record<string, unknown>, dotPath: string): unknown {
	const segments = dotPath.split(".").filter(Boolean);
	let current: unknown = data;
	for (const segment of segments) {
		const obj = readRecord(current);
		if (!obj) return undefined;
		current = obj[segment];
	}
	return current;
}

/** Dot-пути массивов «Нетиповые работы» из uiSchema (archComponent: atypicalWork). */
export function collectAtypicalWorkArrayPaths(
	uiSchema: unknown,
	prefix = "",
): string[] {
	const branch = readRecord(uiSchema);
	if (!branch) return [];

	const paths: string[] = [];
	const arch = resolveV2AnketaArchComponent(branch);
	if (arch === "atypicalWork" && prefix) {
		paths.push(prefix);
	}

	for (const key of Object.keys(branch)) {
		if (key.startsWith("ui:")) continue;
		paths.push(
			...collectAtypicalWorkArrayPaths(
				branch[key],
				prefix ? `${prefix}.${key}` : key,
			),
		);
	}

	return [...new Set(paths)];
}

function atypicalRowTotalRuleId(arrayPath: string): string {
	return `unified-atypical-row-total:${arrayPath.replace(/\./g, "_")}`;
}

function isAtypicalPatchedRuleId(id: string): boolean {
	return (
		id === "unified-atypical-total" || id.startsWith("unified-atypical-row-total:")
	);
}

function buildAtypicalArrayReduceTerm(arrayPath: string): V2JsonLogicValue {
	return {
		reduce: [
			{ var: arrayPath },
			{
				"+": [
					{ var: "accumulator" },
					{
						if: [
							{ "==": [{ var: "current.includeInCalculation" }, false] },
							0,
							{
								max: [0, { var: "current.total" }],
							},
						],
					},
				],
			},
			0,
		],
	};
}

export function buildAtypicalWorkRowTotalRule(arrayPath: string): V2LogicRuleDto {
	return {
		id: atypicalRowTotalRuleId(arrayPath),
		kind: "row_computed",
		payload: {
			label: "Per-row итог нетиповой работы",
			fieldVar: "total",
			arrayPath,
			formulaHint: "row.total = оценка (ч/д) × коэффициент",
		},
		condition: {
			"*": [{ var: "estimateHoursPerDay" }, { var: "coefficient" }],
		},
		targetPath: `/${arrayPath.replace(/\./g, "/")}`,
		description: "ФТ-026: итог строки нетиповой работы.",
		dependencies: [],
	};
}

export function buildUnifiedAtypicalTotalRule(
	arrayPaths: string[],
): V2LogicRuleDto | null {
	if (arrayPaths.length === 0) return null;

	const condition: V2JsonLogicValue =
		arrayPaths.length === 1
			? buildAtypicalArrayReduceTerm(arrayPaths[0]!)
			: {
					"+": arrayPaths.map((path) => buildAtypicalArrayReduceTerm(path)),
				};

	return {
		id: "unified-atypical-total",
		kind: "computed",
		payload: {
			mode: "expert",
			role: "atypical_total",
			label: "Сумма по нетиповым работам",
			calcModel: "unified",
			formulaHint:
				"Σ нетиповые работы по всем arch-блокам atypicalWork (includeInCalculation ≠ false).",
		},
		condition,
		targetPath: "/summary/atypicalTotal",
		description: "ФТ-026: сумма итоговых оценок нетиповых работ.",
		dependencies: arrayPaths.map((path) => `/${path.replace(/\./g, "/")}`),
	};
}

export type PatchV2AtypicalWorksLogicOptions = {
	uiSchema?: unknown;
};

/** Патч типовых + нетиповых правил калькуляции под uiSchema шаблона. */
export function patchV2AnketaCalculationLogicRules(
	logic: V2LogicGraphDto,
	options?: PatchV2TypicalWorksLogicOptions,
): V2LogicGraphDto {
	return patchV2AtypicalWorksLogicRules(
		patchV2TypicalWorksLogicRules(logic, options),
		{ uiSchema: options?.uiSchema },
	);
}

/** Добавляет row_computed и unified-atypical-total для arch-блоков «Нетиповые работы». */
export function patchV2AtypicalWorksLogicRules(
	logic: V2LogicGraphDto,
	options?: PatchV2AtypicalWorksLogicOptions,
): V2LogicGraphDto {
	const arrayPaths = collectAtypicalWorkArrayPaths(options?.uiSchema);
	if (arrayPaths.length === 0) {
		return logic;
	}

	const rest = (logic?.rules ?? []).filter(
		(rule) => !isAtypicalPatchedRuleId(rule.id),
	);
	const injected: V2LogicRuleDto[] = arrayPaths.map((path) =>
		buildAtypicalWorkRowTotalRule(path),
	);
	const atypicalTotal = buildUnifiedAtypicalTotalRule(arrayPaths);
	if (atypicalTotal) injected.push(atypicalTotal);

	return { ...logic, rules: [...rest, ...injected] };
}

/** Строки всех массивов нетиповых работ из formData по путям uiSchema. */
export function collectAtypicalWorkRowsFromData(
	data: Record<string, unknown>,
	uiSchema?: unknown,
): unknown[] {
	const paths = collectAtypicalWorkArrayPaths(uiSchema);
	const rows: unknown[] = [];
	for (const path of paths) {
		const arr = readByDotPath(data, path);
		if (Array.isArray(arr)) rows.push(...arr);
	}
	return rows;
}

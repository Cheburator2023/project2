import {
	CONTROL_TYPICAL_TASKS,
	SOURCE_TYPICAL_TASKS,
} from "../../../../../src/modules/anketa-v2/constants/v2-source-works.builder";
import { V2_DEFAULT_TEMPLATE_SNAPSHOT } from "../../../../../src/modules/anketa-v2/constants/v2-default-template-snapshot";
import { V2CalculationService } from "../../../../../src/modules/anketa-v2/services/v2-calculation.service";
import type {
	BuildCatalogTasksParams,
	V2TypicalWorkRuntimeService,
} from "../../../../../src/modules/anketa-v2/services/v2-typical-work-runtime.service";

export const SNAPSHOT = V2_DEFAULT_TEMPLATE_SNAPSHOT;

/** Имитация справочника БД для unit-тестов без PostgreSQL. */
export function createStubWorkRuntime(): V2TypicalWorkRuntimeService {
	return {
		buildCatalogTasks: async (params: BuildCatalogTasksParams) => {
			if (params.archComponentType === "Система-источник") {
				const type = String(params.source.type ?? "");
				return SOURCE_TYPICAL_TASKS.filter(
					(t) => !type || t.match.type === type,
				).map((t) => ({
					taskCode: t.taskCode,
					name: t.name,
					workType: t.workType,
					reason: t.reason,
					estimateHoursPerDay: t.estimateHoursPerDay,
					coefficient: 1,
					match: t.match,
					workId: t.taskCode,
				}));
			}
			if (params.archComponentType === "Модельный сервис") {
				const label = String(
					params.source.value ?? params.source.controlType ?? "",
				);
				return CONTROL_TYPICAL_TASKS.filter((t) => {
					const code = String(t.match.controlType ?? "");
					return (
						label.includes(`[${code}]`) ||
						label === code ||
						label.includes(code)
					);
				}).map((t) => ({
					taskCode: t.taskCode,
					name: t.name,
					workType: t.workType,
					reason: t.reason,
					estimateHoursPerDay: t.estimateHoursPerDay,
					coefficient: 1,
					match: t.match,
					workId: t.taskCode,
				}));
			}
			return [];
		},
		buildSourceCatalogTasks: async (source, templateVersionId, atDate) => {
			const type = String(source.type ?? "");
			const stream =
				type === "Внешний" ? "ИД. Внешний" : "ИД. Внутренний";
			return createStubWorkRuntime().buildCatalogTasks({
				archComponentType: "Система-источник",
				streamExecutor: stream,
				source,
				templateVersionId,
				atDate,
			});
		},
	} as unknown as V2TypicalWorkRuntimeService;
}

export function createCalculationService(
	runtime: V2TypicalWorkRuntimeService = createStubWorkRuntime(),
): V2CalculationService {
	return new V2CalculationService(null as never, null as never, runtime);
}

export function setNestedFormValue(
	data: Record<string, unknown>,
	dotPath: string,
	value: unknown,
): Record<string, unknown> {
	const segments = dotPath.split(".").filter(Boolean);
	if (segments.length === 0) return data;
	const next = { ...data };
	let cursor: Record<string, unknown> = next;
	for (let i = 0; i < segments.length - 1; i += 1) {
		const key = segments[i]!;
		const child = cursor[key];
		const branch =
			child && typeof child === "object" && !Array.isArray(child)
				? { ...(child as Record<string, unknown>) }
				: {};
		cursor[key] = branch;
		cursor = branch;
	}
	cursor[segments[segments.length - 1]!] = value;
	return next;
}

export function readNestedFormValue(
	data: Record<string, unknown>,
	dotPath: string,
): unknown {
	return dotPath.split(".").reduce<unknown>((cur, key) => {
		if (!cur || typeof cur !== "object" || Array.isArray(cur)) return undefined;
		return (cur as Record<string, unknown>)[key];
	}, data);
}

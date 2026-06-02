import type { DataSourceFormValues } from "@react-client/features/playground/v2_playground/organisms/DataSourceModal";
import type { ModelServiceFormValues } from "@react-client/features/playground/v2_playground/organisms/ModelServiceModal";
import type { NonStandardTaskFormValues } from "@react-client/features/playground/v2_playground/organisms/NonStandardTaskModal";

const SOURCE_TYPE_TO_SCHEMA: Record<string, string> = {
	internal: "Внутренний",
	external: "Внешний",
};

const YES_NO_TO_DA: Record<string, string> = {
	yes: "Да",
	no: "Нет",
};

function numericOrUndefined(value: string): number | undefined {
	if (value === "") return undefined;
	const parsed = Number(value.replace(",", "."));
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function mapDataSourceToSourceSystem(
	values: DataSourceFormValues,
): Record<string, unknown> {
	return {
		name: values.name,
		type: SOURCE_TYPE_TO_SCHEMA[values.sourceType] ?? values.sourceType,
		additionalUncertainty: YES_NO_TO_DA[values.pilotRequired],
		requirements:
			values.configExchange === "required" ? "Рисковые" : "Понятны",
		integrationReadiness:
			values.workType === "development"
				? "Нужны доработки ИС"
				: "Готов к интеграции",
		daptRegistry: values.sourceFor || undefined,
	};
}

export function mapDataSourceToTrainingSource(
	values: DataSourceFormValues,
): Record<string, unknown> {
	return {
		name: values.name || values.sourceFor,
		development:
			values.workType === "development" ? "С нуля" : "Не нужна",
		integration:
			values.configExchange === "required" ? "Новая" : "Существующая",
	};
}

export function mapDataSourceToApplicationSource(
	values: DataSourceFormValues,
): Record<string, unknown> {
	return {
		name: values.name || values.sourceFor,
		mode: values.sourceType === "internal" ? "Батч" : "Онлайн",
		development:
			values.workType === "development" ? "Нужна" : "Не нужна",
	};
}

export function mapModelServiceToModelItem(
	values: ModelServiceFormValues,
): Record<string, unknown> {
	return {
		name: values.name,
		autoML: YES_NO_TO_DA[values.isCreationRequired] ?? "Нет",
		role:
			values.workType === "development"
				? "Оркестратор"
				: values.workType === "support"
					? "Подчинённая"
					: "Независимая",
	};
}

export function mapNonStandardTaskToAtypicalTask(
	values: NonStandardTaskFormValues,
): Record<string, unknown> {
	const estimateHoursPerDay = numericOrUndefined(values.estimateHours);
	const coefficient = numericOrUndefined(values.coefficient);
	const total =
		estimateHoursPerDay != null && coefficient != null
			? Math.round(estimateHoursPerDay * coefficient)
			: undefined;

	return {
		name: values.name,
		reason: values.reason,
		estimateHoursPerDay,
		coefficient,
		total,
		includeInCalculation: values.includeInCalculation,
	};
}

export function mapModalValuesToArrayItem(
	path: string,
	values:
		| DataSourceFormValues
		| ModelServiceFormValues
		| NonStandardTaskFormValues,
): Record<string, unknown> {
	switch (path) {
		case "detailInfo.sourceSystems":
			return mapDataSourceToSourceSystem(values as DataSourceFormValues);
		case "dataObjects.trainingSources":
			return mapDataSourceToTrainingSource(values as DataSourceFormValues);
		case "dataObjects.applicationSources":
			return mapDataSourceToApplicationSource(values as DataSourceFormValues);
		case "models.modelsList":
			return mapModelServiceToModelItem(values as ModelServiceFormValues);
		case "atypicalTasks":
		case "mlPlatform.atypicalTasks":
			return mapNonStandardTaskToAtypicalTask(
				values as NonStandardTaskFormValues,
			);
		default:
			return {};
	}
}

export function appendAtFormPath(
	data: Record<string, unknown>,
	path: string,
	item: Record<string, unknown>,
): Record<string, unknown> {
	return mutateArrayAtPath(data, path, (list) => [...list, item]);
}

export function updateAtFormPath(
	data: Record<string, unknown>,
	path: string,
	index: number,
	item: Record<string, unknown>,
): Record<string, unknown> {
	return mutateArrayAtPath(data, path, (list) =>
		list.map((entry, idx) => (idx === index ? { ...entry, ...item } : entry)),
	);
}

export function removeAtFormPath(
	data: Record<string, unknown>,
	path: string,
	index: number,
): Record<string, unknown> {
	return mutateArrayAtPath(data, path, (list) =>
		list.filter((_, idx) => idx !== index),
	);
}

function mutateArrayAtPath(
	data: Record<string, unknown>,
	path: string,
	mutator: (list: Record<string, unknown>[]) => Record<string, unknown>[],
): Record<string, unknown> {
	const parts = path.split(".");
	const next = { ...data };
	let current: Record<string, unknown> = next;

	for (let i = 0; i < parts.length - 1; i++) {
		const key = parts[i];
		const child =
			current[key] != null &&
			typeof current[key] === "object" &&
			!Array.isArray(current[key])
				? { ...(current[key] as Record<string, unknown>) }
				: {};
		current[key] = child;
		current = child;
	}

	const lastKey = parts[parts.length - 1];
	const existing = current[lastKey];
	const list = Array.isArray(existing)
		? existing.filter(
				(item): item is Record<string, unknown> =>
					item != null && typeof item === "object" && !Array.isArray(item),
			)
		: [];
	current[lastKey] = mutator(list);
	return next;
}

export function mapArrayItemToModalDefaults(
	path: string,
	item: Record<string, unknown>,
):
	| Partial<DataSourceFormValues>
	| Partial<ModelServiceFormValues>
	| Partial<NonStandardTaskFormValues> {
	switch (path) {
		case "detailInfo.sourceSystems":
		case "dataObjects.trainingSources":
		case "dataObjects.applicationSources":
			return {
				name: String(item.name ?? ""),
				sourceType:
					item.type === "Внутренний"
						? "internal"
						: item.type === "Внешний"
							? "external"
							: "",
				workType: String(item.integrationReadiness ?? "").includes("доработки")
					? "development"
					: item.development === "С нуля" || item.development === "Нужна"
						? "development"
						: "support",
				pilotRequired: item.additionalUncertainty === "Да" ? "yes" : "no",
				configExchange:
					item.requirements === "Рисковые" || item.integration === "Новая"
						? "required"
						: "not_required",
				sourceFor: String(item.daptRegistry ?? item.name ?? ""),
			};
		case "models.modelsList":
			return {
				name: String(item.name ?? ""),
				workType:
					item.role === "Оркестратор"
						? "development"
						: item.role === "Подчинённая"
							? "support"
							: "pilot",
				isCreationRequired: item.autoML === "Да" ? "yes" : "no",
			};
		case "atypicalTasks":
		case "mlPlatform.atypicalTasks":
			return {
				name: String(item.name ?? ""),
				reason: String(item.reason ?? ""),
				estimateHours: String(item.estimateHoursPerDay ?? ""),
				coefficient: String(item.coefficient ?? ""),
				includeInCalculation: item.includeInCalculation !== false,
			};
		default:
			return {};
	}
}

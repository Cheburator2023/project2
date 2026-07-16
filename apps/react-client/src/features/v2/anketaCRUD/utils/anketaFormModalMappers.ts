import type { DataSourceFormValues } from "@react-client/features/playground/v2_playground/organisms/DataSourceModal";
import type { ModelServiceFormValues } from "@react-client/features/playground/v2_playground/organisms/ModelServiceModal";
import type { NonStandardTaskFormValues } from "@react-client/features/playground/v2_playground/organisms/NonStandardTaskModal";
import type { V2AnketaModalKind } from "@smart-anketa/api-contract";
import { computeAtypicalWorkRowTotal } from "@smart-anketa/api-contract";

const SOURCE_TYPE_TO_SCHEMA: Record<string, string> = {
	internal: "Внутренний",
	external: "Внешний",
};

function yesNoModalToBoolean(value: string): boolean {
	return value === "yes";
}

function booleanToYesNoModal(value: unknown): "yes" | "no" {
	if (value === true || value === "Да" || value === "Требуется") return "yes";
	return "no";
}

const CHANNEL_TO_SCHEMA: Record<string, string> = {
	batch: "Батч",
	batch_user_upload: "Батч+загрузка",
	batch_online: "Батч+Онлайн",
	online: "Онлайн",
	online_gpu: "Онлайн GPU",
	llm: "LLM",
	streaming: "Стриминг",
};

const CHANNEL_FROM_SCHEMA = Object.fromEntries(
	Object.entries(CHANNEL_TO_SCHEMA).map(([k, v]) => [v, k]),
) as Record<string, string>;

const WORK_TYPE_MODAL_TO_SCHEMA: Record<string, string> = {
	development: "Разработка",
	support: "Доработка",
	pilot: "Настройка",
};

const WORK_TYPE_SCHEMA_TO_MODAL = Object.fromEntries(
	Object.entries(WORK_TYPE_MODAL_TO_SCHEMA).map(([k, v]) => [v, k]),
) as Record<string, string>;

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
		additionalUncertainty: yesNoModalToBoolean(values.pilotRequired),
		requirements:
			values.configExchange === "required" ? "Рисковые" : "Понятны",
		integrationReadiness:
			values.workType === "development"
				? "Нужны доработки ИС"
				: "Готов к интеграции",
		daptRegistry: values.sourceFor || undefined,
		domainComplexity: values.domainComplexity || undefined,
		entityVolume: values.entityVolume || undefined,
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
		autoML: yesNoModalToBoolean(values.isCreationRequired),
		role:
			values.workType === "development"
				? "Оркестратор"
				: values.workType === "support"
					? "Подчинённая"
					: "Независимая",
	};
}

export function mapModelServiceModalToBlock(
	values: ModelServiceFormValues,
): Record<string, unknown> {
	return {
		workType: WORK_TYPE_MODAL_TO_SCHEMA[values.workType] ?? values.workType,
		deployChannels: values.channels
			.map((ch) => CHANNEL_TO_SCHEMA[ch] ?? ch)
			.filter(Boolean),
		pkRecalibration: yesNoModalToBoolean(values.pilotRequired),
		pkNewType: yesNoModalToBoolean(values.newServiceCreationRequired),
	};
}

export function mapNonStandardTaskToAtypicalTask(
	values: NonStandardTaskFormValues,
): Record<string, unknown> {
	const estimateHoursPerDay = numericOrUndefined(values.estimateHours);
	const coefficient = numericOrUndefined(values.coefficient);
	const total = computeAtypicalWorkRowTotal(
		estimateHoursPerDay,
		coefficient,
	);

	return {
		name: values.name,
		workType: values.workType,
		estimateHoursPerDay,
		coefficient,
		total: total ?? undefined,
		includeInCalculation: values.includeInCalculation,
	};
}

function mapDataSourceModalValues(
	path: string,
	values: DataSourceFormValues,
): Record<string, unknown> {
	if (path.endsWith("trainingSources")) {
		return mapDataSourceToTrainingSource(values);
	}
	if (path.endsWith("applicationSources")) {
		return mapDataSourceToApplicationSource(values);
	}
	return mapDataSourceToSourceSystem(values);
}

export function mapModelServiceBlockToModalDefaults(
	item: Record<string, unknown>,
): Partial<ModelServiceFormValues> {
	const channels = Array.isArray(item.deployChannels)
		? (item.deployChannels as string[])
				.map((label) => CHANNEL_FROM_SCHEMA[label] ?? "")
				.filter(Boolean)
		: [];
	return {
		name: "model-service",
		channels,
		pilotRequired: booleanToYesNoModal(item.pkRecalibration),
		isCreationRequired: "no",
		newServiceCreationRequired: booleanToYesNoModal(item.pkNewType),
		workType:
			WORK_TYPE_SCHEMA_TO_MODAL[String(item.workType ?? "")] ?? "development",
	};
}

export function mapModalValuesToArrayItem(
	path: string,
	values:
		| DataSourceFormValues
		| ModelServiceFormValues
		| NonStandardTaskFormValues,
	kind: V2AnketaModalKind | null = null,
): Record<string, unknown> {
	switch (kind) {
		case "dataSource":
			return mapDataSourceModalValues(path, values as DataSourceFormValues);
		case "modelService":
			return mapModelServiceToModelItem(values as ModelServiceFormValues);
		case "nonStandardTask":
			return mapNonStandardTaskToAtypicalTask(
				values as NonStandardTaskFormValues,
			);
		default:
			break;
	}

	switch (path) {
		case "detailInfo.sourceSystems":
		case "streamDataSources.sourceSystems":
			return mapDataSourceToSourceSystem(values as DataSourceFormValues);
		case "streamModelControl.dataObjects.trainingSources":
			return mapDataSourceToTrainingSource(values as DataSourceFormValues);
		case "streamModelControl.dataObjects.applicationSources":
			return mapDataSourceToApplicationSource(values as DataSourceFormValues);
		case "detailInfo.model.modelsList":
		case "streamModelControl.models.modelsList":
			return mapModelServiceToModelItem(values as ModelServiceFormValues);
		case "detailInfo.detailAtypicalTasks":
		case "streamDataSources.atypicalTasks":
		case "streamModelControl.atypicalTasks":
			return mapNonStandardTaskToAtypicalTask(
				values as NonStandardTaskFormValues,
			);
		default:
			return {};
	}
}

export function setObjectAtFormPath(
	data: Record<string, unknown>,
	path: string,
	value: Record<string, unknown>,
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

	current[parts[parts.length - 1]] = value;
	return next;
}

export function clearObjectAtFormPath(
	data: Record<string, unknown>,
	path: string,
): Record<string, unknown> {
	return setObjectAtFormPath(data, path, {});
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
	kind: V2AnketaModalKind | null = null,
):
	| Partial<DataSourceFormValues>
	| Partial<ModelServiceFormValues>
	| Partial<NonStandardTaskFormValues> {
	if (kind === "modelServiceBlock") {
		return mapModelServiceBlockToModalDefaults(item);
	}
	if (kind === "dataSource") {
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
			pilotRequired: booleanToYesNoModal(item.additionalUncertainty),
			configExchange:
				item.requirements === "Рисковые" || item.integration === "Новая"
					? "required"
					: "not_required",
			sourceFor: String(item.daptRegistry ?? item.name ?? ""),
			domainComplexity: String(item.domainComplexity ?? ""),
			entityVolume: String(item.entityVolume ?? ""),
		};
	}
	if (kind === "modelService") {
		return {
			name: String(item.name ?? ""),
			workType:
				item.role === "Оркестратор"
					? "development"
					: item.role === "Подчинённая"
						? "support"
						: "pilot",
			isCreationRequired: booleanToYesNoModal(item.autoML),
		};
	}
	if (kind === "nonStandardTask") {
		return {
			name: String(item.name ?? ""),
			workType: String(item.workType ?? item.reason ?? ""),
			estimateHours: String(item.estimateHoursPerDay ?? ""),
			coefficient: String(item.coefficient ?? ""),
			includeInCalculation: item.includeInCalculation !== false,
		};
	}

	switch (path) {
		case "detailInfo.sourceSystems":
		case "streamDataSources.sourceSystems":
		case "streamModelControl.dataObjects.trainingSources":
		case "streamModelControl.dataObjects.applicationSources":
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
				pilotRequired: booleanToYesNoModal(item.additionalUncertainty),
				configExchange:
					item.requirements === "Рисковые" || item.integration === "Новая"
						? "required"
						: "not_required",
				sourceFor: String(item.daptRegistry ?? item.name ?? ""),
				domainComplexity: String(item.domainComplexity ?? ""),
				entityVolume: String(item.entityVolume ?? ""),
			};
		case "detailInfo.model.modelsList":
		case "streamModelControl.models.modelsList":
			return {
				name: String(item.name ?? ""),
				workType:
					item.role === "Оркестратор"
						? "development"
						: item.role === "Подчинённая"
							? "support"
							: "pilot",
				isCreationRequired: booleanToYesNoModal(item.autoML),
			};
		case "generalInfo.modelService":
			return mapModelServiceBlockToModalDefaults(item);
		case "detailInfo.detailAtypicalTasks":
		case "streamDataSources.atypicalTasks":
		case "streamModelControl.atypicalTasks":
			return {
				name: String(item.name ?? ""),
				workType: String(item.workType ?? item.reason ?? ""),
				estimateHours: String(item.estimateHoursPerDay ?? ""),
				coefficient: String(item.coefficient ?? ""),
				includeInCalculation: item.includeInCalculation !== false,
			};
		default:
			return {};
	}
}

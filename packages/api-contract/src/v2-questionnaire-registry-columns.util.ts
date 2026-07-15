import { V2_ANKETA_MAIN_SECTION_TITLES } from "./v2-anketa-workflow.util";
import {
	V2_ANKETA_MAIN_SECTION_IDS,
	type V2AnketaMainSectionId,
} from "./v2-anketa-workflow.types";
import { isV2AnketaHiddenUiNode } from "./v2-anketa-editor-ui.util";
import {
	readV2AnketaSectionUiOptions,
	resolveAnketaSectionWorkflowBinding,
	resolveV2AnketaSectionDisplayTitle,
} from "./v2-anketa-section-ui.util";
import type { V2QuestionnaireDto } from "./v2-questionnaire.types";

export type V2RegistryColumnValueType = "text" | "number" | "date" | "boolean";

export type V2RegistryColumnKind =
	| "meta"
	| "form"
	| "sectionStatus"
	| "panelStatus";

export type V2RegistryLeafColumn = {
	type: "leaf";
	id: string;
	header: string;
	kind: V2RegistryColumnKind;
	formPath?: string;
	metaKey?: keyof V2QuestionnaireDto | string;
	sectionId?: V2AnketaMainSectionId;
	panelPathKey?: string;
	valueType?: V2RegistryColumnValueType;
};

export type V2RegistryGroupColumn = {
	type: "group";
	header: string;
	openByDefault?: boolean;
	children: V2RegistryColumnNode[];
};

export type V2RegistryColumnNode = V2RegistryLeafColumn | V2RegistryGroupColumn;

export type V2RegistryExportColumn = {
	key: string;
	header: string;
	valueGetter: (row: V2QuestionnaireDto) => unknown;
};

export type V2RegistrySchemaColumnOptions = {
	/** Сколько элементов массива разворачивать в колонки реестра (fallback без данных). */
	arrayMaxItems?: number;
	/** Строки реестра — для авто-индексов массивов и подписей групп. */
	rows?: V2QuestionnaireDto[];
	/** Явные индексы массивов по dot-пути (например `summary.detailedCalculation`). */
	arrayIndicesByPath?: Record<string, number[]>;
	/** Подписи групп массивов: путь → индекс → заголовок. */
	arrayGroupLabelsByPath?: Record<string, Record<number, string>>;
};

const REGISTRY_SKIP_ROOT_KEYS = new Set([
	"workflow",
	"meta",
	"groupActivation",
	"uncertaintyCalculation",
	"summary",
]);


const UNCERTAINTY_ROOT = "uncertaintyCalculation";
const SUMMARY_ROOT = "summary";

/** Подписи группы рисков (из jsonSchema.title заводской схемы). */
export const V2_UNCERTAINTY_RISK_GROUP_LABELS: Record<string, string> = {
	businessComplexity:
		"Изменение, недостаточная проработка или сложности бизнес процессов Банка",
	defectsInSolution:
		"Наличие дефектов во внедряемом решении/ ПО в рамках проекта",
	adjacentProjectsImpact:
		"Негативное влияние смежных проектов на показатели проекта",
	laborCostIncrease:
		"Увеличение трудозатрат проекта по причине недостаточной проработки требований на этапе планирования проекта",
	thirdPartyNegligence:
		"Недобросовестное исполнение услуг со стороны привлеченных контрагентов/ подрядчиков",
	staffShortage:
		"Отсутствие квалифицированного персонала или ошибок персонала",
	sanctions: "Введение санкционных мер и других ограничений",
	controlProceduresLack: "Недостаток или отсутствие контрольных процедур",
	regulatoryChanges: "Изменение регуляторных требований",
	isNotUsedAfterProject: "Неиспользование ИС после завершения проекта",
	itArchitectureChanges: "Изменения целевой ИТ архитектуры Банка",
};

/** Порядок полей группы рисков в uncertaintyCalculation.riskGroup. */
export const V2_UNCERTAINTY_RISK_GROUP_ORDER = [
	"businessComplexity",
	"defectsInSolution",
	"adjacentProjectsImpact",
	"laborCostIncrease",
	"thirdPartyNegligence",
	"staffShortage",
	"sanctions",
	"controlProceduresLack",
	"regulatoryChanges",
	"isNotUsedAfterProject",
	"itArchitectureChanges",
] as const;

/** Порядок полей в uncertaintyCalculation. */
export const V2_UNCERTAINTY_CALCULATION_FIELD_ORDER = [
	"initiativeTimeline",
	"initiativeCost",
	"uncertaintyAdjustment",
	"riskGroup",
] as const;

const SOURCE_SYSTEM_FIELDS = [
	["name", "Название"],
	["type", "Тип"],
	["daptRegistry", "Реестр ДАПТ"],
	["requirements", "Требования"],
	["additionalUncertainty", "Доп. неопр."],
	["integrationReadiness", "Готовность ПД"],
	["dataCoeff", "Коэф. данных"],
	["nda", "НДА"],
] as const;

const TRAINING_SOURCE_FIELDS = [
	["name", "Название"],
	["frequency", "Признаков"],
	["development", "Доработка"],
	["integration", "Интеграция"],
	["dataCondition", "Условие данных"],
	["usedModels", "Модели"],
	["controlKD", "Контрольный КД"],
] as const;

const MODEL_FIELDS = [
	["name", "Название"],
	["class", "Класс"],
	["taskType", "Тип задачи"],
	["algorithm", "Алгоритм"],
	["autoML", "AutoML"],
	["role", "Роль"],
] as const;

const DEFAULT_ARRAY_MAX_ITEMS = 3;

export function registryFormColumnId(formPath: string): string {
	return `form.${formPath}`;
}

/** Ширина колонки по длине заголовка — заголовок помещается без обрезки. */
export function estimateRegistryColumnWidth(header: string): number {
	return Math.max(96, Math.min(420, Math.ceil(header.length * 7.5) + 36));
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function resolveSchemaType(
	node: Record<string, unknown> | undefined,
): string | undefined {
	if (!node) return undefined;
	const t = node.type;
	if (typeof t === "string") return t;
	if (Array.isArray(t)) {
		return t.find((x) => x !== "null") as string | undefined;
	}
	if (node.properties) return "object";
	if (node.items) return "array";
	return undefined;
}

function listOrderedPropertyKeys(
	schemaNode: Record<string, unknown>,
	uiBranch: Record<string, unknown> | undefined,
): string[] {
	const props = readRecord(schemaNode.properties);
	const keys = props ? Object.keys(props) : [];
	const order = uiBranch?.["ui:order"];
	if (!Array.isArray(order)) return keys;
	const seen = new Set<string>();
	const result: string[] = [];
	for (const entry of order) {
		if (typeof entry === "string" && keys.includes(entry) && !seen.has(entry)) {
			result.push(entry);
			seen.add(entry);
		}
	}
	for (const key of keys) {
		if (!seen.has(key)) result.push(key);
	}
	return result;
}

function readFieldTitle(
	schemaNode: Record<string, unknown> | undefined,
	key: string,
): string {
	const title = schemaNode?.title;
	if (typeof title === "string" && title.trim()) return title.trim();
	return V2_UNCERTAINTY_RISK_GROUP_LABELS[key] ?? key;
}

function resolveValueType(
	schemaNode: Record<string, unknown> | undefined,
): V2RegistryColumnValueType {
	const type = resolveSchemaType(schemaNode);
	if (type === "number" || type === "integer") return "number";
	if (type === "boolean") return "boolean";
	return "text";
}

function isScalarSchemaNode(node: Record<string, unknown> | undefined): boolean {
	const type = resolveSchemaType(node);
	return (
		type === "string" ||
		type === "number" ||
		type === "integer" ||
		type === "boolean"
	);
}

function isReadonlyGeneratedArray(
	schemaNode: Record<string, unknown>,
	uiNode: Record<string, unknown> | undefined,
): boolean {
	if (schemaNode.readOnly === true) return true;
	if (uiNode?.["ui:readonly"] === true) return true;
	const opts = readRecord(uiNode?.["ui:options"]);
	if (opts?.addable === false && opts?.removable === false) {
		const title = schemaNode.title;
		if (typeof title === "string" && title.includes("Локальные параметры")) {
			return true;
		}
	}
	return false;
}

function formLeaf(
	formPath: string,
	header: string,
	valueType: V2RegistryColumnValueType = "text",
): V2RegistryLeafColumn {
	return {
		type: "leaf",
		id: registryFormColumnId(formPath),
		header,
		kind: "form",
		formPath,
		valueType,
	};
}

function metaLeaf(
	id: string,
	header: string,
	metaKey: string,
	valueType: V2RegistryColumnValueType = "text",
): V2RegistryLeafColumn {
	return {
		type: "leaf",
		id,
		header,
		kind: "meta",
		metaKey,
		valueType,
	};
}

function sectionStatusLeaf(
	sectionId: V2AnketaMainSectionId,
): V2RegistryLeafColumn {
	return {
		type: "leaf",
		id: `workflowSection.${sectionId}`,
		header: `${V2_ANKETA_MAIN_SECTION_TITLES[sectionId]} — статус`,
		kind: "sectionStatus",
		sectionId,
		valueType: "text",
	};
}

function panelStatusLeaf(
	panelPathKey: string,
	sectionTitle: string,
): V2RegistryLeafColumn {
	return {
		type: "leaf",
		id: `workflowPanel.${panelPathKey}`,
		header: `${sectionTitle} — статус`,
		kind: "panelStatus",
		panelPathKey,
		valueType: "text",
	};
}

function readArrayAtFormPath(
	formData: Record<string, unknown> | undefined,
	dotPath: string,
): unknown[] | undefined {
	const value = getByFormPath(formData ?? {}, dotPath);
	return Array.isArray(value) ? value : undefined;
}

function arrayItemHasData(item: unknown): boolean {
	if (item == null) return false;
	if (typeof item !== "object") return true;
	return Object.values(item as Record<string, unknown>).some(
		(v) => v != null && v !== "",
	);
}

/** Индексы элементов массива, встречающиеся в данных анкет. */
export function collectRegistryArrayIndicesFromRows(
	rows: V2QuestionnaireDto[],
	dotPath: string,
): number[] {
	const indices = new Set<number>();
	for (const row of rows) {
		const arr = readArrayAtFormPath(row.formData, dotPath);
		if (!arr) continue;
		arr.forEach((item, index) => {
			if (arrayItemHasData(item)) indices.add(index);
		});
	}
	return [...indices].sort((a, b) => a - b);
}

/** Подписи групп массива (stageName, streamName и т.п.) из данных анкет. */
export function collectRegistryArrayGroupLabelsFromRows(
	rows: V2QuestionnaireDto[],
	dotPath: string,
	nameField: string,
): Record<number, string> {
	const labels: Record<number, string> = {};
	for (const row of rows) {
		const arr = readArrayAtFormPath(row.formData, dotPath);
		if (!arr) continue;
		arr.forEach((item, index) => {
			if (labels[index]) return;
			const rec = readRecord(item);
			const name = rec?.[nameField];
			if (typeof name === "string" && name.trim()) {
				labels[index] = name.trim();
			}
		});
	}
	return labels;
}

export function deriveRegistryColumnOptionsFromRows(
	rows: V2QuestionnaireDto[],
): V2RegistrySchemaColumnOptions {
	const arrayIndicesByPath: Record<string, number[]> = {};
	const arrayGroupLabelsByPath: Record<string, Record<number, string>> = {};

	for (const path of [
		`${SUMMARY_ROOT}.platformStreams`,
		`${SUMMARY_ROOT}.detailedCalculation`,
	] as const) {
		const indices = collectRegistryArrayIndicesFromRows(rows, path);
		if (indices.length === 0) continue;
		arrayIndicesByPath[path] = indices;
		const nameField =
			path === `${SUMMARY_ROOT}.platformStreams` ? "streamName" : "stageName";
		const labels = collectRegistryArrayGroupLabelsFromRows(
			rows,
			path,
			nameField,
		);
		if (Object.keys(labels).length > 0) {
			arrayGroupLabelsByPath[path] = labels;
		}
	}

	return { rows, arrayIndicesByPath, arrayGroupLabelsByPath };
}

function resolveArrayIndices(
	dotPath: string,
	options: V2RegistrySchemaColumnOptions,
): number[] {
	const explicit = options.arrayIndicesByPath?.[dotPath];
	if (explicit?.length) return explicit;
	if (options.rows?.length) {
		return collectRegistryArrayIndicesFromRows(options.rows, dotPath);
	}
	const maxItems = options.arrayMaxItems ?? DEFAULT_ARRAY_MAX_ITEMS;
	return Array.from({ length: maxItems }, (_, index) => index);
}

function resolveArrayGroupHeader(
	dotPath: string,
	index: number,
	fallbackHeader: string,
	options: V2RegistrySchemaColumnOptions,
): string {
	const label = options.arrayGroupLabelsByPath?.[dotPath]?.[index];
	if (label) return label;
	return `${fallbackHeader} ${index + 1}`;
}

function readPanelSectionStatus(
	row: V2QuestionnaireDto,
	panelPathKey: string,
): string {
	const workflow = readRecord(row.formData?.workflow);
	const panelSections = readRecord(workflow?.panelSections);
	const status = panelSections?.[panelPathKey];
	return typeof status === "string" ? status : "";
}

function group(
	header: string,
	children: V2RegistryColumnNode[],
	opts?: { openByDefault?: boolean },
): V2RegistryGroupColumn {
	return {
		type: "group",
		header,
		openByDefault: opts?.openByDefault,
		children,
	};
}

function arrayItemGroupFromSchema(
	groupHeader: string,
	basePath: string,
	index: number,
	itemSchema: Record<string, unknown>,
	itemUi: Record<string, unknown> | undefined,
	headerOverride?: string,
): V2RegistryGroupColumn {
	const fields: V2RegistryLeafColumn[] = [];
	const props = readRecord(itemSchema.properties);
	if (!props) {
		return group(headerOverride ?? `${groupHeader} ${index + 1}`, []);
	}
	for (const key of listOrderedPropertyKeys(itemSchema, itemUi)) {
		const fieldSchema = readRecord(props[key]);
		if (!fieldSchema || !isScalarSchemaNode(fieldSchema)) continue;
		const fieldUi = readRecord(itemUi?.[key]);
		if (fieldUi && isV2AnketaHiddenUiNode(fieldUi)) continue;
		fields.push(
			formLeaf(
				`${basePath}[${index}].${key}`,
				readFieldTitle(fieldSchema, key),
				resolveValueType(fieldSchema),
			),
		);
	}
	return group(headerOverride ?? `${groupHeader} ${index + 1}`, fields);
}

function collectSchemaSectionColumns(
	sectionSchema: Record<string, unknown>,
	sectionUi: Record<string, unknown> | undefined,
	sectionDotPath: string,
	options: V2RegistrySchemaColumnOptions,
): V2RegistryColumnNode[] {
	const nodes: V2RegistryColumnNode[] = [];

	for (const key of listOrderedPropertyKeys(sectionSchema, sectionUi)) {
		const childSchema = readRecord(readRecord(sectionSchema.properties)?.[key]);
		const childUi = readRecord(sectionUi?.[key]);
		if (!childSchema) continue;
		if (childUi && isV2AnketaHiddenUiNode(childUi)) continue;

		const childPath =
			sectionDotPath === "" ? key : `${sectionDotPath}.${key}`;
		const childType = resolveSchemaType(childSchema);

		if (isScalarSchemaNode(childSchema)) {
			nodes.push(
				formLeaf(
					childPath,
					readFieldTitle(childSchema, key),
					resolveValueType(childSchema),
				),
			);
			continue;
		}

		if (childType === "object") {
			const nestedProps = readRecord(childSchema.properties);
			if (!nestedProps) continue;
			for (const nestedKey of listOrderedPropertyKeys(childSchema, childUi)) {
				const nestedSchema = readRecord(nestedProps[nestedKey]);
				const nestedUi = readRecord(childUi?.[nestedKey]);
				if (!nestedSchema || !isScalarSchemaNode(nestedSchema)) continue;
				if (nestedUi && isV2AnketaHiddenUiNode(nestedUi)) continue;
				nodes.push(
					formLeaf(
						`${childPath}.${nestedKey}`,
						readFieldTitle(nestedSchema, nestedKey),
						resolveValueType(nestedSchema),
					),
				);
			}
			continue;
		}

		if (childType === "array") {
			const itemsSchema = readRecord(childSchema.items);
			if (!itemsSchema) continue;
			const itemProps = readRecord(itemsSchema.properties);
			if (!itemProps || Object.keys(itemProps).length === 0) continue;
			if (isReadonlyGeneratedArray(childSchema, childUi)) continue;
			const itemsUi = readRecord(childUi?.items);
			const groupHeader =
				typeof childSchema.title === "string" && childSchema.title.trim()
					? childSchema.title.trim()
					: key;
			const indices = resolveArrayIndices(childPath, options);
			for (const index of indices) {
				nodes.push(
					arrayItemGroupFromSchema(
						groupHeader,
						childPath,
						index,
						itemsSchema,
						itemsUi,
						resolveArrayGroupHeader(
							childPath,
							index,
							groupHeader,
							options,
						),
					),
				);
			}
		}
	}

	return nodes;
}

function collectUncertaintyColumns(
	schema: Record<string, unknown>,
	ui: Record<string, unknown> | undefined,
): V2RegistryColumnNode[] {
	const nodes: V2RegistryColumnNode[] = [];
	const props = readRecord(schema.properties);
	if (!props) return nodes;

	for (const key of listOrderedPropertyKeys(schema, ui)) {
		const fieldSchema = readRecord(props[key]);
		const fieldUi = readRecord(ui?.[key]);
		if (!fieldSchema) continue;
		if (fieldUi && isV2AnketaHiddenUiNode(fieldUi)) continue;

		if (key === "riskGroup") {
			const riskProps = readRecord(fieldSchema.properties);
			if (!riskProps) continue;
			for (const riskKey of listOrderedPropertyKeys(fieldSchema, fieldUi)) {
				const riskSchema = readRecord(riskProps[riskKey]);
				if (!riskSchema || !isScalarSchemaNode(riskSchema)) continue;
				nodes.push(
					formLeaf(
						`${UNCERTAINTY_ROOT}.riskGroup.${riskKey}`,
						readFieldTitle(riskSchema, riskKey),
						resolveValueType(riskSchema),
					),
				);
			}
			continue;
		}

		if (!isScalarSchemaNode(fieldSchema)) continue;
		nodes.push(
			formLeaf(
				`${UNCERTAINTY_ROOT}.${key}`,
				readFieldTitle(fieldSchema, key),
				resolveValueType(fieldSchema),
			),
		);
	}
	return nodes;
}

function collectSummaryColumns(
	schema: Record<string, unknown>,
	ui: Record<string, unknown> | undefined,
	options: V2RegistrySchemaColumnOptions,
): V2RegistryColumnNode[] {
	const nodes: V2RegistryColumnNode[] = [];
	const props = readRecord(schema.properties);
	if (!props) return nodes;

	const scalarFields: V2RegistryLeafColumn[] = [];
	for (const key of listOrderedPropertyKeys(schema, ui)) {
		const fieldSchema = readRecord(props[key]);
		if (!fieldSchema) continue;
		if (resolveSchemaType(fieldSchema) !== "string" &&
			resolveSchemaType(fieldSchema) !== "number" &&
			resolveSchemaType(fieldSchema) !== "integer") {
			continue;
		}
		if (!isScalarSchemaNode(fieldSchema)) continue;
		scalarFields.push(
			formLeaf(
				`${SUMMARY_ROOT}.${key}`,
				readFieldTitle(fieldSchema, key),
				resolveValueType(fieldSchema),
			),
		);
	}
	if (scalarFields.length) {
		nodes.push(group("Итоговая оценка", scalarFields));
	}

	const platformPath = `${SUMMARY_ROOT}.platformStreams`;
	const platformStreams = readRecord(props.platformStreams);
	const platformUi = readRecord(ui?.platformStreams);
	if (platformStreams && resolveSchemaType(platformStreams) === "array") {
		const itemsSchema = readRecord(platformStreams.items);
		if (itemsSchema) {
			const itemsUi = readRecord(platformUi?.items);
			const indices = resolveArrayIndices(platformPath, options);
			if (indices.length > 0) {
				nodes.push(
					group(
						"Платформенные стримы",
						indices.map((index) =>
							arrayItemGroupFromSchema(
								"Стрим",
								platformPath,
								index,
								itemsSchema,
								itemsUi,
								resolveArrayGroupHeader(
									platformPath,
									index,
									"Стрим",
									options,
								),
							),
						),
					),
				);
			}
		}
	}

	const detailedPath = `${SUMMARY_ROOT}.detailedCalculation`;
	const detailedCalculation = readRecord(props.detailedCalculation);
	const detailedUi = readRecord(ui?.detailedCalculation);
	if (detailedCalculation && resolveSchemaType(detailedCalculation) === "array") {
		const itemsSchema = readRecord(detailedCalculation.items);
		if (itemsSchema) {
			const itemsUi = readRecord(detailedUi?.items);
			const indices = resolveArrayIndices(detailedPath, options);
			if (indices.length > 0) {
				nodes.push(
					group(
						"E2E этапы",
						indices.map((index) =>
							arrayItemGroupFromSchema(
								"Этап",
								detailedPath,
								index,
								itemsSchema,
								itemsUi,
								resolveArrayGroupHeader(
									detailedPath,
									index,
									"Этап",
									options,
								),
							),
						),
					),
				);
			}
		}
	}

	return nodes;
}

function buildMetaRegistryGroup(): V2RegistryGroupColumn {
	return group(
		"Реестр",
		[
			metaLeaf("calcName", "Анкета", "calcName"),
			metaLeaf("readableId", "ID анкеты", "readableId"),
			metaLeaf("version", "Версия", "version"),
			metaLeaf("status", "Статус записи", "status"),
			metaLeaf("workflowGlobalStatus", "Статус анкеты", "workflowGlobalStatus"),
			metaLeaf("author", "Автор", "author"),
			metaLeaf("templateName", "Шаблон", "templateName"),
			metaLeaf("schemaBindingStatus", "Привязка схемы", "schemaBinding.status"),
			metaLeaf("finalCoefficient", "Итоговый коэф.", "finalCoefficient", "number"),
			metaLeaf("createdAt", "Дата создания", "createdAt", "date"),
			metaLeaf("updatedAt", "Дата последнего изменения", "updatedAt", "date"),
		],
		{ openByDefault: true },
	);
}

function sectionGroupFromNodes(
	sectionTitle: string,
	statusLeaves: V2RegistryLeafColumn[],
	children: V2RegistryColumnNode[],
	openByDefault?: boolean,
): V2RegistryGroupColumn {
	return group(sectionTitle, [...statusLeaves, ...children], { openByDefault });
}

function listRegistryRootSectionKeys(
	rootSchema: Record<string, unknown>,
	rootUi: Record<string, unknown> | undefined,
): string[] {
	const props = readRecord(rootSchema.properties);
	if (!props) return [];
	return listOrderedPropertyKeys(rootSchema, rootUi).filter((key) => {
		if (REGISTRY_SKIP_ROOT_KEYS.has(key)) return false;
		const sectionSchema = readRecord(props[key]);
		if (!sectionSchema || resolveSchemaType(sectionSchema) !== "object") {
			return false;
		}
		const sectionUi = readRecord(rootUi?.[key]);
		if (sectionUi && isV2AnketaHiddenUiNode(sectionUi)) return false;
		const uiOptions = readV2AnketaSectionUiOptions(sectionUi);
		if (uiOptions.hidden || uiOptions.system) return false;
		return true;
	});
}

function buildSectionStatusLeaves(
	sectionKey: string,
	sectionTitle: string,
	sectionUi: Record<string, unknown> | undefined,
): V2RegistryLeafColumn[] {
	const uiOptions = readV2AnketaSectionUiOptions(sectionUi);
	const binding = resolveAnketaSectionWorkflowBinding(sectionKey, uiOptions);
	if (binding.kind === "main") {
		return [sectionStatusLeaf(binding.sectionId)];
	}
	if (binding.kind === "panel") {
		return [panelStatusLeaf(binding.pathKey, sectionTitle)];
	}
	return [];
}

function mainSectionGroupFromNodes(
	sectionId: V2AnketaMainSectionId,
	children: V2RegistryColumnNode[],
	openByDefault?: boolean,
): V2RegistryGroupColumn {
	return sectionGroupFromNodes(
		V2_ANKETA_MAIN_SECTION_TITLES[sectionId],
		[sectionStatusLeaf(sectionId)],
		children,
		openByDefault,
	);
}

function arrayItemCols(
	groupHeader: string,
	basePath: string,
	index: number,
	fields: ReadonlyArray<readonly [string, string]>,
): V2RegistryGroupColumn {
	return group(
		`${groupHeader} ${index + 1}`,
		fields.map(([key, label]) => formLeaf(`${basePath}[${index}].${key}`, label)),
	);
}

/** Статический набор колонок (fallback без схемы). */
export function buildStaticV2QuestionnaireRegistryColumnTree(): V2RegistryColumnNode[] {
	const generalInfoChildren: V2RegistryColumnNode[] = [
		formLeaf("generalInfo.businessCustomer", "Заказчик"),
		formLeaf("generalInfo.implementationStream", "Стрим-исполнитель"),
		formLeaf("generalInfo.complexity", "Сложность"),
		formLeaf("generalInfo.channels", "Каналы"),
		formLeaf("generalInfo.overallUncertainty", "Неопределённость"),
		formLeaf("generalInfo.createIS", "Создание ИС", "boolean"),
		formLeaf("generalInfo.createService", "Создание сервиса", "boolean"),
		formLeaf("generalInfo.pilotNeed", "Пилот"),
		formLeaf("uncertaintyCalculation.initiativeTimeline", "Сроки инициативы"),
		formLeaf("uncertaintyCalculation.initiativeCost", "Стоимость инициативы"),
		formLeaf(
			"uncertaintyCalculation.uncertaintyAdjustment",
			"Поправка неопределённости",
			"number",
		),
		...Object.entries(V2_UNCERTAINTY_RISK_GROUP_LABELS).map(([key, header]) =>
			formLeaf(`uncertaintyCalculation.riskGroup.${key}`, header),
		),
	];

	return [
		buildMetaRegistryGroup(),
		mainSectionGroupFromNodes("generalInfo", generalInfoChildren, true),
		mainSectionGroupFromNodes("detailInfo", [
			formLeaf("detailInfo.parameters.streamsOutsideDADM", "Стримы вне ДАДМ", "boolean"),
			formLeaf("detailInfo.parameters.streamNames", "Названия стримов"),
			formLeaf("detailInfo.model.modelsCount", "Кол-во моделей", "number"),
			formLeaf("detailInfo.model.algorithmType", "Тип алгоритма"),
			formLeaf("detailInfo.model.algorithmCoeff", "Коэф. алгоритма", "number"),
			formLeaf("detailInfo.model.autoML", "AutoML", "boolean"),
			formLeaf("detailInfo.model.specialist", "Специалист"),
			formLeaf("detailInfo.model.cascadeEnsemble", "Каскад/ансамбль"),
			...([0, 1, 2] as const).map((index) =>
				arrayItemCols(
					"Источник",
					"detailInfo.sourceSystems",
					index,
					SOURCE_SYSTEM_FIELDS,
				),
			),
		]),
		mainSectionGroupFromNodes("streamDataSources", [
			formLeaf("streamDataSources.sourceTypicalTasks[0].name", "Типовая задача 1"),
			formLeaf("streamDataSources.sourceTypicalTasks[0].total", "Итог задачи 1", "number"),
			formLeaf("streamDataSources.sourceTypicalTasks[1].name", "Типовая задача 2"),
			formLeaf("streamDataSources.sourceTypicalTasks[1].total", "Итог задачи 2", "number"),
			formLeaf("streamDataSources.atypicalTasks[0].name", "Нетиповая задача 1"),
			formLeaf("streamDataSources.atypicalTasks[0].total", "Итог нетиповой 1", "number"),
		]),
		mainSectionGroupFromNodes("streamModelControl", [
			formLeaf("streamModelControl.dataProcessing.sourcesRDS", "Источников RDS", "number"),
			formLeaf("streamModelControl.dataProcessing.consumers", "Приёмников", "number"),
			formLeaf(
				"streamModelControl.dataProcessing.otherMicroservices",
				"Микросервисов",
				"number",
			),
			formLeaf("streamModelControl.dataProcessing.filters", "Фильтров", "number"),
			formLeaf("streamModelControl.dataProcessing.yaspArtifact", "ЯСП"),
			...([0, 1] as const).map((index) =>
				arrayItemCols(
					"Витрина обучения",
					"streamModelControl.dataObjects.trainingSources",
					index,
					TRAINING_SOURCE_FIELDS,
				),
			),
			arrayItemCols(
				"Витрина применения",
				"streamModelControl.dataObjects.applicationSources",
				0,
				[
					["name", "Название"],
					["mode", "Режим"],
					["updateFrequency", "Обновление"],
					["development", "Доработка"],
					["controlKD", "Контрольный КД"],
					["usedModels", "Модели"],
				],
			),
			formLeaf("streamModelControl.models.cascadeEnsemble", "Каскад/ансамбль"),
			formLeaf("streamModelControl.models.recalibrationType", "Рекалибровка"),
			...([0, 1] as const).map((index) =>
				arrayItemCols(
					"Модель",
					"streamModelControl.models.modelsList",
					index,
					MODEL_FIELDS,
				),
			),
		]),
		group("Итоговая оценка", [
			formLeaf("summary.total", "Общая стоимость", "number"),
			formLeaf("summary.baseScoreStream", "Базовая (СФЕРА)", "number"),
			formLeaf("summary.scoreWithComplexityCoeff", "С поправкой сложности", "number"),
			formLeaf("summary.deviationFromBaseline", "Отклонение %", "number"),
		]),
	];
}

/** Колонки реестра из версии jsonSchema/uiSchema шаблона. */
export function buildV2QuestionnaireRegistryColumnTree(
	jsonSchema?: Record<string, unknown>,
	uiSchema?: Record<string, unknown>,
	options: V2RegistrySchemaColumnOptions = {},
): V2RegistryColumnNode[] {
	if (!jsonSchema || !uiSchema) {
		return buildStaticV2QuestionnaireRegistryColumnTree();
	}

	const rootSchema = readRecord(jsonSchema);
	const rootUi = readRecord(uiSchema);
	const rootProps = readRecord(rootSchema?.properties);
	if (!rootSchema || !rootProps) {
		return buildStaticV2QuestionnaireRegistryColumnTree();
	}

	const tree: V2RegistryColumnNode[] = [buildMetaRegistryGroup()];

	for (const sectionKey of listRegistryRootSectionKeys(rootSchema, rootUi)) {
		const sectionSchema = readRecord(rootProps[sectionKey]);
		if (!sectionSchema) continue;
		const sectionUi = readRecord(rootUi?.[sectionKey]);
		const sectionTitle = resolveV2AnketaSectionDisplayTitle(
			readFieldTitle(sectionSchema, sectionKey),
			sectionUi,
			sectionKey,
		);
		const sectionColumns = collectSchemaSectionColumns(
			sectionSchema,
			sectionUi,
			sectionKey,
			options,
		);

		if (sectionKey === "generalInfo") {
			const uncertaintySchema = readRecord(rootProps[UNCERTAINTY_ROOT]);
			const uncertaintyUi = readRecord(rootUi?.[UNCERTAINTY_ROOT]);
			if (uncertaintySchema) {
				sectionColumns.push(
					...collectUncertaintyColumns(uncertaintySchema, uncertaintyUi),
				);
			}
		}

		tree.push(
			sectionGroupFromNodes(
				sectionTitle,
				buildSectionStatusLeaves(sectionKey, sectionTitle, sectionUi),
				sectionColumns,
				sectionKey === "generalInfo",
			),
		);
	}

	const summarySchema = readRecord(rootProps[SUMMARY_ROOT]);
	const summaryUi = readRecord(rootUi?.[SUMMARY_ROOT]);
	if (summarySchema) {
		tree.push(...collectSummaryColumns(summarySchema, summaryUi, options));
	}

	return tree;
}

export function flattenV2RegistryColumnTree(
	nodes: V2RegistryColumnNode[],
): V2RegistryLeafColumn[] {
	const leaves: V2RegistryLeafColumn[] = [];
	const walk = (node: V2RegistryColumnNode, groupHeader?: string) => {
		if (node.type === "leaf") {
			leaves.push(
				groupHeader
					? {
							...node,
							header: `${groupHeader} — ${node.header}`,
						}
					: node,
			);
			return;
		}
		for (const child of node.children) {
			if (child.type === "group") {
				walk(child, child.header);
				continue;
			}
			walk(child, groupHeader);
		}
	};
	for (const node of nodes) walk(node);
	return leaves;
}

export function getByFormPath(obj: unknown, path: string): unknown {
	const parts = path.split(".");
	let current: unknown = obj;
	for (const part of parts) {
		if (current == null || typeof current !== "object") return undefined;
		const match = /^(\w+)\[(\d+)\]$/.exec(part);
		if (match) {
			const [, key, indexStr] = match;
			const container = (current as Record<string, unknown>)[key!];
			if (!Array.isArray(container)) return undefined;
			current = container[Number.parseInt(indexStr!, 10)];
		} else {
			current = (current as Record<string, unknown>)[part];
		}
	}
	return current;
}

function metaValue(row: V2QuestionnaireDto, metaKey: string): unknown {
	if (metaKey === "readableId") return row.readableId ?? row.id;
	if (metaKey === "schemaBinding.status") return row.schemaBinding.status;
	if (metaKey === "workflowGlobalStatus") return row.workflowGlobalStatus ?? "";
	return (row as Record<string, unknown>)[metaKey];
}

export function buildV2QuestionnaireRegistryExportColumns(
	jsonSchema?: Record<string, unknown>,
	uiSchema?: Record<string, unknown>,
	options?: V2RegistrySchemaColumnOptions,
): V2RegistryExportColumn[] {
	const tree = buildV2QuestionnaireRegistryColumnTree(
		jsonSchema,
		uiSchema,
		options,
	);
	const leaves = flattenV2RegistryColumnTree(tree);
	return leaves.map((leaf) => {
		if (leaf.kind === "meta") {
			return {
				key: leaf.id,
				header: leaf.header,
				valueGetter: (row) => metaValue(row, leaf.metaKey ?? leaf.id),
			};
		}
		if (leaf.kind === "sectionStatus") {
			const sectionId = leaf.sectionId!;
			return {
				key: leaf.id,
				header: leaf.header,
				valueGetter: (row) => row.workflowSectionStatuses?.[sectionId] ?? "",
			};
		}
		if (leaf.kind === "panelStatus") {
			const panelPathKey = leaf.panelPathKey!;
			return {
				key: leaf.id,
				header: leaf.header,
				valueGetter: (row) => readPanelSectionStatus(row, panelPathKey),
			};
		}
		return {
			key: leaf.id,
			header: leaf.header,
			valueGetter: (row) => getByFormPath(row.formData ?? {}, leaf.formPath!),
		};
	});
}

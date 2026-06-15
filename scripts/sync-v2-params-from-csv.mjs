#!/usr/bin/env node
/**
 * Синхронизирует наборы полей в v2-default-anketa.snapshot.json с авторитетным CSV
 * llm/v2_new_docs/Параметры 15.06.csv — оставляет только параметры из CSV (новый набор).
 *
 * Запуск: node scripts/sync-v2-params-from-csv.mjs
 */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CSV_PATH = join(root, "llm/v2_new_docs/Параметры 15.06.csv");
const SNAPSHOT_PATH = join(
	root,
	"apps/nestjs-server/src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

/** RFC4180-подобный парсер CSV с `;`. */
function parseCsv(text, delimiter = ";") {
	const rows = [];
	let field = "";
	let row = [];
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
		} else if (ch !== "\r") {
			field += ch;
		}
	}
	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function clean(value) {
	return (value ?? "").replace(/\s+/g, " ").trim();
}

function normTitle(title) {
	return clean(title)
		.toLowerCase()
		.replace(/[?.!,:;«»"'`]/g, "")
		.replace(/\s+/g, " ");
}

function parseEnumValues(raw) {
	if (!raw?.trim()) return [];
	return raw
		.split(/\n/)
		.map((v) => v.trim())
		.filter(Boolean);
}

function typeRank(elementType) {
	const t = clean(elementType).toLowerCase();
	if (t.startsWith("справочник")) return 3;
	if (t === "число" || t === "строка") return 2;
	if (/^да\/?нет$/i.test(t)) return 1;
	return 0;
}

function normBlock(block) {
	const b = clean(block).toLowerCase();
	if (b === "детальная информация") return "Детальная Информация";
	if (b === "общая информация") return "Общая информация";
	return clean(block);
}

function parseCsvParams() {
	const rows = parseCsv(readFileSync(CSV_PATH, "utf-8"));
	const [, ...body] = rows;
	const bySection = new Map();

	for (const r of body) {
		const block = normBlock(r[0]);
		const section = clean(r[1]);
		const title = clean(r[2]);
		const elementType = clean(r[3]);
		const enumRaw = r[4] ?? "";
		if (!block || !section || !title) continue;

		const key = `${block}|${section}`;
		const param = {
			block,
			section,
			title,
			elementType,
			enumValues: parseEnumValues(enumRaw),
		};

		const nTitle = normTitle(title);
		const bucket = bySection.get(key) ?? new Map();
		const existing = bucket.get(nTitle);
		if (!existing || typeRank(elementType) >= typeRank(existing.elementType)) {
			bucket.set(nTitle, param);
		}
		bySection.set(key, bucket);
	}

	const out = new Map();
	for (const [key, bucket] of bySection) {
		out.set(key, [...bucket.values()]);
	}
	return out;
}

/** Семантические ключи, сохраняемые между версиями схемы. */
const SEMANTIC_KEY_BY_TITLE = {
	"название источника": "name",
	"тип системы-источника": "type",
	"количество сущностей (исходных таблиц)": "entityVolume",
	"сложность предметной области": "domainComplexity",
	"nda": "nda",
	"требуется создание информационной системы": "createIS",
	"требуется создание сервиса": "createService",
	"общая неопределенность": "overallUncertainty",
	"сроки инициативы": "initiativeTimeline",
	"стоимость инициативы": "initiativeCost",
	"поправка на общую неопределенность": "uncertaintyAdjustment",
	"стейкхолдеры известны (владелец сервиса разработчик модели / витрин рп и тд)":
		"stakeholdersKnown",
	"объем изменений в тис": "tisChangeVolume",
	"необходимость изучения регламентов банка": "studyRegulations",
	"необходимо пересогласование артефакта": "reapproveArtifact",
	"класс модели": "modelClass",
	"вид контроля": "controlTypes",
	"тип работ калибровка": "workType",
	"пвр/регуляторный": "pkRegulatory",
	"каналы внедрения": "deployChannels",
	"роль модели": "modelRole",
	"необходимость automl": "autoMLNeed",
	"сложность алгоритма / тип ml задачи": "algorithmComplexity",
	"способ предоставления данных заказчику": "deliveryMode",
	"тип работ": "workType",
	"количество метрик": "metricsCount",
	"количество признаков": "featuresCount",
};

const RISK_TITLE_TO_KEY = {
	"изменение недостаточная проработка или сложности бизнес процессов банка":
		"businessComplexity",
	"наличие дефектов во внедряемом решении/ по в рамках проекта":
		"defectsInSolution",
	"негативное влияние смежных проектов на показатели проекта":
		"adjacentProjectsImpact",
	"увеличение трудозатрат проекта по причине недостаточной проработки требований на этапе планирования проекта":
		"requirementsGap",
	"недобросовестное исполнение услуг со стороны привлеченных контрагентов/ подрядчиков":
		"contractorMisconduct",
	"отсутствие квалифицированного персонала или ошибок персонала":
		"staffShortage",
	"введение санкционных мер и других ограничений": "sanctions",
	"недостаток или отсутствие контрольных процедур": "controlProcedures",
	"изменение регуляторных требований": "regulatoryChanges",
	"неиспользование ис после завершения проекта": "systemUnused",
	"изменения целевой ит архитектуры банка": "architectureChanges",
};

/** Поля, не из CSV, но нужные для работы UI/расчёта. */
const PRESERVE_KEYS = {
	"detailInfo.sourceSystems.items": new Set(["name"]),
	"detailInfo.model": new Set(["modelsList"]),
	generalInfo: new Set([
		"calcName",
		"businessCustomer",
		"implementationStream",
		"complexity",
		"prePromEval",
		"prodNeed",
		"integrEval",
		"pilotNeed",
		"overallUncertaintyModal",
	]),
};

const SECTION_TARGETS = {
	"Детальная Информация|Арх. Компонент. Система-источник": {
		schemaPath: ["detailInfo", "sourceSystems", "items"],
		uiPath: ["detailInfo", "sourceSystems", "items"],
		preserve: PRESERVE_KEYS["detailInfo.sourceSystems.items"],
	},
	"Детальная Информация|Арх. Компонент. Объект данных": {
		schemaPath: ["detailInfo", "dataMart"],
		uiPath: ["detailInfo", "dataMart"],
		preserve: new Set(),
	},
	"Детальная Информация|Арх. Компонент. Процесс обработки данных": {
		schemaPath: ["detailInfo", "dataProcess"],
		uiPath: ["detailInfo", "dataProcess"],
		preserve: new Set(),
	},
	"Детальная Информация|Арх. Компонент. Модель": {
		schemaPath: ["detailInfo", "model"],
		uiPath: ["detailInfo", "model"],
		preserve: PRESERVE_KEYS["detailInfo.model"],
	},
	"Общая информация|Арх. Компонент. Модельный сервис": {
		schemaPath: ["generalInfo", "modelService"],
		uiPath: ["generalInfo", "modelService"],
		preserve: new Set(),
	},
	"Источники данных|Параметры": {
		schemaPath: ["streamDataSources", "localParams"],
		uiPath: ["streamDataSources", "localParams"],
		preserve: new Set(),
	},
	"Контроль моделей|Параметры": {
		schemaPath: ["streamModelControl", "localParams"],
		uiPath: ["streamModelControl", "localParams"],
		preserve: new Set(),
	},
};

function randomFieldKey() {
	const id = randomBytes(4).toString("base64url").slice(0, 8);
	return `field_${id}`;
}

function stableFieldKey(title) {
	const n = normTitle(title);
	if (SEMANTIC_KEY_BY_TITLE[n]) return SEMANTIC_KEY_BY_TITLE[n];
	return `field_${createHash("sha1").update(n).digest("base64url").slice(0, 8)}`;
}

function buildFieldSchema(param) {
	const t = clean(param.elementType).toLowerCase();
	const title = param.title;

	if (normTitle(title) === normTitle("Общая неопределенность")) {
		return { type: "string", title, readOnly: true };
	}

	if (/^да\/?нет$/i.test(t)) {
		return { type: "boolean", title };
	}
	if (t === "число") {
		return { type: "number", title };
	}
	if (t === "строка") {
		return { type: "string", title };
	}
	if (t.startsWith("справочник")) {
		const schema = { type: "string", title };
		if (param.enumValues.length > 0) {
			schema.enum = param.enumValues;
		}
		return schema;
	}
	return { type: "string", title };
}

function buildUiField(key, schema, sectionKey) {
	const ui = {};
	if (schema.type === "boolean") {
		ui["ui:widget"] = "checkbox";
		return ui;
	}
	if (schema.type === "number") {
		ui["ui:widget"] = "updown";
		return ui;
	}
	if (schema.readOnly) {
		ui["ui:readonly"] = true;
		return ui;
	}
	if (schema.enum) {
		ui["ui:widget"] = "select";
		return ui;
	}
	ui["ui:widget"] = "text";
	return ui;
}

/** Путь сегментов от корня jsonSchema (properties → … → items). */
function getSchemaNode(snap, path, create = false) {
	let node = snap.jsonSchema;
	for (let i = 0; i < path.length; i++) {
		const seg = path[i];
		if (seg === "items") {
			if (!node.items) {
				if (!create) return null;
				node.type = "array";
				node.items = { type: "object", properties: {} };
			}
			node = node.items;
			continue;
		}
		if (!node.properties) {
			if (!create) return null;
			node.properties = {};
		}
		if (!node.properties[seg]) {
			if (!create) return null;
			const nextIsItems = path[i + 1] === "items";
			node.properties[seg] =
				seg === "sourceSystems" || nextIsItems
					? { type: "array", items: { type: "object", properties: {} } }
					: { type: "object", properties: {} };
		}
		node = node.properties[seg];
	}
	return node;
}

function resolveSchemaProps(snap, target) {
	const path = target.schemaPath;
	if (path.at(-1) === "items") {
		const parent = getSchemaNode(snap, path.slice(0, -1), true);
		if (!parent.items) {
			parent.type = "array";
			parent.items = { type: "object", properties: {} };
		}
		if (!parent.items.properties) parent.items.properties = {};
		return parent.items.properties;
	}
	const node = getSchemaNode(snap, path, true);
	if (!node.properties) node.properties = {};
	return node.properties;
}

function resolveUiBranch(snap, target) {
	const path = target.uiPath;
	let cur = snap.uiSchema;
	for (const seg of path) {
		if (!cur[seg]) cur[seg] = {};
		cur = cur[seg];
	}
	return cur;
}

function indexExistingByTitle(properties) {
	const map = new Map();
	for (const [key, schema] of Object.entries(properties ?? {})) {
		if (schema?.title) map.set(normTitle(schema.title), key);
	}
	return map;
}

function applyParamsToTarget(snap, target, params) {
	const properties = resolveSchemaProps(snap, target);
	const uiBranch = resolveUiBranch(snap, target);
	const existingByTitle = indexExistingByTitle(properties);

	const nextProps = {};
	const order = [];

	for (const key of target.preserve) {
		if (properties[key]) {
			nextProps[key] = structuredClone(properties[key]);
			order.push(key);
		}
	}

	for (const param of params) {
		const nTitle = normTitle(param.title);
		let key =
			SEMANTIC_KEY_BY_TITLE[nTitle] ??
			existingByTitle.get(nTitle) ??
			stableFieldKey(param.title);

		// Массивы: каналы внедрения, вид контроля
		let schema = buildFieldSchema(param);
		if (key === "deployChannels" || key === "controlTypes") {
			schema = {
				type: "array",
				title: param.title,
				items: {
					type: "string",
					...(param.enumValues.length ? { enum: param.enumValues } : {}),
				},
				uniqueItems: true,
			};
		}

		nextProps[key] = schema;
		order.push(key);

		const uiField = buildUiField(key, schema);
		uiBranch[key] = uiField;
	}

	// Очистить ui от удалённых полей (кроме ui:options, ui:order, items)
	for (const k of Object.keys(uiBranch)) {
		if (k.startsWith("ui:") || k === "items") continue;
		if (!nextProps[k]) delete uiBranch[k];
	}

	if (target.schemaPath.at(-1) === "items") {
		const parent = getSchemaNode(snap, target.schemaPath.slice(0, -1), true);
		if (!parent.items) {
			parent.type = "array";
			parent.items = { type: "object", properties: {} };
		}
		parent.items.properties = nextProps;
		if (!parent.items.required?.includes("name")) {
			parent.items.required = ["name"];
		}
	} else {
		const node = getSchemaNode(snap, target.schemaPath, true);
		node.properties = nextProps;
	}

	uiBranch["ui:order"] = order;
}

function applyGeneralInfoParams(snap, params) {
	const giProps = snap.jsonSchema.properties.generalInfo.properties;
	const uiGi = snap.uiSchema.generalInfo;
	const existingByTitle = indexExistingByTitle(giProps);

	const giParamTitles = new Set([
		normTitle("Регуляторные требования"),
		normTitle("Требуется создание информационной системы"),
		normTitle("Требуется создание сервиса"),
		normTitle("Общая неопределенность"),
	]);

	const riskParams = [];
	const giParams = [];

	for (const p of params) {
		const n = normTitle(p.title);
		if (RISK_TITLE_TO_KEY[n] || n === normTitle("Риски проекта")) {
			riskParams.push(p);
		} else if (giParamTitles.has(n)) {
			giParams.push(p);
		} else if (
			n === normTitle("Сроки инициативы") ||
			n === normTitle("Стоимость инициативы") ||
			n === normTitle("Поправка на общую неопределенность")
		) {
			// uncertaintyCalculation
		} else {
			giParams.push(p);
		}
	}

	// generalInfo — только поля из CSV + preserve
	const preserve = PRESERVE_KEYS.generalInfo;
	const nextGi = {};
	const giOrder = [];

	for (const key of preserve) {
		if (giProps[key]) {
			nextGi[key] = structuredClone(giProps[key]);
			giOrder.push(key);
		}
	}

	for (const param of giParams) {
		const n = normTitle(param.title);
		let key =
			SEMANTIC_KEY_BY_TITLE[n] ??
			existingByTitle.get(n) ??
			stableFieldKey(param.title);
		nextGi[key] = buildFieldSchema(param);
		giOrder.push(key);
		uiGi[key] = buildUiField(key, nextGi[key]);
	}

	for (const k of Object.keys(uiGi)) {
		if (k.startsWith("ui:") || k === "modelService") continue;
		if (!nextGi[k]) delete uiGi[k];
	}

	const updatedModelService =
		snap.jsonSchema.properties.generalInfo.properties.modelService;
	snap.jsonSchema.properties.generalInfo.properties = {
		...nextGi,
		modelService: updatedModelService,
	};
	// Удалить ошибочный дубликат modelService на корне properties (если был)
	delete snap.jsonSchema.properties?.properties;
	uiGi["ui:order"] = [...giOrder.filter((k) => k !== "modelService"), "modelService"];

	// uncertaintyCalculation
	const uc = snap.jsonSchema.properties.uncertaintyCalculation.properties;
	const uiUc = snap.uiSchema.uncertaintyCalculation;
	const ucExisting = indexExistingByTitle(uc);
	const nextUc = {};
	const ucOrder = [];

	for (const param of params) {
		const n = normTitle(param.title);
		if (RISK_TITLE_TO_KEY[n]) {
			const key = RISK_TITLE_TO_KEY[n];
			nextUc[key] = buildFieldSchema(param);
			ucOrder.push(key);
			uiUc[key] = buildUiField(key, nextUc[key]);
			continue;
		}
		if (
			n === normTitle("Сроки инициативы") ||
			n === normTitle("Стоимость инициативы") ||
			n === normTitle("Поправка на общую неопределенность")
		) {
			const key = SEMANTIC_KEY_BY_TITLE[n] ?? ucExisting.get(n) ?? stableFieldKey(param.title);
			nextUc[key] = buildFieldSchema(param);
			ucOrder.push(key);
			uiUc[key] = buildUiField(key, nextUc[key]);
		}
	}

	// riskGroup wrapper
	if (ucOrder.some((k) => RISK_TITLE_TO_KEY && Object.values(RISK_TITLE_TO_KEY).includes(k))) {
		const riskProps = {};
		for (const [k, v] of Object.entries(nextUc)) {
			if (Object.values(RISK_TITLE_TO_KEY).includes(k)) {
				riskProps[k] = v;
				delete nextUc[k];
				delete uiUc[k];
			}
		}
		if (Object.keys(riskProps).length > 0) {
			nextUc.riskGroup = {
				type: "object",
				title: "Группа рисков",
				properties: riskProps,
			};
			uiUc.riskGroup = {
				"ui:order": Object.keys(riskProps),
				...Object.fromEntries(
					Object.keys(riskProps).map((k) => [k, buildUiField(k, riskProps[k])]),
				),
			};
			ucOrder.push("riskGroup");
		}
	}

	snap.jsonSchema.properties.uncertaintyCalculation.properties = nextUc;
	uiUc["ui:order"] = ucOrder;
}

function cleanupStreamModelControlRoot(snap) {
	const smc = snap.jsonSchema.properties.streamModelControl.properties;
	const local = smc.localParams?.properties ?? {};
	for (const k of Object.keys(smc)) {
		if (k === "localParams" || k === "atypicalTasks") continue;
		const field = smc[k];
		if (field?.title && local) {
			const key = stableFieldKey(field.title);
			if (!local[key]) {
				local[key] = structuredClone(field);
			}
		}
		delete smc[k];
	}
}

function main() {
	const paramsBySection = parseCsvParams();
	const snap = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8"));

	for (const [sectionKey, target] of Object.entries(SECTION_TARGETS)) {
		const params = paramsBySection.get(sectionKey) ?? [];
		if (params.length === 0) {
			console.warn(`No CSV params for ${sectionKey}`);
			continue;
		}
		applyParamsToTarget(snap, target, params);
		console.log(`Updated ${sectionKey}: ${params.length} params`);
	}

	const generalParams = paramsBySection.get("Общая информация|Параметры") ?? [];
	if (generalParams.length > 0) {
		applyGeneralInfoParams(snap, generalParams);
		console.log(`Updated Общая информация|Параметры: ${generalParams.length} params`);
	}

	cleanupStreamModelControlRoot(snap);

	writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snap, null, "\t")}\n`);
	console.log(`Wrote ${SNAPSHOT_PATH}`);
}

main();

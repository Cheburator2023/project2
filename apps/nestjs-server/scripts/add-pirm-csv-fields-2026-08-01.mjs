#!/usr/bin/env node
/**
 * ПиРМ CSV 2026.08.01: новые поля строго по title, перенос
 * «Требуется логирование ПИМ» → Модельный сервис, перепривязка работ.
 *
 *   node scripts/add-pirm-csv-fields-2026-08-01.mjs
 */
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const ANKETA_PATH = join(
	__dirname,
	"../src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);
const SNAPSHOT_PATH = join(
	__dirname,
	"../src/modules/anketa-v2/constants/v2-factory-typical-works.snapshot.json",
);
const REGISTRY_PATH = join(
	__dirname,
	"../src/modules/anketa-v2/constants/v2-factory-template-typical-works.registry.json",
);
const PRESETS_PATH = join(
	ROOT,
	"packages/api-contract/src/v2-arch-component-presets.ts",
);

function loadJson(p) {
	return JSON.parse(readFileSync(p, "utf8"));
}
function saveJson(p, data) {
	writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function newFieldKey() {
	const alphabet =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
	const bytes = randomBytes(8);
	let s = "field_";
	for (const b of bytes) s += alphabet[b % alphabet.length];
	return s;
}
function newUid() {
	return `field_${randomUUID()}`;
}

const ENUM_NORM = ["норма", "средняя", "высокая"];
const ENUM_MANUAL = [
	"без доработок",
	"незначительные доработки",
	"значительные доработки",
];
const ENUM_SUPERSET = [
	"без интеграций и без Clickhouse",
	"с интеграцией и Clickhouse",
	"с интеграцией, Clickhouse и доработкой",
];

/** @type {Array<{arch: string, title: string, type: string, enum?: string[], key?: string, uid?: string, moveFrom?: string}>} */
const NEW_FIELDS = [
	{
		arch: "dataMart",
		title: "Хранилище признаков: подключение нового источника данных",
		type: "boolean",
	},
	{
		arch: "model",
		title: "Требуется новая библиотека / базовая модель",
		type: "boolean",
	},
	{
		arch: "modelService",
		title: "Требуется расширение инфраструктуры кластера SSDP",
		type: "boolean",
	},
	{
		arch: "modelService",
		title:
			"SuperSet: сложность развёртывания отдельного инстанса, наличие доп. доработок, способ загрузки данных (вручную / по интеграции)",
		type: "string",
		enum: ENUM_SUPERSET,
	},
	{
		arch: "modelService",
		title: "Требуется логирование ПИМ",
		type: "boolean",
		key: "field_IGQX_9FN",
		uid: "field_15e8f2e9-0ea8-46f5-a7d3-59abcb82cb12",
		moveFrom: "streamModelControl.localParams",
	},
	{
		arch: "sourceSystem",
		title: "Маркер: требуется разметка данных источника",
		type: "boolean",
	},
	{
		arch: "sourceSystem",
		title: "Маркер: требуется новая модель для автоматической разметки данных",
		type: "boolean",
	},
	{
		arch: "sourceSystem",
		title:
			"Маркер: сложность настройки шаблона разметки данных и подготовки сырых данных для загрузки",
		type: "string",
		enum: ENUM_NORM,
	},
	{
		arch: "sourceSystem",
		title:
			"Маркер: размер новой модели, доп. библиотеки, сложность подключения, конфигурации, тестирования и отладки модели (вкл. Active Learning и сетевые доступы)",
		type: "string",
		enum: ENUM_NORM,
	},
	{
		arch: "sourceSystem",
		title:
			"Маркер: требуется регламентный импорт/экспорт данных или отчетности",
		type: "boolean",
	},
	{
		arch: "sourceSystem",
		title:
			"Маркер: сложность реализации интеграции, правил обработки данных (в т.ч. конфиденциальных) и настройки режима обмена данными",
		type: "string",
		enum: ENUM_NORM,
	},
	{
		arch: "sourceSystem",
		title:
			"Маркер: требуются специальные условия хранения и обработки конфиденциальных данных, не поддерживаемые коммунальным сервисом",
		type: "boolean",
	},
	{
		arch: "sourceSystem",
		title:
			"Маркер: правила обработки данных (в т.ч. конфиденциальных), режим обмена данными, сложность развёртывания отдельного инстанса и наличие доп. доработок",
		type: "string",
		enum: ENUM_NORM,
	},
	{
		arch: "sourceSystem",
		title:
			"Маркер: требуется ручная обработка результатов автоматизированной разметки данных",
		type: "boolean",
	},
	{
		arch: "sourceSystem",
		title:
			"Маркер: сложность развёртывания отдельного инстанса ручной разметки голосов и наличие доп. доработок",
		type: "string",
		enum: ENUM_MANUAL,
	},
];

const ARCH_PATH = {
	modelService: {
		schema: ["generalInfo", "properties", "modelService"],
		ui: ["generalInfo", "modelService"],
		preset: "modelService",
	},
	dataMart: {
		schema: ["detailInfo", "properties", "dataMart"],
		ui: ["detailInfo", "dataMart"],
		preset: "dataMart",
	},
	model: {
		schema: ["detailInfo", "properties", "modelsList", "items"],
		ui: ["detailInfo", "modelsList", "items"],
		preset: "model",
	},
	sourceSystem: {
		schema: ["detailInfo", "properties", "sourceSystems", "items"],
		ui: ["detailInfo", "sourceSystems", "items"],
		preset: "sourceSystem",
	},
};

function getAt(root, path) {
	let cur = root;
	for (const p of path) {
		if (cur == null) return undefined;
		cur = cur[p];
	}
	return cur;
}

function ensureField(schemaNode, uiNode, def) {
	const key = def.key ?? newFieldKey();
	const uid = def.uid ?? newUid();
	const schemaProp =
		def.type === "string" && def.enum
			? { type: "string", title: def.title, enum: [...def.enum] }
			: { type: def.type, title: def.title };
	schemaNode.properties = schemaNode.properties ?? {};
	schemaNode.properties[key] = schemaProp;

	uiNode[key] = {
		...(def.type === "string" && def.enum ? { "ui:widget": "select" } : {}),
		"ui:options": { schemaFieldUid: uid },
		"ui:placeholder": def.title,
	};
	const order = uiNode["ui:order"];
	if (Array.isArray(order) && !order.includes(key)) order.push(key);

	return { key, uid, title: def.title, type: def.type, enum: def.enum ?? null };
}

function removeField(schemaNode, uiNode, key) {
	if (schemaNode?.properties) delete schemaNode.properties[key];
	if (uiNode) {
		delete uiNode[key];
		if (Array.isArray(uiNode["ui:order"])) {
			uiNode["ui:order"] = uiNode["ui:order"].filter((k) => k !== key);
		}
	}
}

function findMatchingBrace(src, openIdx) {
	let depth = 0;
	for (let i = openIdx; i < src.length; i++) {
		const ch = src[i];
		if (ch === "{") depth++;
		else if (ch === "}") {
			depth--;
			if (depth === 0) return i;
		}
	}
	throw new Error(`Unbalanced brace from ${openIdx}`);
}

function findMatchingBracket(src, openIdx) {
	let depth = 0;
	for (let i = openIdx; i < src.length; i++) {
		const ch = src[i];
		if (ch === "[") depth++;
		else if (ch === "]") {
			depth--;
			if (depth === 0) return i;
		}
	}
	throw new Error(`Unbalanced bracket from ${openIdx}`);
}

function getArchSlice(src, archName) {
	const re = new RegExp(`\\t"${archName}"\\s*:\\s*\\{`);
	const m = re.exec(src);
	if (!m) throw new Error(`Preset arch not found: ${archName}`);
	const open = m.index + m[0].length - 1;
	const close = findMatchingBrace(src, open);
	return { start: m.index, open, close, bodyStart: open + 1, bodyEnd: close };
}

function indentLines(str, indent) {
	return str
		.split("\n")
		.map((line, i) => (i === 0 ? line : indent + line))
		.join("\n");
}

function injectPresetField(src, archName, fieldKey, schemaProp, uiEntry) {
	const arch = getArchSlice(src, archName);
	const archBody = src.slice(arch.bodyStart, arch.bodyEnd);
	if (archBody.includes(`"${fieldKey}"`)) {
		console.log("preset skip (exists)", archName, fieldKey);
		return src;
	}

	// properties: prefer items.properties, else first properties
	let propsRel = archBody.lastIndexOf('"properties":');
	if (propsRel < 0) throw new Error(`No properties in ${archName}`);
	const propsAbs = arch.bodyStart + propsRel;
	const propsOpen = src.indexOf("{", propsAbs);
	const propsClose = findMatchingBrace(src, propsOpen);
	const propJson = indentLines(JSON.stringify(schemaProp, null, "\t"), "\t\t\t\t");
	const propInsert = `\n\t\t\t\t"${fieldKey}": ${propJson},`;
	// ensure trailing comma on previous property
	let insertAt = propsClose;
	let i = propsClose - 1;
	while (i >= 0 && /\s/.test(src[i])) i--;
	if (src[i] === "}" || src[i] === "]" || /[0-9a-zA-Z"_]/.test(src[i])) {
		if (src[i] !== ",") {
			src = src.slice(0, i + 1) + "," + src.slice(i + 1);
			insertAt = propsClose + 1;
		}
	}
	src = src.slice(0, insertAt) + propInsert + src.slice(insertAt);

	// re-locate arch after edit
	const arch2 = getArchSlice(src, archName);
	const body2 = src.slice(arch2.bodyStart, arch2.bodyEnd);
	const orderRel = body2.lastIndexOf('"ui:order":');
	if (orderRel >= 0) {
		const orderAbs = arch2.bodyStart + orderRel;
		const arrOpen = src.indexOf("[", orderAbs);
		const arrClose = findMatchingBracket(src, arrOpen);
		const arrBody = src.slice(arrOpen, arrClose + 1);
		if (!arrBody.includes(`"${fieldKey}"`)) {
			src =
				src.slice(0, arrClose) +
				`,\n\t\t\t\t"${fieldKey}"` +
				src.slice(arrClose);
		}
	}

	const arch3 = getArchSlice(src, archName);
	const body3 = src.slice(arch3.bodyStart, arch3.bodyEnd);
	const uiOrderRel = body3.lastIndexOf('"ui:order":');
	if (uiOrderRel < 0) return src;
	// Insert ui entry just before the closing of the object that contains ui:order
	// Walk back from ui:order to find its parent object open, then find close
	const orderAbs3 = arch3.bodyStart + uiOrderRel;
	// parent object: find `{` that owns this ui:order — scan backwards for unmatched {
	let depth = 0;
	let parentOpen = -1;
	for (let i = orderAbs3; i >= arch3.open; i--) {
		if (src[i] === "}") depth++;
		else if (src[i] === "{") {
			if (depth === 0) {
				parentOpen = i;
				break;
			}
			depth--;
		}
	}
	if (parentOpen < 0) return src;
	const parentClose = findMatchingBrace(src, parentOpen);
	const parentBody = src.slice(parentOpen, parentClose);
	// ui:order already contains the key — only skip if a real ui entry object exists
	const entryRe = new RegExp(`"${fieldKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}":\\s*\\{`);
	if (entryRe.test(parentBody)) return src;
	let i = parentClose - 1;
	while (i >= 0 && /\s/.test(src[i])) i--;
	let insertAt = parentClose;
	if (src[i] !== ",") {
		src = src.slice(0, i + 1) + "," + src.slice(i + 1);
		insertAt = parentClose + 1;
	}
	const uiJson = indentLines(JSON.stringify(uiEntry, null, "\t"), "\t\t\t");
	const uiInsert = `\n\t\t\t"${fieldKey}": ${uiJson},`;
	src = src.slice(0, insertAt) + uiInsert + src.slice(insertAt);
	return src;
}

function slug(title) {
	return title
		.toLowerCase()
		.replace(/[^a-zа-яё0-9]+/giu, "_")
		.replace(/^_|_$/g, "")
		.slice(0, 48);
}

function paramName(title, key) {
	return `${title} @ ${key}|${slug(title)}`;
}

function boolTrigger(ref) {
	return {
		paramName: paramName(ref.title, ref.key),
		paramCode: ref.key,
		schemaFieldUid: ref.uid,
		operator: "=",
		values: ["Да"],
		valueCode: "true",
		valueLabel: "Да",
	};
}

function byValueLabor(ref, values) {
	return {
		paramName: paramName(ref.title, ref.key),
		paramCode: ref.key,
		schemaFieldUid: ref.uid,
		kind: "by_value",
		values: values.map((v) => ({
			label: v.label,
			code: v.code ?? v.label,
			coefficient: v.coefficient,
		})),
	};
}

function findPirm(snapshot, name) {
	return snapshot.typicalWorks.find((w) => w.stream === "ПиРМ" && w.name === name);
}

function setTriggers(work, rules) {
	work.triggerRules = rules;
	work.triggerParams = rules.map((r) => r.paramName);
	work.triggerParam = work.triggerParams.join(" И ");
	work.triggerArchCount = null;
}

function setLabor(work, labors, formulaText) {
	work.laborParams = labors.map((l) => l.paramName);
	work.laborCoefficients = labors;
	work.formulaText = formulaText;
	work.roundingMode = "ceil";
	work.roundingStep = 0.01;
}

function lookupExisting(anketa, title) {
	const hits = [];
	function walk(schemaNode, uiNode, arch) {
		const props = schemaNode?.properties;
		if (!props) return;
		for (const [key, prop] of Object.entries(props)) {
			if (prop?.title === title) {
				hits.push({
					key,
					uid: uiNode?.[key]?.["ui:options"]?.schemaFieldUid ?? key,
					title,
					type: prop.type,
					enum: prop.enum ?? null,
					arch,
				});
			}
		}
		if (schemaNode.items) walk(schemaNode.items, uiNode?.items, arch);
	}
	walk(
		anketa.jsonSchema.properties.generalInfo.properties.modelService,
		anketa.uiSchema.generalInfo.modelService,
		"modelService",
	);
	walk(
		anketa.jsonSchema.properties.detailInfo.properties.dataMart,
		anketa.uiSchema.detailInfo.dataMart,
		"dataMart",
	);
	walk(
		anketa.jsonSchema.properties.detailInfo.properties.modelsList,
		anketa.uiSchema.detailInfo.modelsList,
		"model",
	);
	walk(
		anketa.jsonSchema.properties.detailInfo.properties.sourceSystems,
		anketa.uiSchema.detailInfo.sourceSystems,
		"sourceSystem",
	);
	walk(
		anketa.jsonSchema.properties.detailInfo.properties.dataProcesses,
		anketa.uiSchema.detailInfo.dataProcesses,
		"dataProcess",
	);
	return hits[0] ?? null;
}

// ─── main ───────────────────────────────────────────────────────────────────
const anketa = loadJson(ANKETA_PATH);
const snapshot = loadJson(SNAPSHOT_PATH);
const registry = loadJson(REGISTRY_PATH);
/** @type {Record<string, {key:string,uid:string,title:string,type:string,enum:string[]|null,arch:string}>} */
const created = {};
const report = { added: [], moved: [], works: [], flags: [] };

// 1) Move IGQX out of streamModelControl.localParams
{
	const localSchema = getAt(anketa.jsonSchema.properties, [
		"streamModelControl",
		"properties",
		"localParams",
	]);
	const localUi = getAt(anketa.uiSchema, ["streamModelControl", "localParams"]);
	if (localSchema?.properties?.field_IGQX_9FN) {
		removeField(localSchema, localUi, "field_IGQX_9FN");
		report.moved.push(
			"field_IGQX_9FN removed from streamModelControl.localParams",
		);
	}
}

// 2) Add fields into anketa
for (const def of NEW_FIELDS) {
	const paths = ARCH_PATH[def.arch];
	const schemaNode = getAt(anketa.jsonSchema.properties, paths.schema);
	const uiNode = getAt(anketa.uiSchema, paths.ui);
	if (!schemaNode?.properties || !uiNode) {
		throw new Error(`Arch path missing for ${def.arch}`);
	}
	const existingKey = Object.entries(schemaNode.properties).find(
		([, v]) => v?.title === def.title,
	)?.[0];
	if (existingKey && !def.moveFrom) {
		const uid =
			uiNode[existingKey]?.["ui:options"]?.schemaFieldUid ?? newUid();
		created[def.title] = {
			key: existingKey,
			uid,
			title: def.title,
			type: def.type,
			enum: def.enum ?? null,
			arch: def.arch,
		};
		report.flags.push(`already in ${def.arch}: ${existingKey} — ${def.title}`);
		continue;
	}
	const ref = ensureField(schemaNode, uiNode, def);
	created[def.title] = { ...ref, arch: def.arch };
	report.added.push(`[${def.arch}] ${ref.key} — ${def.title}`);
}

// 3) Presets
let presetsSrc = readFileSync(PRESETS_PATH, "utf8");
for (const def of NEW_FIELDS) {
	const ref = created[def.title];
	if (!ref) continue;
	const schemaProp =
		def.type === "string" && def.enum
			? { enum: [...def.enum], type: "string", title: def.title }
			: { type: def.type, title: def.title };
	const uiEntry =
		def.type === "string" && def.enum
			? {
					"ui:widget": "select",
					"ui:options": { schemaFieldUid: ref.uid },
					"ui:placeholder": def.title,
				}
			: {
					"ui:options": { schemaFieldUid: ref.uid },
					"ui:placeholder": def.title,
				};
	presetsSrc = injectPresetField(
		presetsSrc,
		ARCH_PATH[def.arch].preset,
		ref.key,
		schemaProp,
		uiEntry,
	);
}
writeFileSync(PRESETS_PATH, presetsSrc, "utf8");

// helpers for work binding
const ref = (title) => {
	const r = created[title] ?? lookupExisting(anketa, title);
	if (!r) throw new Error(`Field not found: ${title}`);
	return r;
};

{
	const w = findPirm(snapshot, "Подключение источника данных");
	const processLabor = (w?.laborCoefficients ?? []).find(
		(c) => c.paramCode === "field_HgUCNn6E",
	);
	const fsReal = ref("Реализуется в Хранилище признаков");
	if (w && processLabor) {
		setTriggers(w, [
			boolTrigger(fsReal),
			boolTrigger(ref("Хранилище признаков: подключение нового источника данных")),
		]);
		setLabor(w, [structuredClone(processLabor)], "N × коэф(field_HgUCNn6E)");
		w.component = "Объект данных";
		const rw = registry.works.find((x) => x.name === w.name);
		if (rw) rw.archComponentType = "Объект данных";
		report.works.push("Подключение источника данных");
	}
}

{
	const w = findPirm(snapshot, "Настройка проекта и типового шаблона разметки");
	if (w) {
		const laborTitle =
			"Маркер: сложность настройки шаблона разметки данных и подготовки сырых данных для загрузки";
		setTriggers(w, [boolTrigger(ref("Маркер: требуется разметка данных источника"))]);
		setLabor(
			w,
			[
				byValueLabor(ref(laborTitle), [
					{ label: "норма", coefficient: 1 },
					{ label: "средняя", coefficient: 1.5 },
					{ label: "высокая", coefficient: 2 },
				]),
			],
			`N × коэф(${ref(laborTitle).key})`,
		);
		report.works.push(w.name);
	}
}

{
	const w = findPirm(
		snapshot,
		"Добавление новой модели для автоматической разметки данных в ИС 1860, настройка Active Learning",
	);
	if (w) {
		const laborTitle =
			"Маркер: размер новой модели, доп. библиотеки, сложность подключения, конфигурации, тестирования и отладки модели (вкл. Active Learning и сетевые доступы)";
		setTriggers(w, [
			boolTrigger(ref("Маркер: требуется разметка данных источника")),
			boolTrigger(
				ref("Маркер: требуется новая модель для автоматической разметки данных"),
			),
		]);
		setLabor(
			w,
			[
				byValueLabor(ref(laborTitle), [
					{ label: "норма", coefficient: 1 },
					{ label: "средняя", coefficient: 1.5 },
					{ label: "высокая", coefficient: 2 },
				]),
			],
			`N × коэф(${ref(laborTitle).key})`,
		);
		report.works.push(w.name);
	}
}

{
	const w = findPirm(
		snapshot,
		"Реализация регламентной загрузки данных в ИС 1860 и/или экспорта размеченных данных в ИС-потребитель",
	);
	if (w) {
		const laborTitle =
			"Маркер: сложность реализации интеграции, правил обработки данных (в т.ч. конфиденциальных) и настройки режима обмена данными";
		setTriggers(w, [
			boolTrigger(ref("Маркер: требуется разметка данных источника")),
			boolTrigger(
				ref(
					"Маркер: требуется регламентный импорт/экспорт данных или отчетности",
				),
			),
		]);
		setLabor(
			w,
			[
				byValueLabor(ref(laborTitle), [
					{ label: "норма", coefficient: 1 },
					{ label: "средняя", coefficient: 1.25 },
					{ label: "высокая", coefficient: 1.5 },
				]),
			],
			`N × коэф(${ref(laborTitle).key})`,
		);
		report.works.push(w.name);
	}
}

{
	const w = findPirm(
		snapshot,
		"Развертывание отдельного экземпляра ИС 1860 под конфиденциальные данные",
	);
	if (w) {
		const laborTitle =
			"Маркер: правила обработки данных (в т.ч. конфиденциальных), режим обмена данными, сложность развёртывания отдельного инстанса и наличие доп. доработок";
		setTriggers(w, [
			boolTrigger(
				ref(
					"Маркер: требуются специальные условия хранения и обработки конфиденциальных данных, не поддерживаемые коммунальным сервисом",
				),
			),
		]);
		setLabor(
			w,
			[
				byValueLabor(ref(laborTitle), [
					{ label: "норма", coefficient: 1 },
					{ label: "средняя", coefficient: 1.5 },
					{ label: "высокая", coefficient: 1.75 },
				]),
			],
			`N × коэф(${ref(laborTitle).key})`,
		);
		report.works.push(w.name);
	}
}

{
	const w = findPirm(
		snapshot,
		"Ручная обработка результатов автоматизированной разметки обращений клиентов в случае низкой степени уверенности модели",
	);
	if (w) {
		const laborTitle =
			"Маркер: сложность развёртывания отдельного инстанса ручной разметки голосов и наличие доп. доработок";
		setTriggers(w, [
			boolTrigger(
				ref(
					"Маркер: требуется ручная обработка результатов автоматизированной разметки данных",
				),
			),
		]);
		setLabor(
			w,
			[
				byValueLabor(ref(laborTitle), [
					{ label: "без доработок", coefficient: 1 },
					{ label: "незначительные доработки", coefficient: 1.25 },
					{ label: "значительные доработки", coefficient: 1.5 },
				]),
			],
			`N × коэф(${ref(laborTitle).key})`,
		);
		report.works.push(w.name);
	}
}

{
	const w = findPirm(
		snapshot,
		"Визуализация результатов работы модельного сервиса",
	);
	if (w) {
		const laborTitle =
			"SuperSet: сложность развёртывания отдельного инстанса, наличие доп. доработок, способ загрузки данных (вручную / по интеграции)";
		setTriggers(w, [
			boolTrigger(
				ref(
					"Требуется визуализация результатов работы модельного сервиса в SuperSet",
				),
			),
		]);
		setLabor(
			w,
			[
				byValueLabor(ref(laborTitle), [
					{ label: "без интеграций и без Clickhouse", coefficient: 0.65 },
					{ label: "с интеграцией и Clickhouse", coefficient: 1 },
					{
						label: "с интеграцией, Clickhouse и доработкой",
						coefficient: 1.2,
					},
				]),
			],
			`N × коэф(${ref(laborTitle).key})`,
		);
		report.works.push(w.name);
	}
}

{
	const w = findPirm(snapshot, "Загрузка моделей или библиотек в контур банка");
	if (w) {
		setTriggers(w, [
			boolTrigger(ref("Требуется новая библиотека / базовая модель")),
		]);
		setLabor(w, [], "N");
		report.works.push(w.name);
	}
}

{
	const w = findPirm(snapshot, "Добавление оборудования в кластер SSDP");
	if (w) {
		setTriggers(w, [
			boolTrigger(ref("Требуется расширение инфраструктуры кластера SSDP")),
		]);
		setLabor(w, [], "N");
		report.works.push(w.name);
	}
}

{
	const w = findPirm(
		snapshot,
		"Настройка kafka и тракта логирования для нового потребителя",
	);
	if (w) {
		setTriggers(w, [boolTrigger(ref("Требуется логирование ПИМ"))]);
		setLabor(w, [], "N");
		report.works.push(w.name);
	}
}

saveJson(ANKETA_PATH, anketa);
saveJson(SNAPSHOT_PATH, snapshot);
saveJson(REGISTRY_PATH, registry);

mkdirSync(join(__dirname, "output"), { recursive: true });
const reportPath = join(__dirname, "output/pirm-new-fields-report.json");
writeFileSync(
	reportPath,
	`${JSON.stringify({ created, report }, null, 2)}\n`,
	"utf8",
);

console.log("ADDED:");
for (const line of report.added) console.log(" ", line);
console.log("MOVED:", report.moved);
console.log("WORKS:", report.works.length);
console.log("Report:", reportPath);

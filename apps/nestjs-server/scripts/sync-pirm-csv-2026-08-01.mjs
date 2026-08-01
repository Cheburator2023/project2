#!/usr/bin/env node
/**
 * Синхронизация типовых работ ПиРМ из llm/Типовые работы - ПиРМ_2026.08.01.csv
 * со snapshot + registry. Правки схемы (enum/title) — точечно, где CSV совпадает
 * с существующим полем.
 *
 *   node scripts/sync-pirm-csv-2026-08-01.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const SNAPSHOT_PATH = join(
	__dirname,
	"../src/modules/anketa-v2/constants/v2-factory-typical-works.snapshot.json",
);
const REGISTRY_PATH = join(
	__dirname,
	"../src/modules/anketa-v2/constants/v2-factory-template-typical-works.registry.json",
);
const ANKETA_PATH = join(
	__dirname,
	"../src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);
const PRESETS_PATH = join(
	ROOT,
	"packages/api-contract/src/v2-arch-component-presets.ts",
);

const report = { updated: [], deleted: [], renamed: [], schema: [], flags: [] };

function loadJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

function saveJson(path, data) {
	writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function findPirm(snapshot, name) {
	return snapshot.typicalWorks.find(
		(w) => w.stream === "ПиРМ" && w.name === name,
	);
}

function cloneRule(template, overrides = {}) {
	return { ...structuredClone(template), ...overrides };
}

function byValueLabor({
	paramName,
	paramCode,
	schemaFieldUid,
	values,
}) {
	return {
		paramName,
		paramCode,
		schemaFieldUid,
		kind: "by_value",
		values: values.map((v) => ({
			label: v.label,
			code: v.code ?? v.label.toLowerCase().replace(/\s+/g, "_"),
			coefficient: v.coefficient,
		})),
	};
}

function setLabor(work, labors, formulaText) {
	work.laborParams = labors.map((l) => l.paramName);
	work.laborCoefficients = labors;
	work.formulaText = formulaText;
	work.roundingMode = "ceil";
	work.roundingStep = 0.01;
}

function ensureTrigger(work, rule, { append = false } = {}) {
	if (!append) {
		work.triggerRules = [rule];
		work.triggerParam = rule.paramName;
		work.triggerParams = [rule.paramName];
		return;
	}
	const code = rule.paramCode;
	const exists = (work.triggerRules ?? []).some((r) => r.paramCode === code);
	if (!exists) {
		work.triggerRules = [...(work.triggerRules ?? []), rule];
	}
	work.triggerParams = (work.triggerRules ?? []).map((r) => r.paramName);
	work.triggerParam = work.triggerParams.join(" И ");
}

function updateMeta(snapshot) {
	const streams = new Set();
	const components = new Set();
	const stages = new Set();
	let withNorm = 0;
	let withFormula = 0;
	for (const row of snapshot.typicalWorks) {
		if (row.stream?.trim()) streams.add(row.stream.trim());
		if (row.component?.trim()) components.add(row.component.trim());
		if (row.stage?.trim()) stages.add(row.stage.trim());
		if (row.norm != null) withNorm += 1;
		if (row.formulaText?.trim()) withFormula += 1;
	}
	snapshot.meta = {
		...snapshot.meta,
		counts: {
			typicalWorks: snapshot.typicalWorks.length,
			typicalWorksWithNorm: withNorm,
			dictionaries: Array.isArray(snapshot.dictionaries)
				? snapshot.dictionaries.length
				: 0,
			streams: streams.size,
			components: components.size,
			stages: stages.size,
			typicalWorksWithFormula: withFormula,
		},
	};
}

const snapshot = loadJson(SNAPSHOT_PATH);
const registry = loadJson(REGISTRY_PATH);
const anketa = loadJson(ANKETA_PATH);

// --- helpers: known bound rules from existing works ---
const repoWork = findPirm(snapshot, "Первичное подключение ИС к Репозиторию моделей");
const fsTrigger = findPirm(
	snapshot,
	"Сохранение объекта сырых данных в Хранилище признаков",
)?.triggerRules?.[0];
const saveRawTrigger = findPirm(
	snapshot,
	"Сохранение объекта сырых данных в Хранилище признаков",
)?.triggerRules?.[1];
const qcTrigger = findPirm(
	snapshot,
	"Создание контроля качества Признаков в Хранилище признаков",
)?.triggerRules?.[1];
const autoMlTrigger = findPirm(
	snapshot,
	"Выделение ресурсного пула под обучение и применение модели",
)?.triggerRules?.[0];
const roleLaborSrc = findPirm(
	snapshot,
	"Регистрация / обновление версии модели в СУМ",
)?.laborCoefficients?.[0];
const processLaborSrc = findPirm(
	snapshot,
	"Подключение источника данных",
)?.laborCoefficients?.[0];
const parseLaborSrc = findPirm(
	snapshot,
	"Сохранение объекта сырых данных в Хранилище признаков",
)?.laborCoefficients?.[0];
const complexityLaborSrc = findPirm(
	snapshot,
	"Разработка Набора признаков",
)?.laborCoefficients?.[0];
const metricsLaborSrc = findPirm(
	snapshot,
	"Регистрация Признака в Хранилище признаков",
)?.laborCoefficients?.[0];
const templateLaborSrc = findPirm(
	snapshot,
	"Настройка проекта и типового шаблона разметки",
)?.laborCoefficients?.[0];
const markerNewModelTrigger = findPirm(
	snapshot,
	"Добавление новой модели для автоматической разметки данных в ИС 1860, настройка Active Learning",
);
const markerBaseTrigger =
	findPirm(snapshot, "Настройка проекта и типового шаблона разметки")
		?.triggerRules?.[0];
const confTrigger = findPirm(
	snapshot,
	"Развертывание отдельного экземпляра ИС 1860 под конфиденциальные данные",
)?.triggerRules?.[0];
const manualTrigger = findPirm(
	snapshot,
	"Ручная обработка результатов автоматизированной разметки обращений клиентов в случае низкой степени уверенности модели",
)?.triggerRules?.[0];
const vizTrigger = findPirm(
	snapshot,
	"Визуализация результатов работы модельного сервиса",
)?.triggerRules?.[0];
const orchTrigger = findPirm(
	snapshot,
	"Кастомизация конфигурации оркестратора",
)?.triggerRules?.[0];
const workTypeRuleTemplate = findPirm(
	snapshot,
	"Настройка публикаций и бэкендов модельных сервисов на коммунальных HAPROXY балансировщиках",
)?.triggerRules?.[0];

// ============================================================================
// 1. Rename + delete
// ============================================================================
{
	const oldName =
		"Контроль соблюдение архитектурных требований ПИМ и использования коммунальных ресурсов";
	const newName =
		"Контроль соблюдения архитектурных требований ПИМ и использования коммунальных ресурсов";
	const w = findPirm(snapshot, oldName);
	if (w) {
		w.name = newName;
		w.originalName = newName;
		report.renamed.push(`${oldName} → ${newName}`);
	}
	const rw = registry.works.find((x) => x.name === oldName);
	if (rw) rw.name = newName;
}

const DELETE_NAMES = [
	"Консультации по разворачиванию оркестратора",
	"Консультация по подключению к тракту логированию моделей",
];
const deleteIds = new Set(
	registry.works
		.filter((w) => DELETE_NAMES.includes(w.name))
		.map((w) => w.id),
);
snapshot.typicalWorks = snapshot.typicalWorks.filter((w) => {
	if (w.stream === "ПиРМ" && DELETE_NAMES.includes(w.name)) {
		report.deleted.push(w.name);
		return false;
	}
	return true;
});
registry.works = registry.works.filter((w) => !DELETE_NAMES.includes(w.name));
report.flags.push(
	`Удалены registry ids: ${[...deleteIds].join(", ") || "(нет)"}`,
);

// ============================================================================
// 2. Norm-only / simple formula works
// ============================================================================
const NORM_UPDATES = {
	"Загрузка моделей или библиотек в контур банка": 10,
	"Добавление оборудования в кластер SSDP": 10,
	"Настройка публикаций и бэкендов модельных сервисов на коммунальных HAPROXY балансировщиках": 5,
	"Выделение ресурсного пула под обучение и исполнение модели": 5,
	"Контроль соблюдения архитектурных требований ПИМ и использования коммунальных ресурсов": 5,
	"Кастомизация конфигурации оркестратора": 20,
	"Настройка kafka и тракта логирования для нового потребителя": 12,
};

for (const [name, norm] of Object.entries(NORM_UPDATES)) {
	const w = findPirm(snapshot, name);
	if (!w) {
		report.flags.push(`NORM miss: ${name}`);
		continue;
	}
	w.norm = norm;
	w.normRaw = String(norm);
	const rw = registry.works.find((x) => x.name === name);
	if (rw?.normsByStream) rw.normsByStream["ПиРМ"] = norm;
	report.updated.push(`norm ${name} = ${norm}`);
}

// workType trigger: Разработка | Доработка | Разработка и внедрение
for (const name of [
	"Настройка публикаций и бэкендов модельных сервисов на коммунальных HAPROXY балансировщиках",
	"Выделение ресурсного пула под обучение и исполнение модели",
	"Контроль соблюдения архитектурных требований ПИМ и использования коммунальных ресурсов",
]) {
	const w = findPirm(snapshot, name);
	if (!w || !workTypeRuleTemplate) continue;
	ensureTrigger(
		w,
		cloneRule(workTypeRuleTemplate, {
			operator: "in",
			values: ["Разработка", "Доработка", "Разработка и внедрение"],
			valueCode: null,
			valueLabel: null,
		}),
	);
	report.updated.push(`workType trigger ${name}`);
}

// Jupiter: base only, trigger AutoML new library (closest schema field)
{
	const w = findPirm(snapshot, "Загрузка моделей или библиотек в контур банка");
	const libTrig = findPirm(
		snapshot,
		"Добавление новой ML-библиотеки и/или фреймворка",
	)?.triggerRules?.find((r) => r.paramCode === "field_S41Rqt5E");
	if (w && libTrig) {
		ensureTrigger(w, cloneRule(libTrig));
		setLabor(w, [], "N");
		report.updated.push("Загрузка моделей: trigger library, no labor, N");
		report.flags.push(
			'Триггер CSV «Требуется новая библиотека / базовая модель» привязан к полю схемы «AutoML: требуется новая библиотека» (field_S41Rqt5E). Отдельного поля без префикса AutoML в схеме нет.',
		);
	}
}

// SSDP: no dedicated boolean in schema — keep arch_count, note flag
report.flags.push(
	'SSDP: CSV-триггер «Требуется расширение инфраструктуры кластера SSDP» отсутствует в схеме. Оставлен triggerArchCount modelService ≥ 1. Нужно новое boolean-поле.',
);

// Kafka trigger: keep field_IGQX_9FN, flag rename
{
	const w = findPirm(
		snapshot,
		"Настройка kafka и тракта логирования для нового потребителя",
	);
	if (w?.triggerRules?.[0]) {
		report.flags.push(
			'Kafka: CSV «Требуется логирование ПИМ» ↔ схема «Требуется проработка структуры логов» (field_IGQX_9FN). Поле то же; title можно переименовать.',
		);
	}
}
report.flags.push(
	'Оркестратор: CSV «Требуется оркестратор ПИМ» ↔ схема «Требуется оркестратор» (field_JcKtx9Mg).',
);

// ============================================================================
// 3. Role model coefficients (schema: Обычная / Оркестратор)
// ============================================================================
{
	const w = findPirm(
		snapshot,
		"Регистрация / обновление версии модели в СУМ",
	);
	if (w && roleLaborSrc) {
		const labor = byValueLabor({
			paramName: "Роль модели @ field_VbI-0aiT|роль_модели",
			paramCode: "field_VbI-0aiT",
			schemaFieldUid: roleLaborSrc.schemaFieldUid,
			values: [
				{ label: "Обычная", code: "обычная", coefficient: 1 },
				{ label: "Оркестратор", code: "оркестратор", coefficient: 1.75 },
			],
		});
		setLabor(w, [labor], "N × коэф(field_VbI-0aiT)");
		report.updated.push("Роль модели coeffs Обычная/Оркестратор");
	}
}

// ============================================================================
// 4. Feature Store works
// ============================================================================
{
	const w = findPirm(snapshot, "Подключение источника данных");
	if (w && processLaborSrc && fsTrigger) {
		// CSV component = Объект данных, but labor is process type — keep process component
		const labor = byValueLabor({
			paramName:
				"Тип процесса обработки данных @ field_HgUCNn6E|тип_процесса_обработки_данных",
			paramCode: "field_HgUCNn6E",
			schemaFieldUid: processLaborSrc.schemaFieldUid,
			values: [
				{ label: "Пакетный", code: "пакетный", coefficient: 1 },
				{ label: "Потоковый", code: "потоковый", coefficient: 1.25 },
			],
		});
		setLabor(w, [labor], "N × коэф(field_HgUCNn6E)");
		// CSV: Реализуется в Хранилище признаков AND «подключение нового источника»
		ensureTrigger(w, cloneRule(fsTrigger));
		report.updated.push("Подключение источника данных: coeff 1.25 stream");
		report.flags.push(
			'«Подключение источника данных»: CSV component=Объект данных, в snapshot оставлен «Процесс обработки данных» (трудоёмкость — тип процесса). Второго триггера «Хранилище признаков: подключение нового источника данных» в схеме нет.',
		);
	}
}

{
	const w = findPirm(
		snapshot,
		"Сохранение объекта сырых данных в Хранилище признаков",
	);
	if (w && parseLaborSrc && fsTrigger && saveRawTrigger) {
		ensureTrigger(w, cloneRule(fsTrigger));
		ensureTrigger(w, cloneRule(saveRawTrigger), { append: true });
		const labor = byValueLabor({
			paramName:
				"Требуется парсинг сырых данных в Хранилище признаков @ field_w_EN6lWe|требуется_парсинг_сырых_данных",
			paramCode: "field_w_EN6lWe",
			schemaFieldUid: parseLaborSrc.schemaFieldUid,
			values: [
				{ label: "Нет", code: "false", coefficient: 1 },
				{ label: "Да", code: "true", coefficient: 3 },
			],
		});
		setLabor(w, [labor], "N × коэф(field_w_EN6lWe)");
		report.updated.push("Сохранение сырых: парсинг Да→3");
	}
}

/** В движке P[x] = коэфф, не сырое значение → count×range зашиваем в строки коэфф. */
function buildFeatureCountLaborValues() {
	const values = [];
	for (let n = 1; n <= 200; n += 1) {
		let rangeK = 0.4;
		if (n <= 20) rangeK = 1;
		else if (n <= 50) rangeK = 0.7;
		else if (n <= 100) rangeK = 0.5;
		values.push({
			label: String(n),
			code: String(n),
			coefficient: Math.round(n * rangeK * 10000) / 10000,
		});
	}
	return values;
}

{
	const w = findPirm(snapshot, "Разработка Набора признаков");
	if (w && complexityLaborSrc && metricsLaborSrc && fsTrigger) {
		ensureTrigger(w, cloneRule(fsTrigger));
		const metrics = byValueLabor({
			paramName:
				"Количество признаков в Наборе признаков @ metricsCount|количество_признаков",
			paramCode: "metricsCount",
			schemaFieldUid: metricsLaborSrc.schemaFieldUid,
			values: buildFeatureCountLaborValues(),
		});
		const complexity = byValueLabor({
			paramName:
				"Сложность реализации Набора признаков @ field_46LCnfWo|сложность_реализации",
			paramCode: "field_46LCnfWo",
			schemaFieldUid: complexityLaborSrc.schemaFieldUid,
			values: [
				{ label: "Неизвестно", code: "неизвестно", coefficient: 1.15 },
				{ label: "Высокая", code: "высокая", coefficient: 1.25 },
				{ label: "Средняя", code: "средняя", coefficient: 1 },
				{ label: "Низкая", code: "низкая", coefficient: 0.75 },
			],
		});
		setLabor(
			w,
			[metrics, complexity],
			"N × коэф(metricsCount) × коэф(field_46LCnfWo)",
		);
		report.updated.push("Разработка Набора признаков: count×range×complexity");
	}
}

{
	const w = findPirm(snapshot, "Регистрация Признака в Хранилище признаков");
	if (w && metricsLaborSrc && fsTrigger) {
		ensureTrigger(w, cloneRule(fsTrigger));
		w.component = "Объект / Витрина данных";
		const metrics = byValueLabor({
			paramName:
				"Количество признаков в Наборе признаков @ metricsCount|количество_признаков",
			paramCode: "metricsCount",
			schemaFieldUid: metricsLaborSrc.schemaFieldUid,
			values: buildFeatureCountLaborValues(),
		});
		setLabor(w, [metrics], "N × коэф(metricsCount)");
		report.updated.push("Регистрация Признака: count×range, component dataMart");
		const rw = registry.works.find((x) => x.name === w.name);
		if (rw) rw.archComponentType = "Объект / Витрина данных";
	}
}

{
	const w = findPirm(
		snapshot,
		"Создание контроля качества Признаков в Хранилище признаков",
	);
	if (w && fsTrigger && qcTrigger) {
		ensureTrigger(w, cloneRule(fsTrigger));
		ensureTrigger(w, cloneRule(qcTrigger), { append: true });
		setLabor(w, [], "N");
		report.updated.push("Контроль качества признаков: только база, 2 триггера");
	}
}

// ============================================================================
// 5. Marker works
// ============================================================================
{
	const w = findPirm(snapshot, "Настройка проекта и типового шаблона разметки");
	if (w && templateLaborSrc && markerBaseTrigger) {
		ensureTrigger(w, cloneRule(markerBaseTrigger));
		const labor = byValueLabor({
			paramName:
				"Маркер: сложность настройки шаблона разметки данных и подготовки сырых данных для загрузки @ field_wuYlhnu0|сложность_настройки_шаблона_разметки",
			paramCode: "field_wuYlhnu0",
			schemaFieldUid: templateLaborSrc.schemaFieldUid,
			values: [
				{ label: "Низкая", code: "низкая", coefficient: 1 },
				{ label: "Средняя", code: "средняя", coefficient: 1.5 },
				{ label: "Высокая", code: "высокая", coefficient: 2 },
				{ label: "Неизвестно", code: "неизвестно", coefficient: 1 },
			],
		});
		setLabor(w, [labor], "N × коэф(field_wuYlhnu0)");
		report.updated.push("Шаблон разметки: норма→1 / средняя→1.5 / высокая→2");
		report.flags.push(
			'Маркер «норма» в CSV сопоставлен со значением схемы «Низкая» (field_wuYlhnu0).',
		);
	}
}

{
	const name =
		"Добавление новой модели для автоматической разметки данных в ИС 1860, настройка Active Learning";
	const w = findPirm(snapshot, name);
	const complexitySrc = markerNewModelTrigger?.laborCoefficients?.find(
		(c) => c.paramCode === "field_VX7y3PsB",
	);
	const newModelTrig = findPirm(snapshot, name)?.triggerRules?.find(
		(r) => r.paramCode === "field_1bl3dfSX",
	);
	// may not exist yet — look up from any work / craft from known uid
	let newModelRule = newModelTrig;
	if (!newModelRule) {
		// search all
		for (const x of snapshot.typicalWorks) {
			const hit = (x.triggerRules ?? []).find(
				(r) => r.paramCode === "field_1bl3dfSX",
			);
			if (hit) {
				newModelRule = hit;
				break;
			}
		}
	}
	if (w && markerBaseTrigger && complexitySrc) {
		ensureTrigger(w, cloneRule(markerBaseTrigger));
		if (newModelRule) {
			ensureTrigger(w, cloneRule(newModelRule), { append: true });
		} else {
			ensureTrigger(
				w,
				{
					paramName:
						"Маркер: требуется новая модель для автоматической разметки данных @ field_1bl3dfSX|требуется_новая_модель_разметки",
					paramCode: "field_1bl3dfSX",
					schemaFieldUid: "field_1bl3dfSX",
					operator: "=",
					values: ["Да"],
					valueCode: "true",
					valueLabel: "Да",
				},
				{ append: true },
			);
			report.flags.push(
				"field_1bl3dfSX: schemaFieldUid поставлен как paramCode (проверьте uid в схеме).",
			);
		}
		const labor = byValueLabor({
			paramName:
				"Маркер: размер новой модели / сложность подключения @ field_VX7y3PsB|сложность_конфигурации_модели_разметки",
			paramCode: "field_VX7y3PsB",
			schemaFieldUid: complexitySrc.schemaFieldUid,
			values: [
				{ label: "Низкая", code: "низкая", coefficient: 1 },
				{ label: "Средняя", code: "средняя", coefficient: 1.5 },
				{ label: "Высокая", code: "высокая", coefficient: 2 },
				{ label: "Неизвестно", code: "неизвестно", coefficient: 1 },
			],
		});
		setLabor(w, [labor], "N × коэф(field_VX7y3PsB)");
		report.updated.push("Новая модель 1860: один коэфф сложности, 2 триггера");
		report.flags.push(
			"CSV объединяет размер+сложность в один параметр; в схеме использован field_VX7y3PsB (сложность). field_F8GPVM7R убран из формулы.",
		);
	}
}

{
	const name =
		"Реализация регламентной загрузки данных в ИС 1860 и/или экспорта размеченных данных в ИС-потребитель";
	const w = findPirm(snapshot, name);
	let regTrig;
	for (const x of snapshot.typicalWorks) {
		regTrig = (x.triggerRules ?? []).find((r) => r.paramCode === "field_61bkBs0m");
		if (regTrig) break;
	}
	if (w && markerBaseTrigger) {
		ensureTrigger(w, cloneRule(markerBaseTrigger));
		if (regTrig) ensureTrigger(w, cloneRule(regTrig), { append: true });
		else {
			ensureTrigger(
				w,
				{
					paramName:
						"Маркер: требуется регламентный импорт/экспорт данных или отчетности @ field_61bkBs0m|требуется_регламентный_импорт_экспорт",
					paramCode: "field_61bkBs0m",
					schemaFieldUid: "field_61bkBs0m",
					operator: "=",
					values: ["Да"],
					valueCode: "true",
					valueLabel: "Да",
				},
				{ append: true },
			);
		}
		// Нет поля сложности интеграции в схеме — оставляем N и флаг
		setLabor(w, [], "N");
		report.updated.push("Регламентная загрузка: 2 триггера, формула N (нет поля сложности)");
		report.flags.push(
			"Регламентная загрузка: CSV требует коэфф «Сложность реализации интеграции» (норма→1, средняя→1.25, высокая→1.5) — поля в схеме нет. Формула пока N.",
		);
	}
}

{
	const w = findPirm(
		snapshot,
		"Развертывание отдельного экземпляра ИС 1860 под конфиденциальные данные",
	);
	if (w && confTrigger) {
		ensureTrigger(w, cloneRule(confTrigger));
		setLabor(w, [], "N");
		report.updated.push("Развёртывание 1860: trigger ok, labor missing in schema");
		report.flags.push(
			"Развёртывание 1860: CSV коэфф «Правила / сложность развёртывания» (1 / 1.5 / 1.75) — поля в схеме нет. Формула пока N.",
		);
	}
}

{
	const w = findPirm(
		snapshot,
		"Ручная обработка результатов автоматизированной разметки обращений клиентов в случае низкой степени уверенности модели",
	);
	if (w && manualTrigger) {
		ensureTrigger(w, cloneRule(manualTrigger));
		setLabor(w, [], "N");
		report.updated.push("Ручная разметка: trigger ok, labor missing");
		report.flags.push(
			"Ручная разметка: CSV коэфф сложности развёртывания (1 / 1.25 / 1.5) — поля в схеме нет. Формула пока N.",
		);
	}
}

// ============================================================================
// 6. SuperSet — schema fields don't match CSV
// ============================================================================
{
	const w = findPirm(
		snapshot,
		"Визуализация результатов работы модельного сервиса",
	);
	if (w && vizTrigger) {
		const title =
			"Требуется визуализация результатов работы модельного сервиса в SuperSet @ field_KzzDtkB0|требуется_визуализация";
		ensureTrigger(
			w,
			cloneRule(vizTrigger, {
				paramName: title,
			}),
		);
		// Keep two BI fields but flag mismatch — cannot express CSV 0.65/1/1.2
		report.flags.push(
			"SuperSet: CSV один параметр сложности (0.65 / 1 / 1.2). В схеме два поля с другими enum (Тип БД: векторные…; Способ загрузки: Ручной/Автоматизированный). Формулу/коэфф не менял — нужна правка схемы.",
		);
		report.updated.push("Визуализация: trigger title +SuperSet (labor schema gap)");
	}
}

// ============================================================================
// 7. Registry norms for renamed/updated
// ============================================================================
for (const [name, norm] of Object.entries(NORM_UPDATES)) {
	const rw = registry.works.find((x) => x.name === name);
	if (rw) {
		rw.normsByStream = { ...(rw.normsByStream ?? {}), ПиРМ: norm };
	}
}

// Remove deleted from anketa boundWorkIds if present
function stripBoundIds(node, ids) {
	if (!node || typeof node !== "object") return;
	if (Array.isArray(node)) {
		for (const item of node) stripBoundIds(item, ids);
		return;
	}
	if (Array.isArray(node.boundWorkIds)) {
		node.boundWorkIds = node.boundWorkIds.filter((id) => !ids.has(id));
	}
	const opts = node["ui:options"];
	if (opts && Array.isArray(opts.boundWorkIds)) {
		opts.boundWorkIds = opts.boundWorkIds.filter((id) => !ids.has(id));
	}
	for (const v of Object.values(node)) stripBoundIds(v, ids);
}
stripBoundIds(anketa.uiSchema, deleteIds);

// Schema title tweaks (align with parameters CSV where field is the same)
function renameSchemaTitle(schema, key, newTitle) {
	function walk(obj) {
		if (!obj || typeof obj !== "object") return false;
		if (obj.properties?.[key]?.title != null) {
			const prev = obj.properties[key].title;
			if (prev !== newTitle) {
				obj.properties[key].title = newTitle;
				report.schema.push(`${key}: «${prev}» → «${newTitle}»`);
			}
			return true;
		}
		for (const v of Object.values(obj)) {
			if (v && typeof v === "object" && walk(v)) return true;
		}
		return false;
	}
	walk(schema);
}

renameSchemaTitle(
	anketa.jsonSchema,
	"field_JcKtx9Mg",
	"Требуется оркестратор ПИМ",
);
renameSchemaTitle(
	anketa.jsonSchema,
	"field_IGQX_9FN",
	"Требуется логирование ПИМ",
);
renameSchemaTitle(
	anketa.jsonSchema,
	"field_KzzDtkB0",
	"Требуется визуализация результатов работы модельного сервиса в SuperSet",
);
renameSchemaTitle(
	anketa.jsonSchema,
	"field_46LCnfWo",
	"Сложность реализации Набора признаков",
);
renameSchemaTitle(
	anketa.jsonSchema,
	"metricsCount",
	"Количество признаков в Наборе признаков",
);
renameSchemaTitle(
	anketa.jsonSchema,
	"field_w_EN6lWe",
	"Требуется парсинг сырых данных в Хранилище признаков",
);

// Update trigger param names on works that reference renamed titles
for (const w of snapshot.typicalWorks.filter((x) => x.stream === "ПиРМ")) {
	for (const rule of w.triggerRules ?? []) {
		if (rule.paramCode === "field_JcKtx9Mg") {
			rule.paramName =
				"Требуется оркестратор ПИМ @ field_JcKtx9Mg|требуется_оркестратор";
		}
		if (rule.paramCode === "field_IGQX_9FN") {
			rule.paramName =
				"Требуется логирование ПИМ @ field_IGQX_9FN|требуется_логирование_пим";
		}
		if (rule.paramCode === "field_KzzDtkB0") {
			rule.paramName =
				"Требуется визуализация результатов работы модельного сервиса в SuperSet @ field_KzzDtkB0|требуется_визуализация";
		}
	}
	if (w.triggerRules?.length) {
		w.triggerParams = w.triggerRules.map((r) => r.paramName);
		w.triggerParam = w.triggerParams.join(" И ");
	}
}

// Presets: sync titles for same keys if present as string literals
let presets = readFileSync(PRESETS_PATH, "utf8");
const presetRenames = [
	['"title": "Требуется оркестратор"', '"title": "Требуется оркестратор ПИМ"'],
	[
		'"title": "Требуется проработка структуры логов"',
		'"title": "Требуется логирование ПИМ"',
	],
	[
		'"title": "Требуется визуализация результатов работы модельного сервиса"',
		'"title": "Требуется визуализация результатов работы модельного сервиса в SuperSet"',
	],
	['"title": "Сложность реализации"', '"title": "Сложность реализации Набора признаков"'],
	['"title": "Количество признаков"', '"title": "Количество признаков в Наборе признаков"'],
	[
		'"title": "Требуется парсинг сырых данных"',
		'"title": "Требуется парсинг сырых данных в Хранилище признаков"',
	],
];
for (const [from, to] of presetRenames) {
	if (presets.includes(from) && !presets.includes(to)) {
		presets = presets.replaceAll(from, to);
		report.schema.push(`presets: ${from} → ${to}`);
	}
}
writeFileSync(PRESETS_PATH, presets, "utf8");

updateMeta(snapshot);
registry.meta = {
	...registry.meta,
	counts: { ...(registry.meta.counts ?? {}), works: registry.works.length },
};

saveJson(SNAPSHOT_PATH, snapshot);
saveJson(REGISTRY_PATH, registry);
saveJson(ANKETA_PATH, anketa);

console.log(JSON.stringify(report, null, 2));
console.log(
	`\nPIRM works in snapshot: ${snapshot.typicalWorks.filter((w) => w.stream === "ПиРМ").length}`,
);
console.log(`Registry works: ${registry.works.length}`);

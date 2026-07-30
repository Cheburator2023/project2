#!/usr/bin/env python3
"""Repair / create ПиРМ typical works from CSV + real schema bindings."""

from __future__ import annotations

import csv
import json
import re
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SNAPSHOT = (
	ROOT
	/ "apps/nestjs-server/src/modules/anketa-v2/constants/v2-factory-typical-works.snapshot.json"
)
REGISTRY = (
	ROOT
	/ "apps/nestjs-server/src/modules/anketa-v2/constants/v2-factory-template-typical-works.registry.json"
)
ANKETA = (
	ROOT
	/ "apps/nestjs-server/src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json"
)
CSV_PATH = ROOT / "llm" / "типовые работы - ПиРМ.csv"

STREAM = "ПиРМ"

P = {
	"workType": {
		"paramCode": "workType",
		"schemaFieldUid": "field_22ae6d02-b421-41ee-ba8a-5b3153f0f040",
		"paramName": "Тип работ модельного сервиса @ workType|тип_работ",
	},
	"modelRole": {
		"paramCode": "field_VbI-0aiT",
		"schemaFieldUid": "field_0bb82aba-dd87-422f-8824-b97f56159fcf",
		"paramName": "Роль модели @ field_VbI-0aiT|роль_модели",
	},
	"repoPrimary": {
		"paramCode": "field_imxB4YEd",
		"schemaFieldUid": "field_d3b505fd-e708-4ec0-9669-b6352b705d42",
		"paramName": "Первичное подключение ИС к РЕПО @ field_imxB4YEd|первичное_подключение_ис_к_репо",
	},
	"repoStore": {
		"paramCode": "field_kkbRs50S",
		"schemaFieldUid": "field_03128147-5fa6-4163-8aee-5eeadfeb15e9",
		"paramName": "Хранение артефактов в РЕПО @ field_kkbRs50S|хранение_артефактов_в_репо",
	},
	"repoTransfer": {
		"paramCode": "field_r66ph-79",
		"schemaFieldUid": "field_40c7febb-4936-4cb9-9a83-3f95bbf28754",
		"paramName": "Перекладка артефактов между контурами посредством РЕПО @ field_r66ph-79|перекладка_артефактов_между_контурами",
	},
	"repoSxk": {
		"paramCode": "field_Y2S_XRAQ",
		"schemaFieldUid": "field_467bb8b7-95ba-4383-b06b-c42515f9d9d7",
		"paramName": "Использование данных СХК через РЕПО @ field_Y2S_XRAQ|использование_данных_схк_через_репо",
	},
	"autoML": {
		"paramCode": "autoML",
		"schemaFieldUid": "field_8b58cf5d-ea4a-4180-8670-ff2021bcaa9b",
		"paramName": "Необходимость AutoML @ autoML|необходимость_automl",
	},
	"autoMLCode": {
		"paramCode": "field_58TkWuwu",
		"schemaFieldUid": "field_ef1169ba-7832-472a-8043-494ff92c7c57",
		"paramName": "AutoML: встраивание внешнего кода @ field_58TkWuwu|automl_встраивание_внешнего_кода",
	},
	"autoMLTransform": {
		"paramCode": "field_CeBkWcQc",
		"schemaFieldUid": "field_6f650ab1-89c0-4e26-bf4f-b61fb494cde1",
		"paramName": "AutoML: требуется преобразование данных @ field_CeBkWcQc|automl_требуется_преобразование_данных",
	},
	"autoMLRetrain": {
		"paramCode": "field_S23CbRXp",
		"schemaFieldUid": "field_6cf96965-0a42-4e6e-b63d-79d724faf002",
		"paramName": "AutoML: требуется постановка на регламент @ field_S23CbRXp|automl_требуется_постановка_на_регламент",
	},
	"autoMLLib": {
		"paramCode": "field_S41Rqt5E",
		"schemaFieldUid": "field_278b61ee-774f-4e84-9a41-e9ce26c5319f",
		"paramName": "AutoML: требуется новая библиотека @ field_S41Rqt5E|automl_требуется_новая_библиотека",
	},
	"featureStore": {
		"paramCode": "field_lovKvLZc",
		"schemaFieldUid": "field_7e902aa9-dd30-4944-a4ba-b70d14ff7ee1",
		"paramName": "Реализуется в Хранилище признаков @ field_lovKvLZc|реализуется_в_хранилище_признаков",
	},
	"saveRawFs": {
		"paramCode": "field_saveRawFs",
		"schemaFieldUid": "field_a8c3e1d2-4b5f-6789-a0b1-c2d3e4f50607",
		"paramName": "Требуется сохранять сырые данные в Хранилище признаков @ field_saveRawFs|требуется_сохранять_сырые_данные",
	},
	"parseRawFs": {
		"paramCode": "field_w_EN6lWe",
		"schemaFieldUid": "field_5525d556-6cd1-4efa-b10b-0f24ea6c1d96",
		"paramName": "Требуется парсинг сырых данных @ field_w_EN6lWe|требуется_парсинг_сырых_данных",
	},
	"qaFeatures": {
		"paramCode": "field_rZeUo8a_",
		"schemaFieldUid": "field_c7affe0f-873e-42e1-b79a-c29c62b26c0f",
		"paramName": "Требуется контроль качества Признаков @ field_rZeUo8a_|требуется_контроль_качества_признаков",
	},
	"metricsCount": {
		"paramCode": "metricsCount",
		"schemaFieldUid": "field_77f9732b-b562-4e32-b8ff-67d106f17fcf",
		"paramName": "Количество признаков @ metricsCount|количество_признаков",
	},
	"martComplexity": {
		"paramCode": "field_46LCnfWo",
		"schemaFieldUid": "field_9aaf1e8d-e27c-4f48-a631-9f690ea03a07",
		"paramName": "Сложность реализации @ field_46LCnfWo|сложность_реализации",
	},
	"qaSetsCount": {
		"paramCode": "field_Q8DGJNTn",
		"schemaFieldUid": "field_e48e94c0-465e-47de-8a9c-ae8d95ca8d6c",
		"paramName": "Количество контролей качества признаков @ field_Q8DGJNTn|количество_контролей_качества_признаков",
	},
	"processType": {
		"paramCode": "field_HgUCNn6E",
		"schemaFieldUid": "field_553faff6-a347-41a5-8ac7-feab2fc38e46",
		"paramName": "Тип процесса обработки данных @ field_HgUCNn6E|тип_процесса_обработки_данных",
	},
	"marker": {
		"paramCode": "field_DJJtx7nX",
		"schemaFieldUid": "field_8d2fadfa-bffc-48fc-ae01-2e8295462beb",
		"paramName": "Требуется разметка данных источника @ field_DJJtx7nX|требуется_разметка_данных_источника",
	},
	"markerNewModel": {
		"paramCode": "field_1bl3dfSX",
		"schemaFieldUid": "field_9278382f-a3b6-4c1f-88e0-ef31ac39e54b",
		"paramName": "Требуется новая модель для автоматической разметки данных @ field_1bl3dfSX|требуется_новая_модель_разметки",
	},
	"markerImport": {
		"paramCode": "field_61bkBs0m",
		"schemaFieldUid": "field_00e91b78-dcc7-4457-9fc0-f1a45a643c32",
		"paramName": "Требуется регламентный импорт/экспорт данных или отчетности в/из ИС 1860 @ field_61bkBs0m|регламентный_импорт_экспорт_1860",
	},
	"markerSpecial": {
		"paramCode": "field_lDw9gG39",
		"schemaFieldUid": "field_7d161d75-68cc-45be-92d2-2991928b567b",
		"paramName": "Требуются специальные условия хранения и обработки конфиденциальных данных @ field_lDw9gG39|спецусловия_конфиденциальных_данных",
	},
	"markerTemplate": {
		"paramCode": "field_wuYlhnu0",
		"schemaFieldUid": "field_d6554cad-b9ca-4b1e-b885-8868f35e60f5",
		"paramName": "Сложность настройки шаблона разметки данных @ field_wuYlhnu0|сложность_настройки_шаблона_разметки",
	},
	"markerModelSize": {
		"paramCode": "field_F8GPVM7R",
		"schemaFieldUid": "field_ee81cbee-281b-4d15-b478-9b5dffac47aa",
		"paramName": "Размер модели разметки данных @ field_F8GPVM7R|размер_модели_разметки",
	},
	"markerConfig": {
		"paramCode": "field_VX7y3PsB",
		"schemaFieldUid": "field_58353db5-247f-465a-8250-97b4693839bb",
		"paramName": "Сложность конфигурации модели разметки данных @ field_VX7y3PsB|сложность_конфигурации_модели_разметки",
	},
	"manualMarkup": {
		"paramCode": "field_WgK6lIS-",
		"schemaFieldUid": "field_83980706-189a-43ac-a9a3-ebb355fbcf01",
		"paramName": "Требуется ручная обработка результатов автоматизированной разметки данных @ field_WgK6lIS-|ручная_обработка_разметки",
	},
	"viz": {
		"paramCode": "field_KzzDtkB0",
		"schemaFieldUid": "field_031c725e-0b8d-49bb-a44c-61606b62fe4e",
		"paramName": "Требуется визуализация результатов работы модельного сервиса @ field_KzzDtkB0|требуется_визуализация",
	},
	"biLoad": {
		"paramCode": "field_4IL7OStC",
		"schemaFieldUid": "field_2ceb3182-537b-4ffb-80e7-03ff397d61f2",
		"paramName": "Способ загрузки данных в BI-систему @ field_4IL7OStC|способ_загрузки_в_bi",
	},
	"biDb": {
		"paramCode": "field_F7nK-We5",
		"schemaFieldUid": "field_f1d16b7e-c700-40fc-abee-8c7dbad9e6ac",
		"paramName": "Тип БД для BI-системы @ field_F7nK-We5|тип_бд_для_bi",
	},
	"orchestrator": {
		"paramCode": "field_JcKtx9Mg",
		"schemaFieldUid": "field_9c96b450-48ee-4284-b8ea-0419b45812f8",
		"paramName": "Требуется оркестратор @ field_JcKtx9Mg|требуется_оркестратор",
	},
	"logStructure": {
		"paramCode": "field_IGQX_9FN",
		"schemaFieldUid": "field_15e8f2e9-0ea8-46f5-a7d3-59abcb82cb12",
		"paramName": "Требуется проработка структуры логов @ field_IGQX_9FN|требуется_проработка_структуры_логов",
	},
}

ARCH_MAP = {
	"арх. компонент. модельный сервис": "Модельный сервис",
	"модельный сервис": "Модельный сервис",
	"арх. компонент. модель": "Модель",
	"модель": "Модель",
	"арх. компонент. процесс обработки данных": "Процесс обработки данных",
	"процесс обработки данных": "Процесс обработки данных",
	"арх. компонент. объект данных": "Объект / Витрина данных",
	"объект данных": "Объект / Витрина данных",
	"арх. компонент. система-источник": "Система-источник",
	"система-источник": "Система-источник",
}


def ge1(kind: str) -> dict:
	return {
		"kind": kind,
		"steps": [{"count": 1, "coefficient": 1}],
		"combinator": "and",
	}


def rule_true(key: str) -> dict:
	meta = P[key]
	return {
		"paramName": meta["paramName"],
		"paramCode": meta["paramCode"],
		"schemaFieldUid": meta["schemaFieldUid"],
		"operator": "=",
		"values": ["Да"],
		"valueCode": "true",
		"valueLabel": "Да",
	}


def rule_in(key: str, labels: list[str]) -> dict:
	meta = P[key]
	return {
		"paramName": meta["paramName"],
		"paramCode": meta["paramCode"],
		"schemaFieldUid": meta["schemaFieldUid"],
		"operator": "in",
		"values": labels,
		"valueCode": None,
		"valueLabel": None,
	}


def labor_by_value(key: str, values: list[dict]) -> dict:
	meta = P[key]
	return {
		"paramName": meta["paramName"],
		"paramCode": meta["paramCode"],
		"schemaFieldUid": meta["schemaFieldUid"],
		"kind": "by_value",
		"values": values,
	}


def normalize_arch(raw: str) -> str:
	key = re.sub(r"\s+", " ", (raw or "").strip().lower())
	return ARCH_MAP.get(key, raw.strip() or "Модельный сервис")


def parse_norm(raw: str) -> tuple[float | None, str]:
	s = (raw or "").strip().replace(",", ".")
	if not s or s.lower() in {"да", "нет"}:
		return (1.0 if s.lower() == "да" else None), (raw or "").strip()
	try:
		return float(s), (raw or "").strip()
	except ValueError:
		return None, (raw or "").strip()


def formula_from_labors(labors: list[dict]) -> str:
	if not labors:
		return "N"
	parts = ["N"]
	for g in labors:
		parts.append(f"коэф({g['paramCode']})")
	return " × ".join(parts)


def base_work(
	*,
	name: str,
	original: str,
	component: str,
	work_type: str,
	norm: float | None,
	norm_raw: str,
	context: str,
	rules: list[dict],
	arch_count: dict | None,
	labors: list[dict],
) -> dict:
	trigger_params = [r["paramName"] for r in rules]
	return {
		"stream": STREAM,
		"component": component,
		"stage": (context or "").strip(),
		"name": name,
		"originalName": original or name,
		"workType": work_type or "Опциональная",
		"norm": norm,
		"normRaw": norm_raw or ("" if norm is None else str(norm)),
		"triggerParam": trigger_params[0] if trigger_params else "",
		"triggerParams": trigger_params,
		"triggerRules": rules,
		"triggerArchCount": arch_count,
		"triggerMode": "simple",
		"triggerFormula": None,
		"laborParams": [g["paramName"] for g in labors],
		"laborCoefficients": labors,
		"laborArchCounts": [],
		"formulaText": formula_from_labors(labors),
		"roundingMode": "CEIL",
		"roundingStep": 0.1,
	}


COMPLEXITY_VALUES = [
	{"label": "Низкая", "code": "низкая", "coefficient": 0.5},
	{"label": "Средняя", "code": "средняя", "coefficient": 1},
	{"label": "Высокая", "code": "высокая", "coefficient": 1.5},
]


def build_patch_for_row(row: dict) -> dict:
	smart = (row.get("Название в смарт-анкете СУМ") or "").strip()
	original = (row.get("Название оригинальное") or "").strip()
	name = smart or original
	component = normalize_arch(row.get("Арх. Компонент") or "")
	norm, norm_raw = parse_norm(row.get("Наличие норматива") or "")
	trig = (row.get("Параметр-триггер") or "").replace("\n", " ")
	labor_txt = (row.get("Параметры трудоемкости") or "").replace("\n", " ")
	context = (row.get("Контекст") or "").strip()
	work_type = (row.get("Тип работы") or "").strip() or "Опциональная"

	rules: list[dict] = []
	arch_count = None
	labors: list[dict] = []

	tl = trig.lower()

	# Arch-count triggers (order: modelService before bare «Модель»)
	if "модельный сервис" in tl and "признак" not in tl and "тип работ" not in tl:
		arch_count = ge1("modelService")
	elif re.search(r"арх\.\s*компонент\.\s*модель(?!н)", tl) or tl.strip() in {
		"арх. компонент. модель",
		"модель",
	}:
		arch_count = ge1("model")

	# Explicit flags
	if "первичное подключение" in tl and "репо" in tl:
		rules.append(rule_true("repoPrimary"))
	if "хранение артефактов в репо" in tl:
		rules.append(rule_true("repoStore"))
	if "перекладка артефактов" in tl or "перенос артефактов" in tl:
		rules.append(rule_true("repoTransfer"))
	if "схк через репо" in tl or "данных схк" in tl:
		rules.append(rule_true("repoSxk"))
	if "автомл" in tl or "automl" in tl:
		rules.append(rule_true("autoML"))
	if "встраивание внешнего кода" in tl:
		rules.append(rule_true("autoMLCode"))
	if (
		("преобразование данных" in tl and ("автомл" in tl or "automl" in tl))
		or "automl: требуется преобразование" in tl
	):
		rules.append(rule_true("autoMLTransform"))
	if "постановка на регламент" in tl:
		rules.append(rule_true("autoMLRetrain"))
	if "новая библиотека" in tl or "новой библиотеки" in tl or "базовая модель" in tl:
		rules.append(rule_true("autoMLLib"))
	if "хранилище признаков" in tl or (
		"хранил" in tl and "признак" in tl
	):
		rules.append(rule_true("featureStore"))
	if "сохранять сырые" in tl:
		rules.append(rule_true("saveRawFs"))
	if "контроль качества признаков" in tl:
		rules.append(rule_true("qaFeatures"))
	if "разметка данных источника" in tl or "разметка данных источника в маркере" in tl:
		rules.append(rule_true("marker"))
	if "новую модель для автоматической разметки" in tl or "добавить новую модель" in tl:
		rules.append(rule_true("markerNewModel"))
	if "регламентный импорт" in tl or "регламентн" in tl and "маркер" in tl:
		rules.append(rule_true("markerImport"))
	if "специальные условия" in tl or "конфиденциальных данных, не поддерживаемые" in tl:
		rules.append(rule_true("markerSpecial"))
	if "ручная обработка" in tl:
		rules.append(rule_true("manualMarkup"))
	if "визуализация" in tl:
		rules.append(rule_true("viz"))
	if "оркестратор" in tl:
		rules.append(rule_true("orchestrator"))
	if "логирован" in tl:
		rules.append(rule_true("logStructure"))

	# workType triggers
	if "тип работ" in tl:
		labels = []
		if "разработка" in tl:
			labels.append("Разработка")
		if "доработка" in tl:
			labels.append("Доработка")
		if "внедрение" in tl:
			labels.append("Внедрение")
		if labels:
			rules.append(rule_in("workType", labels))
			arch_count = arch_count or ge1("modelService")

	# Deduplicate rules by paramCode
	seen = set()
	uniq_rules = []
	for r in rules:
		code = r["paramCode"]
		if code in seen:
			continue
		seen.add(code)
		uniq_rules.append(r)
	rules = uniq_rules

	# Default arch trigger if nothing else
	if not rules and arch_count is None:
		if component == "Модель":
			arch_count = ge1("model")
		elif component == "Система-источник":
			arch_count = ge1("sourceSystem")
		elif component == "Процесс обработки данных":
			arch_count = ge1("dataProcess")
		elif component == "Объект / Витрина данных":
			arch_count = ge1("dataMart")
		else:
			arch_count = ge1("modelService")

	# Labor from text hints
	ll = labor_txt.lower()
	if "роль модели" in ll:
		labors.append(
			labor_by_value(
				"modelRole",
				[
					{"label": "Основная", "code": "основная", "coefficient": 1},
					{"label": "Вспомогательная", "code": "вспомогательная", "coefficient": 0.5},
					{"label": "Ансамбль", "code": "ансамбль", "coefficient": 1.5},
				],
			)
		)
	if "тип процесса" in ll or "пакетный" in ll:
		labors.append(
			labor_by_value(
				"processType",
				[
					{"label": "Пакетный", "code": "пакетный", "coefficient": 1},
					{"label": "Потоковый", "code": "потоковый", "coefficient": 1.5},
				],
			)
		)
	if "парсинг сырых" in ll:
		labors.append(
			labor_by_value(
				"parseRawFs",
				[
					{"label": "Да", "code": "true", "coefficient": 1.5},
					{"label": "Нет", "code": "false", "coefficient": 1},
				],
			)
		)
	if "количество признаков" in ll and "набор" not in ll:
		labors.append(
			labor_by_value(
				"metricsCount",
				[
					{"label": "до 20", "code": "до_20", "coefficient": 1},
					{"label": "20–50", "code": "20_50", "coefficient": 2},
					{"label": ">50", "code": "50", "coefficient": 3},
				],
			)
		)
	if "сложность реализации набора" in ll or (
		"сложность реализации" in ll and "признак" in ll
	):
		labors.append(labor_by_value("martComplexity", COMPLEXITY_VALUES))
	if "наборов признаков с требованиями к контролю" in ll or "контрол" in ll and "признак" in ll and "количеств" in ll:
		labors.append(
			labor_by_value(
				"qaSetsCount",
				[
					{"label": "1", "code": "1", "coefficient": 1},
					{"label": "2", "code": "2", "coefficient": 2},
					{"label": "3+", "code": "3", "coefficient": 3},
				],
			)
		)
	if "сложность настройки шаблона" in ll:
		labors.append(labor_by_value("markerTemplate", COMPLEXITY_VALUES))
	if "размер новой модели" in ll or "размер модели" in ll:
		labors.append(
			labor_by_value(
				"markerModelSize",
				[
					{"label": "Маленькая", "code": "маленькая", "coefficient": 0.5},
					{"label": "Средняя", "code": "средняя", "coefficient": 1},
					{"label": "Большая", "code": "большая", "coefficient": 1.5},
				],
			)
		)
	if "сложность подключения" in ll or "сложность конфигурации" in ll:
		labors.append(labor_by_value("markerConfig", COMPLEXITY_VALUES))
	if "clickhouse" in ll or "суперсет" in ll or "визуализац" in ll:
		labors.append(
			labor_by_value(
				"biDb",
				[
					{"label": "PostgreSQL", "code": "postgresql", "coefficient": 1},
					{"label": "ClickHouse", "code": "clickhouse", "coefficient": 1.3},
				],
			)
		)
		labors.append(
			labor_by_value(
				"biLoad",
				[
					{"label": "Вручную", "code": "вручную", "coefficient": 1},
					{"label": "По интеграции", "code": "по_интеграции", "coefficient": 1.2},
				],
			)
		)

	# Dedup labors
	seen_l = set()
	uniq_l = []
	for g in labors:
		if g["paramCode"] in seen_l:
			continue
		seen_l.add(g["paramCode"])
		uniq_l.append(g)

	return base_work(
		name=name,
		original=original,
		component=component,
		work_type=work_type,
		norm=norm,
		norm_raw=norm_raw,
		context=context,
		rules=rules,
		arch_count=arch_count,
		labors=uniq_l,
	)


def read_csv_rows() -> list[dict]:
	with CSV_PATH.open(encoding="utf-8-sig", newline="") as f:
		return list(csv.DictReader(f, delimiter=";"))


def match_existing(works: list[dict], name: str, original: str) -> dict | None:
	"""Exact name/originalName only — no fuzzy match (avoids PiRM collisions)."""
	candidates = {c for c in (name, original) if c}
	for w in works:
		if w.get("stream") != STREAM:
			continue
		wn = (w.get("name") or "").strip()
		wo = (w.get("originalName") or "").strip()
		if wn in candidates or wo in candidates:
			return w
	return None


def update_registry(registry: dict, work_id: str, name: str, component: str, norm: float | None) -> None:
	works = registry["works"]
	existing = next((w for w in works if w.get("id") == work_id), None)
	entry = {
		"id": work_id,
		"name": name,
		"archComponentType": component,
		"workType": None,
		"streams": [STREAM],
		"normsByStream": {STREAM: norm if norm is not None else 0},
	}
	if existing:
		existing.update(entry)
	else:
		# avoid duplicate names in stream
		dup = next(
			(
				w
				for w in works
				if STREAM in (w.get("streams") or []) and (w.get("name") or "") == name
			),
			None,
		)
		if dup:
			dup.update(entry)
			return
		works.append(entry)


def patch_anketa_bound_ids(work_ids: list[str]) -> None:
	ank = json.loads(ANKETA.read_text(encoding="utf-8"))
	ui = ank["uiSchema"]
	# find typicalWork block with streamExecutor ПиРМ
	found = False

	def walk(node):
		nonlocal found
		if not isinstance(node, dict):
			return
		opts = node.get("ui:options") or {}
		if (
			opts.get("archComponent") == "typicalWork"
			and opts.get("streamExecutor") == STREAM
		):
			opts["boundWorkIds"] = list(work_ids)
			node["ui:options"] = opts
			found = True
		for k, v in node.items():
			if k.startswith("ui:"):
				continue
			walk(v)

	walk(ui)
	# fallback field_aJEu5ziT
	if not found:
		block = ui.get("field_aJEu5ziT") or {}
		tasks = block.get("sourceTypicalTasks") or {}
		opts = dict(tasks.get("ui:options") or {})
		opts["archComponent"] = "typicalWork"
		opts["streamExecutor"] = STREAM
		opts["boundWorkIds"] = list(work_ids)
		tasks["ui:options"] = opts
		block["sourceTypicalTasks"] = tasks
		ui["field_aJEu5ziT"] = block
	ANKETA.write_text(
		json.dumps(ank, ensure_ascii=False, indent="\t") + "\n",
		encoding="utf-8",
	)


def main() -> None:
	rows = read_csv_rows()
	snap = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
	registry = json.loads(REGISTRY.read_text(encoding="utf-8"))

	pirm_works = [w for w in snap["typicalWorks"] if w.get("stream") == STREAM]
	# id map name->id from registry
	reg_by_name = {
		(w.get("name") or "").strip(): w
		for w in registry["works"]
		if STREAM in (w.get("streams") or [])
	}

	patched = 0
	created = 0
	seen_names: set[str] = set()

	for row in rows:
		patch = build_patch_for_row(row)
		name = patch["name"]
		if name in seen_names:
			print("SKIP duplicate CSV name:", name[:80])
			continue
		seen_names.add(name)

		existing = match_existing(pirm_works, name, patch["originalName"])
		if existing:
			for k, v in patch.items():
				existing[k] = v
			existing["stream"] = STREAM
			# keep stable linkage via registry name
			rid = None
			for reg in registry["works"]:
				if STREAM in (reg.get("streams") or []) and (
					reg.get("name") == existing["name"]
					or reg.get("name") == patch["originalName"]
					or reg.get("name") == name
				):
					rid = reg["id"]
					update_registry(
						registry,
						rid,
						existing["name"],
						existing["component"],
						existing.get("norm"),
					)
					break
			if rid is None and name in reg_by_name:
				rid = reg_by_name[name]["id"]
				update_registry(
					registry,
					rid,
					existing["name"],
					existing["component"],
					existing.get("norm"),
				)
			patched += 1
		else:
			# create new catalog row
			new_id = str(uuid.uuid4())
			snap["typicalWorks"].append(patch)
			pirm_works.append(patch)
			update_registry(
				registry,
				new_id,
				patch["name"],
				patch["component"],
				patch.get("norm"),
			)
			created += 1

	# Deduplicate snapshot PiRM by name (keep first)
	kept = []
	seen = set()
	removed = 0
	for w in snap["typicalWorks"]:
		if w.get("stream") != STREAM:
			kept.append(w)
			continue
		n = (w.get("name") or "").strip()
		if n in seen:
			removed += 1
			continue
		seen.add(n)
		kept.append(w)
	snap["typicalWorks"] = kept

	# bound ids = all registry ПиРМ ids
	pirm_ids = [
		w["id"]
		for w in registry["works"]
		if STREAM in (w.get("streams") or [])
	]
	# meta counts
	streams = sorted(
		{w.get("stream") for w in snap["typicalWorks"] if w.get("stream")}
	)
	meta = dict(snap.get("meta") or {})
	counts = dict(meta.get("counts") or {})
	counts["typicalWorks"] = len(snap["typicalWorks"])
	meta["counts"] = counts
	meta["streams"] = streams
	snap["meta"] = meta

	SNAPSHOT.write_text(
		json.dumps(snap, ensure_ascii=False, indent="\t") + "\n",
		encoding="utf-8",
	)
	REGISTRY.write_text(
		json.dumps(registry, ensure_ascii=False, indent="\t") + "\n",
		encoding="utf-8",
	)
	patch_anketa_bound_ids(pirm_ids)

	print(f"patched: {patched}, created: {created}, dedup_removed: {removed}")
	print(f"pirm registry ids: {len(pirm_ids)}")
	print(f"pirm snapshot works: {sum(1 for w in snap['typicalWorks'] if w.get('stream')==STREAM)}")


if __name__ == "__main__":
	main()

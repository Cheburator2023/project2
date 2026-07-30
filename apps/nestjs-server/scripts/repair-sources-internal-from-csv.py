#!/usr/bin/env python3
"""Repair «Источники данных» internal works (этапы 210/211/212) from CSV + real schema."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SNAPSHOT = (
	ROOT
	/ "apps/nestjs-server/src/modules/anketa-v2/constants/v2-factory-typical-works.snapshot.json"
)

STREAM = "Источники данных"

# Real schemaFieldUid from factory anketa.
P = {
	"type": {
		"paramCode": "type",
		"schemaFieldUid": "field_f0070137-09a8-432a-bd47-dd6e901d8cb2",
		"paramName": "Тип системы-источника @ type|тип_системы_источника",
	},
	"replica": {
		"paramCode": "field_8pFvwc-v",
		"schemaFieldUid": "field_f1bda400-9a8d-4ee0-b3ac-f4f73549792a",
		"paramName": "Наличие реплики в DAPP @ field_8pFvwc-v|наличие_реплики_в_dapp",
	},
	"clarify": {
		"paramCode": "field_xva1dRvW",
		"schemaFieldUid": "field_0845a1af-f430-4897-9300-4a3c580aa6ee",
		"paramName": "Необходимо уточнение требований по составу выгружаемых данных и алгоритмам расчета метрик @ field_xva1dRvW|необходимо_уточнение_требований_по_составу_выгружаемых_данных_и_алгоритмам_расче",
	},
	"extraSourcesRisk": {
		"paramCode": "field_whHc-OoW",
		"schemaFieldUid": "field_7464bec8-4d2e-4360-a38c-447fd0342be9",
		"paramName": "Риск появления дополнительных систем-источников @ field_whHc-OoW|риск_появления_дополнительных_систем_источников",
	},
	"complexity": {
		"paramCode": "field_UEzs5Q87",
		"schemaFieldUid": "field_aa1dc517-1277-4ca5-ad9f-ed0bb8a9efe6",
		"paramName": "Сложность реализации @ field_UEzs5Q87|сложность_реализации",
	},
	"productization": {
		"paramCode": "field_x-1d7wUh",
		"schemaFieldUid": "field_76bc5061-e89b-494f-a8e5-40e747ba45d6",
		"paramName": "Необходима продуктивизация @ field_x-1d7wUh|необходима_продуктивизация",
	},
	"processWorkType": {
		"paramCode": "field_yJ51GkCR",
		"schemaFieldUid": "field_68f5a4fa-579f-4b89-b4f3-11214957dffe",
		"paramName": "Тип работ @ field_yJ51GkCR|тип_работ",
	},
	"integration": {
		"paramCode": "field_qMxSfHk1",
		"schemaFieldUid": "field_2eeb9751-22b7-4545-afeb-75bc4c7ec74e",
		"paramName": "Требуется интеграция с промежуточной системой (СХК, СФП и др.) @ field_qMxSfHk1|требуется_интеграция_с_промежуточной_системой_схк_сфп_и_др",
	},
	"martWorkType": {
		"paramCode": "workType",
		"schemaFieldUid": "field_6f91d0c5-3949-4468-88e9-29741af2b07d",
		"paramName": "Тип работ @ workType|тип_работ",
	},
	"metrics": {
		"paramCode": "field_28IPlEQu",
		"schemaFieldUid": "field_e03806f6-01f4-44ee-835a-e9e5bae8f6c6",
		"paramName": "Количество метрик @ field_28IPlEQu|количество_метрик",
	},
}


def labor(key: str, values: list[dict]) -> dict:
	meta = P[key]
	return {
		"paramName": meta["paramName"],
		"paramCode": meta["paramCode"],
		"schemaFieldUid": meta["schemaFieldUid"],
		"kind": "by_value",
		"values": values,
	}


def rule_eq(key: str, label: str, code: str) -> dict:
	meta = P[key]
	return {
		"paramName": meta["paramName"],
		"paramCode": meta["paramCode"],
		"schemaFieldUid": meta["schemaFieldUid"],
		"operator": "=",
		"values": [label],
		"valueCode": code,
		"valueLabel": label,
	}


def source_arch_steps() -> list[dict]:
	"""≤5 → 1; >5 → N/5 (expanded for formulaText display)."""
	steps = [{"count": n, "coefficient": 1} for n in range(1, 6)]
	for n in range(6, 21):
		steps.append({"count": n, "coefficient": round(n / 5, 4)})
	return steps


def source_arch_labor() -> dict:
	return {
		"kind": "sourceSystem",
		"paramName": "Кол-во арх. компонентов «Система-Источник»",
		"steps": [
			{"count": 5, "coefficient": 1, "operator": "<="},
			{
				"count": 5,
				"coefficient": 1,
				"operator": ">",
				"coefficientFormula": "N/5",
			},
		],
	}


def fmt_source_arch() -> str:
	parts = []
	for s in source_arch_steps():
		c = s["coefficient"]
		c_s = str(c).replace(".", ",")
		parts.append(f"{s['count']}={c_s}")
	return f"архкоэф(Система-источник; {'; '.join(parts)})"


SOURCE_ARCH = fmt_source_arch()

INTERNAL = rule_eq("type", "Внутренний", "внутренний")
PRODUCTIZATION = rule_eq("productization", "Да", "true")

# CSV «Без изменений» → в схеме dataProcess.workType = «Настройка»
PROCESS_WORK_TYPE_VALUES = [
	{"label": "Настройка", "code": "настройка", "coefficient": 0.5},
	{"label": "Доработка", "code": "доработка", "coefficient": 0.8},
	{"label": "Разработка", "code": "разработка", "coefficient": 1},
]

MART_WORK_TYPE_VALUES = [
	{"label": "Разработка", "code": "разработка", "coefficient": 1},
	{"label": "Доработка", "code": "доработка", "coefficient": 1},
	{"label": "Настройка", "code": "настройка", "coefficient": 1},
]

PATCHES: dict[str, dict] = {
	"Этап 210|Исследование и описание внутренних источников, выгрузка тестовых данных, мониторинг изменений источников": {
		"component": "Система-источник",
		"norm": 14,
		"normRaw": "14",
		"triggerParam": P["type"]["paramName"],
		"triggerParams": [P["type"]["paramName"]],
		"triggerRules": [INTERNAL],
		"triggerArchCount": None,
		"triggerMode": "simple",
		"triggerFormula": None,
		"laborParams": [
			P["replica"]["paramName"],
			P["clarify"]["paramName"],
			P["extraSourcesRisk"]["paramName"],
		],
		"laborCoefficients": [
			labor(
				"replica",
				[
					{"label": "Да", "code": "да", "coefficient": 1},
					{"label": "Нет", "code": "нет", "coefficient": 1.5},
				],
			),
			labor(
				"clarify",
				[
					{"label": "Да", "code": "да", "coefficient": 0.3},
					{"label": "Нет", "code": "нет", "coefficient": 1},
				],
			),
			labor(
				"extraSourcesRisk",
				[
					{"label": "Да", "code": "да", "coefficient": 1.5},
					{"label": "Нет", "code": "нет", "coefficient": 1},
				],
			),
		],
		"laborArchCounts": [],
		"formulaText": "N × (коэф(field_8pFvwc-v) + коэф(field_xva1dRvW) + коэф(field_whHc-OoW))",
		"roundingMode": "CEIL",
		"roundingStep": 0.1,
	},
	"Этап 211|Разработка БТ (ТР) на реализацию процесса загрузки данных для внутренних данных": {
		"component": "Процесс обработки данных",
		"norm": 22,
		"normRaw": "22",
		"triggerParam": P["type"]["paramName"],
		"triggerParams": [P["type"]["paramName"]],
		"triggerRules": [INTERNAL],
		"triggerArchCount": None,
		"triggerMode": "simple",
		"triggerFormula": None,
		"laborParams": [P["complexity"]["paramName"]],
		"laborCoefficients": [
			labor(
				"complexity",
				[
					{"label": "Низкая", "code": "низкая", "coefficient": 0.5},
					{"label": "Средняя", "code": "средняя", "coefficient": 0.8},
					{"label": "Высокая", "code": "высокая", "coefficient": 1.2},
					{"label": "Неизвестно", "code": "неизвестно", "coefficient": 1.5},
				],
			),
		],
		"laborArchCounts": [source_arch_labor()],
		"formulaText": f"N × коэф(field_UEzs5Q87) + N × {SOURCE_ARCH}",
		"roundingMode": "CEIL",
		"roundingStep": 0.1,
	},
	"Этап 211|Разработка БТ (ТР) на реализацию витрины для внутренних данных": {
		"component": "Объект / Витрина данных",
		"norm": 22,
		"normRaw": "22",
		"triggerParam": P["type"]["paramName"],
		"triggerParams": [P["type"]["paramName"]],
		"triggerRules": [INTERNAL],
		"triggerArchCount": None,
		"triggerMode": "simple",
		"triggerFormula": None,
		"laborParams": [P["clarify"]["paramName"]],
		"laborCoefficients": [
			# CSV / баг: только Да/Нет (без «Неизвестно»)
			labor(
				"clarify",
				[
					{"label": "Да", "code": "да", "coefficient": 10},
					{"label": "Нет", "code": "нет", "coefficient": 1},
				],
			),
		],
		"laborArchCounts": [source_arch_labor()],
		"formulaText": f"N × {SOURCE_ARCH} + N × коэф(field_xva1dRvW)",
		"roundingMode": "CEIL",
		"roundingStep": 0.1,
	},
	"Этап 212|Реализация процесса загрузки внутренних данных в Платформу данных для целей моделирования": {
		"component": "Процесс обработки данных",
		"norm": 22,
		"normRaw": "22",
		"triggerParam": P["type"]["paramName"],
		"triggerParams": [P["type"]["paramName"], P["productization"]["paramName"]],
		"triggerRules": [INTERNAL, PRODUCTIZATION],
		"triggerArchCount": None,
		"triggerMode": "simple",
		"triggerFormula": None,
		"laborParams": [
			P["processWorkType"]["paramName"],
			P["integration"]["paramName"],
		],
		"laborCoefficients": [
			labor("processWorkType", PROCESS_WORK_TYPE_VALUES),
			labor(
				"integration",
				[
					{"label": "Да", "code": "да", "coefficient": 1.5},
					{"label": "Нет", "code": "нет", "coefficient": 1},
				],
			),
		],
		"laborArchCounts": [],
		"formulaText": "N × (коэф(field_yJ51GkCR) + коэф(field_qMxSfHk1))",
		"roundingMode": "CEIL",
		"roundingStep": 0.1,
	},
	"Этап 212|Реализация витрины внутренних данных в Платформе данных для целей моделирования": {
		"component": "Объект / Витрина данных",
		"norm": 22,
		"normRaw": "22",
		"triggerParam": P["type"]["paramName"],
		"triggerParams": [P["type"]["paramName"], P["productization"]["paramName"]],
		"triggerRules": [INTERNAL, PRODUCTIZATION],
		"triggerArchCount": None,
		"triggerMode": "simple",
		"triggerFormula": None,
		"laborParams": [
			P["martWorkType"]["paramName"],
			P["metrics"]["paramName"],
		],
		"laborCoefficients": [
			labor("martWorkType", MART_WORK_TYPE_VALUES),
			labor(
				"metrics",
				[
					{"label": "до 20", "code": "до_20", "coefficient": 0},
					{"label": "20–50", "code": "20_50", "coefficient": 0.2},
					{"label": ">50", "code": "50", "coefficient": 0.4},
				],
			),
		],
		"laborArchCounts": [],
		"formulaText": "N × (коэф(workType) + коэф(field_28IPlEQu))",
		"roundingMode": "CEIL",
		"roundingStep": 0.1,
	},
}


def main() -> None:
	snap = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
	patched = 0
	missing: list[str] = []
	for w in snap["typicalWorks"]:
		if w.get("stream") != STREAM:
			continue
		key = f"{w.get('stage')}|{w.get('name')}"
		patch = PATCHES.get(key)
		if not patch:
			continue
		for k, v in patch.items():
			w[k] = v
		w["stream"] = STREAM
		patched += 1

	expected = set(PATCHES)
	found = {
		f"{w.get('stage')}|{w.get('name')}"
		for w in snap["typicalWorks"]
		if w.get("stream") == STREAM and f"{w.get('stage')}|{w.get('name')}" in PATCHES
	}
	missing = sorted(expected - found)

	SNAPSHOT.write_text(
		json.dumps(snap, ensure_ascii=False, indent="\t") + "\n",
		encoding="utf-8",
	)
	print(f"patched: {patched}")
	if missing:
		print("MISSING:", missing)


if __name__ == "__main__":
	main()

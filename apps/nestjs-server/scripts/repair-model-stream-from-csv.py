#!/usr/bin/env python3
"""Repair factory model-stream typical works from CSV + real schema field bindings."""

from __future__ import annotations

import json
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

MODEL_STREAM = "Модельный стрим"

# Real schemaFieldUid from factory anketa uiSchema / existing snapshot bindings.
P = {
	"complexity": {
		"paramCode": "complexity",
		"schemaFieldUid": "field_61a51b98-b6a8-47c9-aa27-74ff2219513f",
		"paramName": "Регуляторные требования @ complexity|регуляторные_требования",
	},
	"overallUncertainty": {
		"paramCode": "overallUncertainty",
		"schemaFieldUid": "field_0a089432-ff45-4f1d-90be-13040532bde3",
		"paramName": "Общая неопределённость @ overallUncertainty|общая_неопредел_нность",
	},
	"readyPromReports": {
		"paramCode": "readyPromReports",
		"schemaFieldUid": "field_12d42005-7d15-4d0f-9aa0-2b6eebc596c8",
		"paramName": "Наличие готовых промышленных витрин @ readyPromReports|наличие_готовых_промышленных_витрин",
	},
	"assessedInitiativesCount": {
		"paramCode": "assessedInitiativesCount",
		"schemaFieldUid": "field_89bf48ee-4f44-4995-86fa-5cb1132abe63",
		"paramName": "Количество оцениваемых инициатив @ assessedInitiativesCount|количество_оцениваемых_инициатив",
	},
	"mvp": {
		"paramCode": "field_o_HRj6VO",
		"schemaFieldUid": "field_eb6300e7-8889-40bf-92a1-0c8a778de8ef",
		"paramName": "Необходимость пилота (MVP) @ field_o_HRj6VO|необходимость_пилота_mvp",
	},
	"prePromEval": {
		"paramCode": "prePromEval",
		"schemaFieldUid": "field_7ff20c0a-1cd7-4d66-99ae-b52ed1a9bb3a",
		"paramName": "Необходимость поддержки проведения пилота @ prePromEval|необходимость_поддержки_проведения_пилота",
	},
	"autoML": {
		"paramCode": "autoML",
		"schemaFieldUid": "field_8b58cf5d-ea4a-4180-8670-ff2021bcaa9b",
		"paramName": "Необходимость AutoML @ autoML|необходимость_automl",
	},
	"algorithmType": {
		"paramCode": "algorithmType",
		"schemaFieldUid": "field_bd100464-101d-4d4e-8096-751dab52e01f",
		"paramName": "Сложность алгоритма / тип ML задачи @ algorithmType|сложность_алгоритма_тип_ml_задачи",
	},
	"productionAdditionalReports": {
		"paramCode": "productionAdditionalReports",
		"schemaFieldUid": "field_d2a78102-57a7-4f7e-aad2-0cb015948496",
		"paramName": "Необходимость продуктивизации и количество дополнительных витрин @ productionAdditionalReports|необходимость_продуктивизации_и_количество_дополнительных_витрин",
	},
	"channels": {
		"paramCode": "field_jUm5syZf",
		"schemaFieldUid": "field_4fb7d302-c5f0-49e6-9cd2-959a1fbe1f4e",
		"paramName": "Каналы внедрения @ field_jUm5syZf|каналы_внедрения",
	},
	"workType": {
		"paramCode": "workType",
		"schemaFieldUid": "field_22ae6d02-b421-41ee-ba8a-5b3153f0f040",
		"paramName": "Тип работ модельного сервиса @ workType|тип_работ",
	},
}


def ge1(kind: str) -> dict:
	# coefficient=1 encodes operator ">="
	return {"kind": kind, "steps": [{"count": 1, "coefficient": 1}], "combinator": "and"}


def model_steps(max_n: int = 15) -> list[dict]:
	return [
		{"count": n, "coefficient": round(1 + (n - 1) * 0.75, 4)} for n in range(1, max_n + 1)
	]


def source_steps() -> list[dict]:
	base = {
		1: 1,
		2: 1.2,
		3: 1.4,
		4: 1.6,
		5: 1.8,
		6: 2,
		7: 2.2,
		8: 2.4,
		9: 2.6,
		10: 3,
	}
	return [{"count": k, "coefficient": v} for k, v in base.items()]


def fmt_arch(label: str, steps: list[dict]) -> str:
	parts = []
	for s in steps:
		c = s["coefficient"]
		c_s = str(c).replace(".", ",")
		parts.append(f"{s['count']}={c_s}")
	return f"архкоэф({label}; {'; '.join(parts)})"


def labor_by_value(key: str, values: list[dict], kind: str = "by_value") -> dict:
	meta = P[key]
	return {
		"paramName": meta["paramName"],
		"paramCode": meta["paramCode"],
		"schemaFieldUid": meta["schemaFieldUid"],
		"kind": kind,
		"values": values,
	}


def rule_eq(key: str, label: str, code: str | None = None) -> dict:
	meta = P[key]
	return {
		"paramName": meta["paramName"],
		"paramCode": meta["paramCode"],
		"schemaFieldUid": meta["schemaFieldUid"],
		"operator": "=",
		"values": [label],
		"valueCode": code if code is not None else label,
		"valueLabel": label,
	}


def rule_neq(key: str, label: str, code: str) -> dict:
	meta = P[key]
	return {
		"paramName": meta["paramName"],
		"paramCode": meta["paramCode"],
		"schemaFieldUid": meta["schemaFieldUid"],
		"operator": "!=",
		"values": [label],
		"valueCode": code,
		"valueLabel": label,
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


def rule_presence(key: str) -> dict:
	meta = P[key]
	return {
		"paramName": meta["paramName"],
		"paramCode": meta["paramCode"],
		"schemaFieldUid": meta["schemaFieldUid"],
		"operator": "=",
		"values": [],
		"valueCode": None,
		"valueLabel": None,
	}


def complexity_values() -> list[dict]:
	return [
		{"label": "1", "code": "1", "coefficient": 1},
		{"label": "2", "code": "2", "coefficient": 1.25},
		{"label": "3", "code": "3", "coefficient": 1.5},
		{"label": "4", "code": "4", "coefficient": 1.75},
		{"label": "5", "code": "5", "coefficient": 2},
	]


def ready_values() -> list[dict]:
	return [
		{"label": "Да", "code": "да", "coefficient": 0.5},
		{"label": "Нет", "code": "нет", "coefficient": 1},
	]


def algorithm_values() -> list[dict]:
	# Labels match schema enum on detailInfo.modelsList.items.algorithmType
	return [
		{"label": "Табличные данные", "code": "табличные_данные", "coefficient": 0.75},
		{
			"label": "Текстовая аналитика — Классические модели",
			"code": "текстовая_аналитика_классические_модели",
			"coefficient": 1.25,
		},
		{
			"label": "Текстовая аналитика — LLM",
			"code": "текстовая_аналитика_llm",
			"coefficient": 1.4,
		},
		{"label": "Аудио-аналитика", "code": "аудио_аналитика", "coefficient": 1.6},
		{"label": "Компьютерное зрение", "code": "компьютерное_зрение", "coefficient": 1.8},
		{
			"label": "Оптимизационная задача",
			"code": "оптимизационная_задача",
			"coefficient": 2.5,
		},
		{"label": "Гео-аналитика", "code": "гео_аналитика", "coefficient": 3},
		{"label": "Графовая аналитика", "code": "графовая_аналитика", "coefficient": 3.5},
	]


def initiative_values() -> list[dict]:
	# Multiply by 1/n ≈ divide (n<=1 → 1)
	out = []
	for n in range(1, 100):
		coeff = 1.0 if n <= 1 else round(1 / n, 2)
		out.append({"label": str(n), "code": str(n), "coefficient": coeff})
	return out


def production_values() -> list[dict]:
	# CSV: Не требуется→0; 1→1; далее K = 1+(N−1)×0.75
	out = [{"label": "Не требуется", "code": "не_требуется", "coefficient": 0}]
	for n in range(1, 100):
		coeff = 1.0 if n == 1 else round(1 + (n - 1) * 0.75, 4)
		out.append({"label": str(n), "code": str(n), "coefficient": coeff})
	return out


def channel_values() -> list[dict]:
	# Labels aligned with generalInfo.modelService.field_jUm5syZf schema enum
	return [
		{"label": "Не требуется", "code": "не_требуется", "coefficient": 0},
		{"label": "Батч", "code": "батч", "coefficient": 0.5},
		{
			"label": "Батч + загрузка данных потребителю",
			"code": "батч_загрузка_данных_потребителю",
			"coefficient": 0.75,
		},
		{"label": "Батч + Онлайн", "code": "батч_онлайн", "coefficient": 1.2},
		{"label": "Онлайн", "code": "онлайн", "coefficient": 1.0},
		{"label": "Онлайн gpu", "code": "онлайн_gpu", "coefficient": 1.25},
		{"label": "Стриминг", "code": "стриминг", "coefficient": 1.5},
		{
			"label": "Мобильные устройства",
			"code": "мобильные_устройства",
			"coefficient": 1.75,
		},
		{"label": "LLM", "code": "llm", "coefficient": 2.0},
		{"label": "Гео-сервисы", "code": "гео_сервисы", "coefficient": 2.25},
		{"label": "Внедрение в облаке", "code": "внедрение_в_облаке", "coefficient": 2.5},
		{"label": "Графовая платформа", "code": "графовая_платформа", "coefficient": 3.0},
	]


def empty_ou() -> dict:
	return labor_by_value("overallUncertainty", [])


def arch_token(kind: str) -> dict:
	return {
		"kind": "arch_count",
		"archComponentKind": kind,
		"steps": [{"count": 1, "coefficient": 1}],
	}


def param_token(key: str, operator: str, *, label: str | None = None, code: str | None = None, values: list[dict] | None = None) -> dict:
	meta = P[key]
	tok: dict = {
		"kind": "param",
		"paramCode": meta["paramCode"],
		"paramName": meta["paramName"],
		"schemaFieldUid": meta["schemaFieldUid"],
		"operator": operator,
	}
	if values is not None:
		tok["values"] = values
	else:
		tok["valueCode"] = code
		tok["valueLabel"] = label
	return tok


def formula(tokens: list[dict], text: str) -> dict:
	return {"tokens": tokens, "text": text}


MODEL_ARCH = fmt_arch("Модели", model_steps())
SOURCE_ARCH = fmt_arch("Система-источник", source_steps())

# stage key → patch
PATCHES: dict[str, dict] = {
	"01|Постановка задачи": {
		"component": "Модель",
		"triggerParam": "",
		"triggerParams": [],
		"triggerRules": [],
		"triggerArchCount": ge1("model"),
		"triggerMode": "simple",
		"triggerFormula": None,
		"laborParams": [
			P["complexity"]["paramName"],
			P["overallUncertainty"]["paramName"],
			P["readyPromReports"]["paramName"],
		],
		"laborCoefficients": [
			labor_by_value("complexity", complexity_values()),
			empty_ou(),
			labor_by_value("readyPromReports", ready_values()),
		],
		"laborArchCounts": [
			{"kind": "model", "paramName": "Кол-во моделей", "steps": model_steps()}
		],
		"formulaText": f"N × {MODEL_ARCH} × коэф(complexity) × коэф(overallUncertainty) × коэф(readyPromReports)",
	},
	"02|Поиск данных": {
		"component": "Система-источник",
		"triggerParam": P["readyPromReports"]["paramName"],
		"triggerParams": [P["readyPromReports"]["paramName"]],
		"triggerRules": [rule_eq("readyPromReports", "Нет", "false")],
		"triggerArchCount": {**ge1("sourceSystem"), "combinator": "and"},
		"triggerMode": "simple",
		"triggerFormula": None,
		"laborParams": [
			P["overallUncertainty"]["paramName"],
			P["assessedInitiativesCount"]["paramName"],
		],
		"laborCoefficients": [
			empty_ou(),
			labor_by_value("assessedInitiativesCount", initiative_values()),
		],
		"laborArchCounts": [
			{
				"kind": "sourceSystem",
				"paramName": "Кол-во источников для проработки",
				"steps": source_steps(),
			}
		],
		"formulaText": f"N × коэф(overallUncertainty) × {SOURCE_ARCH} × коэф(assessedInitiativesCount)",
	},
	"04|Построение витрины для разработки": {
		"component": "Объект / Витрина данных",
		"triggerParam": P["readyPromReports"]["paramName"],
		"triggerParams": [P["readyPromReports"]["paramName"]],
		"triggerRules": [rule_eq("readyPromReports", "Нет", "false")],
		"triggerArchCount": {**ge1("dataMart"), "combinator": "and"},
		"triggerMode": "simple",
		"triggerFormula": None,
		"laborParams": [
			P["complexity"]["paramName"],
			P["overallUncertainty"]["paramName"],
			P["assessedInitiativesCount"]["paramName"],
		],
		"laborCoefficients": [
			labor_by_value("complexity", complexity_values()),
			empty_ou(),
			labor_by_value("assessedInitiativesCount", initiative_values()),
		],
		"laborArchCounts": [],
		"formulaText": "N × коэф(complexity) × коэф(overallUncertainty) × коэф(assessedInitiativesCount)",
	},
	"05A|Разработка пилотной модели (MVP)": {
		"component": "Модель",
		"triggerParam": P["mvp"]["paramName"],
		"triggerParams": [P["mvp"]["paramName"]],
		"triggerRules": [rule_eq("mvp", "Да", "true")],
		"triggerArchCount": {**ge1("modelService"), "combinator": "and"},
		"triggerMode": "simple",
		"triggerFormula": None,
		"laborParams": [
			P["complexity"]["paramName"],
			P["overallUncertainty"]["paramName"],
			P["readyPromReports"]["paramName"],
			P["algorithmType"]["paramName"],
		],
		"laborCoefficients": [
			labor_by_value("complexity", complexity_values()),
			empty_ou(),
			labor_by_value("readyPromReports", ready_values()),
			labor_by_value("algorithmType", algorithm_values()),
		],
		"laborArchCounts": [
			{"kind": "model", "paramName": "Кол-во моделей", "steps": model_steps()}
		],
		"formulaText": f"N × {MODEL_ARCH} × коэф(complexity) × коэф(overallUncertainty) × коэф(readyPromReports) × коэф(algorithmType)",
	},
	"05|Разработка модели": {
		"component": "Модель",
		"triggerParam": "",
		"triggerParams": [],
		"triggerRules": [],
		"triggerArchCount": ge1("model"),
		"triggerMode": "simple",
		"triggerFormula": None,
		"laborParams": [
			P["complexity"]["paramName"],
			P["overallUncertainty"]["paramName"],
			P["readyPromReports"]["paramName"],
			P["algorithmType"]["paramName"],
		],
		"laborCoefficients": [
			labor_by_value("complexity", complexity_values()),
			empty_ou(),
			labor_by_value("readyPromReports", ready_values()),
			labor_by_value("algorithmType", algorithm_values()),
		],
		"laborArchCounts": [
			{"kind": "model", "paramName": "Кол-во моделей", "steps": model_steps()}
		],
		"formulaText": f"N × {MODEL_ARCH} × коэф(complexity) × коэф(overallUncertainty) × коэф(readyPromReports) × коэф(algorithmType)",
	},
	"AutoML|разработка": {
		"component": "Модель",
		"triggerParam": P["autoML"]["paramName"],
		"triggerParams": [P["autoML"]["paramName"], P["workType"]["paramName"]],
		"triggerRules": [
			rule_eq("autoML", "Да", "true"),
			rule_in("workType", ["Разработка", "Разработка и внедрение"]),
		],
		"triggerArchCount": {**ge1("modelService"), "combinator": "and"},
		"triggerMode": "simple",
		"triggerFormula": None,
		"laborParams": [
			P["complexity"]["paramName"],
			P["overallUncertainty"]["paramName"],
		],
		"laborCoefficients": [
			labor_by_value("complexity", complexity_values()),
			empty_ou(),
		],
		"laborArchCounts": [
			{"kind": "model", "paramName": "Кол-во моделей", "steps": model_steps()}
		],
		"formulaText": f"N × {MODEL_ARCH} × коэф(complexity) × коэф(overallUncertainty)",
	},
	"05B|Пилотирование модели": {
		"component": "Модельный сервис",
		"triggerMode": "formula",
		"triggerFormula": formula(
			[
				arch_token("modelService"),
				{"kind": "logic", "op": "and"},
				param_token("mvp", "=", label="Да", code="true"),
				{"kind": "logic", "op": "and"},
				param_token("prePromEval", "=", label="Да", code="true"),
				{"kind": "logic", "op": "and"},
				arch_token("model"),
			],
			"Модельный сервис ≥ 1 И Необходимость пилота (MVP) = Да И Необходимость поддержки проведения пилота = Да И Модель ≥ 1",
		),
		"triggerParam": P["prePromEval"]["paramName"],
		"triggerParams": [
			P["mvp"]["paramName"],
			P["prePromEval"]["paramName"],
		],
		"triggerRules": [
			rule_eq("mvp", "Да", "true"),
			rule_eq("prePromEval", "Да", "true"),
		],
		# kept for simple-mode fallback / UI display; formula mode is authoritative
		"triggerArchCount": {**ge1("modelService"), "combinator": "and"},
		"laborParams": [
			P["overallUncertainty"]["paramName"],
			P["readyPromReports"]["paramName"],
		],
		"laborCoefficients": [
			empty_ou(),
			labor_by_value("readyPromReports", ready_values()),
		],
		"laborArchCounts": [
			{"kind": "model", "paramName": "Кол-во моделей", "steps": model_steps()}
		],
		"formulaText": f"N × {MODEL_ARCH} × коэф(overallUncertainty) × коэф(readyPromReports)",
	},
	"07|Разработка витрины для применения модели": {
		"component": "Объект / Витрина данных",
		"triggerMode": "formula",
		"triggerFormula": formula(
			[
				param_token("productionAdditionalReports", "!=", label="Не требуется", code="не_требуется"),
				{"kind": "logic", "op": "and"},
				{"kind": "paren_open"},
				param_token("prePromEval", "=", label="Да", code="true"),
				{"kind": "logic", "op": "or"},
				param_token(
					"workType",
					"in",
					values=[
						{"code": "Разработка", "label": "Разработка"},
						{"code": "Внедрение", "label": "Внедрение"},
						{"code": "Разработка и внедрение", "label": "Разработка и внедрение"},
					],
				),
				{"kind": "paren_close"},
			],
			"Необходимость продуктивизации ≠ Не требуется И (Поддержка пилота = Да ИЛИ Тип работ ∈ {Разработка, Внедрение, Разработка и внедрение})",
		),
		"triggerParam": P["productionAdditionalReports"]["paramName"],
		"triggerParams": [
			P["productionAdditionalReports"]["paramName"],
			P["prePromEval"]["paramName"],
			P["workType"]["paramName"],
		],
		"triggerRules": [
			rule_neq("productionAdditionalReports", "Не требуется", "не_требуется"),
		],
		"triggerArchCount": None,
		"laborParams": [
			P["assessedInitiativesCount"]["paramName"],
			P["complexity"]["paramName"],
			P["overallUncertainty"]["paramName"],
			P["productionAdditionalReports"]["paramName"],
		],
		"laborCoefficients": [
			labor_by_value("assessedInitiativesCount", initiative_values()),
			labor_by_value("complexity", complexity_values()),
			empty_ou(),
			labor_by_value("productionAdditionalReports", production_values()),
		],
		"laborArchCounts": [],
		"formulaText": "N × коэф(complexity) × коэф(overallUncertainty) × коэф(productionAdditionalReports) × коэф(assessedInitiativesCount)",
	},
	"09|Адаптация и внедрение модели": {
		"component": "Модельный сервис",
		"triggerMode": "formula",
		"triggerFormula": formula(
			[
				param_token(
					"workType",
					"in",
					values=[
						{"code": "Внедрение", "label": "Внедрение"},
						{"code": "Разработка и внедрение", "label": "Разработка и внедрение"},
					],
				),
				{"kind": "logic", "op": "and"},
				param_token("channels", "="),  # presence (empty value)
			],
			"Тип работ ∈ {Внедрение, Разработка и внедрение} И Каналы внедрения ≠ пусто",
		),
		"triggerParam": P["channels"]["paramName"],
		"triggerParams": [P["workType"]["paramName"], P["channels"]["paramName"]],
		"triggerRules": [
			rule_in("workType", ["Внедрение", "Разработка и внедрение"]),
			rule_presence("channels"),
		],
		"triggerArchCount": None,
		"laborParams": [
			P["complexity"]["paramName"],
			P["overallUncertainty"]["paramName"],
			P["algorithmType"]["paramName"],
			P["channels"]["paramName"],
		],
		"laborCoefficients": [
			labor_by_value("complexity", complexity_values()),
			empty_ou(),
			labor_by_value("algorithmType", algorithm_values()),
			labor_by_value("channels", channel_values()),
		],
		"laborArchCounts": [
			{"kind": "model", "paramName": "Кол-во моделей", "steps": model_steps()}
		],
		"formulaText": f"N × {MODEL_ARCH} × коэф(complexity) × коэф(overallUncertainty) × коэф(algorithmType) × коэф(field_jUm5syZf)",
	},
	"AutoML|внедрение": {
		"component": "Модель",
		"triggerMode": "formula",
		"triggerFormula": formula(
			[
				param_token(
					"workType",
					"in",
					values=[
						{"code": "Внедрение", "label": "Внедрение"},
						{"code": "Разработка и внедрение", "label": "Разработка и внедрение"},
					],
				),
				{"kind": "logic", "op": "and"},
				param_token("channels", "="),
				{"kind": "logic", "op": "and"},
				param_token("autoML", "=", label="Да", code="true"),
			],
			"Тип работ ∈ {Внедрение, Разработка и внедрение} И Каналы ≠ пусто И AutoML = Да",
		),
		"triggerParam": P["autoML"]["paramName"],
		"triggerParams": [
			P["workType"]["paramName"],
			P["channels"]["paramName"],
			P["autoML"]["paramName"],
		],
		"triggerRules": [
			rule_in("workType", ["Внедрение", "Разработка и внедрение"]),
			rule_presence("channels"),
			rule_eq("autoML", "Да", "true"),
		],
		"triggerArchCount": None,
		"laborParams": [
			P["complexity"]["paramName"],
			P["overallUncertainty"]["paramName"],
		],
		"laborCoefficients": [
			labor_by_value("complexity", complexity_values()),
			empty_ou(),
		],
		"laborArchCounts": [
			{"kind": "model", "paramName": "Кол-во моделей", "steps": model_steps()}
		],
		"formulaText": f"N × {MODEL_ARCH} × коэф(complexity) × коэф(overallUncertainty)",
	},
}


def work_key(w: dict) -> str:
	return f"{w.get('stage')}|{w.get('name')}"


def main() -> None:
	snap = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
	reg = json.loads(REGISTRY.read_text(encoding="utf-8"))

	patched = 0
	missing = []
	for w in snap["typicalWorks"]:
		if w.get("stream") != MODEL_STREAM:
			continue
		key = work_key(w)
		patch = PATCHES.get(key)
		if not patch:
			missing.append(key)
			continue
		for k, v in patch.items():
			w[k] = v
		w["roundingMode"] = "CEIL"
		w["roundingStep"] = 0.01
		w["stream"] = MODEL_STREAM
		patched += 1

	# registry arch types from CSV
	name_to_arch = {
		"01. Постановка задачи": "Модель",
		"02. Поиск данных": "Система-источник",
		"04. Построение витрины для разработки": "Объект / Витрина данных",
		"05A. Разработка пилотной модели (MVP)": "Модель",
		"05. Разработка модели": "Модель",
		"AutoML: разработка": "Модель",
		"05B. Пилотирование модели": "Модельный сервис",
		"07. Разработка витрины для применения модели": "Объект / Витрина данных",
		"09. Адаптация и внедрение модели": "Модельный сервис",
		"AutoML: внедрение": "Модель",
	}
	reg_patched = 0
	for entry in reg["works"]:
		arch = name_to_arch.get(entry.get("name"))
		if not arch:
			continue
		if entry.get("archComponentType") != arch:
			entry["archComponentType"] = arch
			reg_patched += 1
		if MODEL_STREAM not in (entry.get("streams") or []):
			entry["streams"] = [MODEL_STREAM]
		entry["normsByStream"] = {
			MODEL_STREAM: (entry.get("normsByStream") or {}).get(MODEL_STREAM)
			or entry.get("normsByStream", {}).get(MODEL_STREAM)
		}
		# ensure norm present
		norms = entry.get("normsByStream") or {}
		if MODEL_STREAM not in norms or norms[MODEL_STREAM] is None:
			# keep existing
			pass

	SNAPSHOT.write_text(
		json.dumps(snap, ensure_ascii=False, indent="\t") + "\n", encoding="utf-8"
	)
	REGISTRY.write_text(
		json.dumps(reg, ensure_ascii=False, indent="\t") + "\n", encoding="utf-8"
	)
	print(f"patched snapshot works: {patched}")
	print(f"patched registry arch: {reg_patched}")
	if missing:
		print("MISSING keys:", missing)


if __name__ == "__main__":
	main()

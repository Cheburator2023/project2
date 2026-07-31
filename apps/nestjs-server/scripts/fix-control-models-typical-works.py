#!/usr/bin/env python3
"""Починить типовые работы Контроля моделей в factory snapshot + registry norms.

Не создаёт новых параметров: только коды/uid из заводской схемы анкеты.
«Создание модельного сервиса» → triggerArchCount modelService (≥1).
«Количество моделей» → laborArchCounts kind=model (все коэфф. 1).
«Тип работ (модельного сервиса)» → workType (modelService), не algorithmType.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "src/modules/anketa-v2/constants/v2-factory-typical-works.snapshot.json"
REGISTRY = ROOT / "src/modules/anketa-v2/constants/v2-factory-template-typical-works.registry.json"

CONTROL_NAMES = {
	"1. Качество модельных данных [КД]",
	"2. Технический контроль [ТМ]",
	"3. Оперативный контроль [ОК]",
	"4. Аналитический контроль [АК]",
	"5. Контроль модельных значений [КМЗ]",
	"Оценка влияния моделей [ОВ]",
}

CONTROL_TYPE_VALUE = {
	"КД": "КД — Качество модельных данных",
	"ТМ": "ТМ — Технический контроль",
	"ОК": "ОК — Оперативный контроль",
	"АК": "АК — Аналитический контроль",
	"КМЗ": "КМЗ — Контроль модельных значений",
	"ОВ": "ОВ — Оценка влияния моделей",
}

# schemaFieldUid из v2-default-anketa.snapshot.json
BINDINGS = {
	"modelClass": {
		"paramName": "Класс моделей @ modelClass|класс_моделей",
		"paramCode": "modelClass",
		"schemaFieldUid": "field_248655c8-3aa7-4a38-9afd-d09c21f9f122",
	},
	"workType": {
		"paramName": "Тип работ @ workType|тип_работ",
		"paramCode": "workType",
		"schemaFieldUid": "field_22ae6d02-b421-41ee-ba8a-5b3153f0f040",
	},
	"complexity": {
		"paramName": "Регуляторные требования @ complexity|регуляторные_требования",
		"paramCode": "complexity",
		"schemaFieldUid": "field_61a51b98-b6a8-47c9-aa27-74ff2219513f",
	},
	"field_VbI-0aiT": {
		"paramName": "Роль модели @ field_VbI-0aiT|роль_модели",
		"paramCode": "field_VbI-0aiT",
		"schemaFieldUid": "field_0bb82aba-dd87-422f-8824-b97f56159fcf",
	},
	"field_Tq1ez5gv": {
		"paramName": "Новый вид контроля @ field_Tq1ez5gv",
		"paramCode": "field_Tq1ez5gv",
		"schemaFieldUid": "field_15a1b9f6-7250-46b0-b7b5-0fc9175fde57",
	},
	"field_OrZLpCID": {
		"paramName": "Применение модельного сервиса в разных контурах @ field_OrZLpCID",
		"paramCode": "field_OrZLpCID",
		"schemaFieldUid": "field_1299cf13-fa98-4d66-8420-52f5e31849ce",
	},
	"field_oVFNOrlT": {
		"paramName": "Разнородность пользовательских сценариев @ field_oVFNOrlT",
		"paramCode": "field_oVFNOrlT",
		"schemaFieldUid": "field_afddd832-6e8b-46ab-afc4-cc61aa6ad9e9",
	},
	"field_IGQX_9FN": {
		"paramName": "Требуется проработка структуры логов @ field_IGQX_9FN",
		"paramCode": "field_IGQX_9FN",
		"schemaFieldUid": "field_15e8f2e9-0ea8-46f5-a7d3-59abcb82cb12",
	},
	"field_5tjhj31h": {
		"paramName": "Требуется контроль для каждой модели сервиса в отдельности @ field_5tjhj31h",
		"paramCode": "field_5tjhj31h",
		"schemaFieldUid": "field_af8e5543-fad3-4feb-8805-054c09829a83",
	},
	"field_SvNx6iEq": {
		"paramName": "Вид контроля @ field_SvNx6iEq|вид_контроля",
		"paramCode": "field_SvNx6iEq",
		"schemaFieldUid": "field_355676f4-fbf4-4e9c-9870-86736e6e05d7",
	},
}


def norm_label(s: str) -> str:
	t = re.sub(r"\s+", " ", (s or "").strip().lower().replace("ё", "е"))
	t = re.sub(r"[«»\"'()\[\].,:;]+", " ", t)
	t = re.sub(r"[-–—_/|@]+", " ", t)
	return re.sub(r"\s+", " ", t).strip()


def resolve_binding_key(param_name: str) -> str | None:
	n = norm_label(param_name)
	if "класс модел" in n:
		return "modelClass"
	if "тип работ" in n:
		return "workType"
	if "регуляторн" in n:
		return "complexity"
	if "роль модел" in n:
		return "field_VbI-0aiT"
	if "новый вид контроля" in n:
		return "field_Tq1ez5gv"
	if "разных контурах" in n or "region" in n:
		return "field_OrZLpCID"
	if "разнородность" in n or "структур" in n and "лог" in n and "едино" in n:
		return "field_oVFNOrlT"
	if "разнородность" in n:
		return "field_oVFNOrlT"
	if "проработка структуры логов" in n:
		return "field_IGQX_9FN"
	if "контроль для каждой модели" in n:
		return "field_5tjhj31h"
	if "вид контроля" in n and "новый" not in n:
		return "field_SvNx6iEq"
	return None


def is_models_count(param_name: str) -> bool:
	n = norm_label(param_name)
	return n in {"количество моделей", "кол во моделей", "кол-во моделей"}


def is_create_model_service(param_name: str) -> bool:
	return "создание модельного сервиса" in norm_label(param_name)


def model_arch_steps() -> list[dict]:
	return [{"count": i, "coefficient": 1} for i in range(1, 16)]


def arch_formula_token() -> str:
	steps = "; ".join(f"{i}=1" for i in range(1, 16))
	return f"архкоэф(Модели; {steps})"


def map_control_value(raw: str) -> str:
	code = (raw or "").strip().upper().split()[0].replace("—", "").replace("-", "")
	# КД / ТМ / …
	for key, label in CONTROL_TYPE_VALUE.items():
		if code == key or code.startswith(key):
			return label
	# уже полный label
	for label in CONTROL_TYPE_VALUE.values():
		if norm_label(raw) == norm_label(label) or norm_label(raw) in norm_label(label):
			return label
	return raw.strip()


def fix_formula(text: str) -> str:
	if not text:
		return text
	out = text
	out = re.sub(
		r"коэф\(\s*количество_моделей\s*\)",
		arch_formula_token(),
		out,
		flags=re.I,
	)
	out = re.sub(r"коэф\(\s*тип_работ\s*\)", "коэф(workType)", out, flags=re.I)
	out = re.sub(
		r"коэф\(\s*тип_работ_модельного_сервиса\s*\)",
		"коэф(workType)",
		out,
		flags=re.I,
	)
	out = re.sub(r"коэф\(\s*класс_модели\s*\)", "коэф(modelClass)", out, flags=re.I)
	out = re.sub(r"коэф\(\s*класс_моделей\s*\)", "коэф(modelClass)", out, flags=re.I)
	out = re.sub(
		r"коэф\(\s*новый_вид_контроля\s*\)",
		"коэф(field_Tq1ez5gv)",
		out,
		flags=re.I,
	)
	out = re.sub(
		r"коэф\(\s*применение_модельного_сервиса_в_разных_контурах[^)]*\)",
		"коэф(field_OrZLpCID)",
		out,
		flags=re.I,
	)
	out = re.sub(
		r"коэф\(\s*разнородность_пользовательских_сценариев[^)]*\)",
		"коэф(field_oVFNOrlT)",
		out,
		flags=re.I,
	)
	out = re.sub(
		r"коэф\(\s*требуется_проработка_структуры_логов\s*\)",
		"коэф(field_IGQX_9FN)",
		out,
		flags=re.I,
	)
	out = re.sub(
		r"коэф\(\s*требуется_контроль_для_каждой_модели_сервиса_в_отдельности\s*\)",
		"коэф(field_5tjhj31h)",
		out,
		flags=re.I,
	)
	return out


def fix_work(work: dict) -> None:
	# triggers
	new_rules = []
	for rule in work.get("triggerRules") or []:
		pname = rule.get("paramName") or ""
		if is_create_model_service(pname):
			continue
		key = resolve_binding_key(pname)
		if key == "field_SvNx6iEq":
			values = [map_control_value(v) for v in (rule.get("values") or [])]
			binding = BINDINGS[key]
			new_rules.append(
				{
					"paramName": binding["paramName"],
					"paramCode": binding["paramCode"],
					"schemaFieldUid": binding["schemaFieldUid"],
					"operator": "in",
					"values": values,
					"valueCode": None,
					"valueLabel": values[0] if values else None,
				}
			)
			continue
		new_rules.append(rule)
	work["triggerRules"] = new_rules
	work["triggerParams"] = [r.get("paramName") for r in new_rules if r.get("paramName")]
	work["triggerParam"] = work["triggerParams"][0] if work["triggerParams"] else ""
	work["triggerArchCount"] = {
		"kind": "modelService",
		"steps": [{"count": 1, "coefficient": 1}],
		"combinator": "and",
	}
	work["triggerMode"] = "simple"
	work["triggerFormula"] = None

	# labor
	new_coeffs = []
	has_models_count = False
	for group in work.get("laborCoefficients") or []:
		pname = group.get("paramName") or ""
		if is_models_count(pname):
			has_models_count = True
			continue
		if is_create_model_service(pname):
			continue
		key = resolve_binding_key(pname) or group.get("paramCode")
		# map aliases
		if key in BINDINGS:
			binding = BINDINGS[key]
			group = {
				**group,
				"paramName": binding["paramName"],
				"paramCode": binding["paramCode"],
				"schemaFieldUid": binding["schemaFieldUid"],
			}
		elif group.get("paramCode") in BINDINGS:
			binding = BINDINGS[group["paramCode"]]
			group = {
				**group,
				"paramName": binding["paramName"],
				"paramCode": binding["paramCode"],
				"schemaFieldUid": binding["schemaFieldUid"],
			}
		else:
			# try by raw name again
			key2 = resolve_binding_key(pname)
			if key2 and key2 in BINDINGS:
				binding = BINDINGS[key2]
				group = {
					**group,
					"paramName": binding["paramName"],
					"paramCode": binding["paramCode"],
					"schemaFieldUid": binding["schemaFieldUid"],
				}
		new_coeffs.append(group)

	# also drop from laborParams list
	labor_params = []
	for p in work.get("laborParams") or []:
		if is_models_count(p) or is_create_model_service(p):
			has_models_count = True
			continue
		key = resolve_binding_key(p)
		if key and key in BINDINGS:
			labor_params.append(BINDINGS[key]["paramName"])
		else:
			labor_params.append(p)
	work["laborParams"] = labor_params
	work["laborCoefficients"] = new_coeffs

	if has_models_count or "количество_моделей" in (work.get("formulaText") or ""):
		work["laborArchCounts"] = [
			{"kind": "model", "steps": model_arch_steps()}
		]
	else:
		work["laborArchCounts"] = work.get("laborArchCounts") or []

	work["formulaText"] = fix_formula(work.get("formulaText") or "")
	work["stream"] = "mdlctl"


def main() -> None:
	snap = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
	fixed = 0
	norms_by_name: dict[str, float] = {}
	for work in snap["typicalWorks"]:
		if work.get("name") not in CONTROL_NAMES:
			continue
		if work.get("stream") not in ("mdlctl", "Контроль моделей"):
			continue
		fix_work(work)
		if work.get("norm") is not None:
			norms_by_name[work["name"]] = work["norm"]
		fixed += 1
	SNAPSHOT.write_text(
		json.dumps(snap, ensure_ascii=False, indent=2) + "\n",
		encoding="utf-8",
	)

	reg = json.loads(REGISTRY.read_text(encoding="utf-8"))
	reg_fixed = 0
	for entry in reg.get("works") or []:
		name = entry.get("name")
		if name not in norms_by_name:
			continue
		entry["streams"] = ["mdlctl"]
		entry["normsByStream"] = {"mdlctl": norms_by_name[name]}
		reg_fixed += 1
	REGISTRY.write_text(
		json.dumps(reg, ensure_ascii=False, indent=2) + "\n",
		encoding="utf-8",
	)
	print(f"fixed snapshot works: {fixed}")
	print(f"fixed registry norms: {reg_fixed}")
	for n, v in norms_by_name.items():
		print(f"  {n}: mdlctl={v}")


if __name__ == "__main__":
	main()

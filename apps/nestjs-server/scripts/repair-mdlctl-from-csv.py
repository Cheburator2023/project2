#!/usr/bin/env python3
"""Repair «Контроль моделей» (mdlctl) typical works from CSV + real schema fields.

ПК (dict #17) → existing form fields only; no new schema fields.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SNAPSHOT = (
	ROOT
	/ "apps/nestjs-server/src/modules/anketa-v2/constants/v2-factory-typical-works.snapshot.json"
)

STREAM = "mdlctl"

P = {
	"modelClass": {
		"paramCode": "modelClass",
		"schemaFieldUid": "field_248655c8-3aa7-4a38-9afd-d09c21f9f122",
		"paramName": "Класс моделей @ modelClass|класс_моделей",
	},
	"pkRegulatory": {
		"paramCode": "pkRegulatory",
		"schemaFieldUid": "field_08ccfd5f-235f-40d5-bbee-4a4873b9a8d0",
		"paramName": "ПВР/Регуляторная @ pkRegulatory|пвр_регуляторная",
	},
	"contours": {
		"paramCode": "field_OrZLpCID",
		"schemaFieldUid": "field_1299cf13-fa98-4d66-8420-52f5e31849ce",
		"paramName": "Применение модельного сервиса в разных контурах (region и inno.local) @ field_OrZLpCID|применение_в_разных_контурах",
	},
	"logs": {
		"paramCode": "field_IGQX_9FN",
		"schemaFieldUid": "field_15e8f2e9-0ea8-46f5-a7d3-59abcb82cb12",
		"paramName": "Требуется проработка структуры логов @ field_IGQX_9FN|требуется_проработка_структуры_логов",
	},
	"scenarios": {
		"paramCode": "field_oVFNOrlT",
		"schemaFieldUid": "field_afddd832-6e8b-46ab-afc4-cc61aa6ad9e9",
		"paramName": "Разнородность пользовательских сценариев применения модельного сервиса @ field_oVFNOrlT|разнородность_пользовательских_сценариев",
	},
	"newControl": {
		"paramCode": "field_Tq1ez5gv",
		"schemaFieldUid": "field_15a1b9f6-7250-46b0-b7b5-0fc9175fde57",
		"paramName": "Новый вид контроля @ field_Tq1ez5gv|новый_вид_контроля",
	},
	"perModel": {
		"paramCode": "field_5tjhj31h",
		"schemaFieldUid": "field_af8e5543-fad3-4feb-8805-054c09829a83",
		"paramName": "Требуется контроль для каждой модели сервиса в отдельности @ field_5tjhj31h|контроль_для_каждой_модели",
	},
	"mvp": {
		"paramCode": "field_o_HRj6VO",
		"schemaFieldUid": "field_eb6300e7-8889-40bf-92a1-0c8a778de8ef",
		"paramName": "Необходимость пилота (MVP) @ field_o_HRj6VO|необходимость_пилота_mvp",
	},
}

# Schema enum labels (1..9)
CLASS_LABELS = [
	"1 — Розничные регуляторные модели",
	"2 — Розничные бизнес-модели",
	"3 — Розничные модели CRM",
	"4 — Розничные модели Collection",
	"5 — Корпоративные регуляторные модели",
	"6 — Корпоративные бизнес-модели",
	"7 — Прочие корпоративные модели",
	"8 — Модели финансового моделирования",
	"9 — Модели цифровых помощников",
]

CLASS_CODES = [
	"1_розничные_регуляторные_модели",
	"2_розничные_бизнес_модели",
	"3_розничные_модели_crm",
	"4_розничные_модели_collection",
	"5_корпоративные_регуляторные_модели",
	"6_корпоративные_бизнес_модели",
	"7_прочие_корпоративные_модели",
	"8_модели_финансового_моделирования",
	"9_модели_цифровых_помощников",
]


def ge1(kind: str) -> dict:
	return {
		"kind": kind,
		"steps": [{"count": 1, "coefficient": 1}],
		"combinator": "and",
	}


def class_labor(coeffs: list[float]) -> dict:
	meta = P["modelClass"]
	assert len(coeffs) == 9
	return {
		"paramName": meta["paramName"],
		"paramCode": meta["paramCode"],
		"schemaFieldUid": meta["schemaFieldUid"],
		"kind": "by_value",
		"values": [
			{
				"label": CLASS_LABELS[i],
				"code": CLASS_CODES[i],
				"coefficient": coeffs[i],
			}
			for i in range(9)
		],
	}


def any_of(key: str, coeff_on: float, coeff_off: float = 1.0) -> dict:
	meta = P[key]
	return {
		"paramName": meta["paramName"],
		"paramCode": meta["paramCode"],
		"schemaFieldUid": meta["schemaFieldUid"],
		"kind": "any_of",
		"values": [],
		"anyOf": {
			"valueCodes": ["true", "да"],
			"valueLabels": ["Да"],
			"coeffOn": coeff_on,
			"coeffOff": coeff_off,
		},
	}


def scenarios_labor(ok_ak_kmz: tuple[float, float, float], which: str) -> dict:
	"""Map scenario multi-select to by_value; dict #17: 1.05 или 1.5."""
	meta = P["scenarios"]
	high = {"OK": ok_ak_kmz[0], "AK": ok_ak_kmz[1], "KMZ": ok_ak_kmz[2]}[which]
	return {
		"paramName": meta["paramName"],
		"paramCode": meta["paramCode"],
		"schemaFieldUid": meta["schemaFieldUid"],
		"kind": "by_value",
		"values": [
			{"label": "Нет", "code": "нет", "coefficient": 1},
			{"label": "Единая структура логов", "code": "единая_структура_логов", "coefficient": 1.05},
			{
				"label": "Разные структуры логов",
				"code": "разные_структуры_логов",
				"coefficient": high,
			},
		],
	}


def pk_labors(which: str) -> list[dict]:
	"""OK / AK / KMZ multipliers from dict #17 mapped to existing fields."""
	# coeff triples: (OK, AK, KMZ)
	table = {
		"pkRegulatory": (1.5, 1.5, 1.5),
		"contours": (1.1, 1.1, 0.0),
		"logs": (1.25, 1.25, 1.25),
		"newControl": (2.0, 2.0, 2.0),
		"perModel": (1.0, 1.0, 0.0),
	}
	idx = {"OK": 0, "AK": 1, "KMZ": 2}[which]
	out: list[dict] = []
	for key, triple in table.items():
		out.append(any_of(key, triple[idx], 1.0 if triple[idx] != 0 else 1.0))
		# For KMZ contours/perModel coeffOn=0: when flag on → 0 (zeros work).
		if which == "KMZ" and key in ("contours", "perModel"):
			out[-1] = any_of(key, 0.0, 1.0)
	out.append(scenarios_labor((1.5, 1.5, 1.5), which))
	return out


def pk_formula_codes(which: str) -> str:
	codes = [
		"pkRegulatory",
		"field_OrZLpCID",
		"field_IGQX_9FN",
		"field_Tq1ez5gv",
		"field_5tjhj31h",
		"field_oVFNOrlT",
	]
	return " × ".join(f"коэф({c})" for c in codes)


def class_trigger() -> list[dict]:
	meta = P["modelClass"]
	return [
		{
			"paramName": meta["paramName"],
			"paramCode": meta["paramCode"],
			"schemaFieldUid": meta["schemaFieldUid"],
			"operator": "in",
			"values": list(CLASS_LABELS),
			"valueCode": None,
			"valueLabel": None,
		}
	]


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


def patch_control(
	class_coeffs: list[float],
	with_pk: str | None,
) -> dict:
	labors = [class_labor(class_coeffs)]
	formula = "N × коэф(modelClass)"
	labor_names = [P["modelClass"]["paramName"]]
	if with_pk:
		pk = pk_labors(with_pk)
		labors.extend(pk)
		labor_names.extend(g["paramName"] for g in pk)
		formula = f"N × коэф(modelClass) × {pk_formula_codes(with_pk)}"
	return {
		"component": "Модельный сервис",
		"norm": 1,
		"normRaw": "1",
		"triggerParam": P["modelClass"]["paramName"],
		"triggerParams": [P["modelClass"]["paramName"]],
		"triggerRules": class_trigger(),
		"triggerArchCount": ge1("modelService"),
		"triggerMode": "simple",
		"triggerFormula": None,
		"laborParams": labor_names,
		"laborCoefficients": labors,
		"laborArchCounts": [],
		"formulaText": formula,
		"roundingMode": "CEIL",
		"roundingStep": 0.1,
	}


PATCHES: dict[str, dict] = {
	"1. Качество модельных данных [КД]": patch_control([10] * 9, None),
	"2. Технический контроль [ТМ]": patch_control(
		[3, 2, 1, 2, 3, 2, 2, 5, 0], None
	),
	"3. Оперативный контроль [ОК]": patch_control(
		[7, 7, 7, 7, 7, 7, 7, 7, 0], "OK"
	),
	"4. Аналитический контроль [АК]": patch_control(
		[40, 36, 20, 36, 40, 40, 40, 54, 55], "AK"
	),
	"5. Контроль модельных значений [КМЗ]": patch_control(
		[45, 20, 20, 20, 45, 20, 20, 20, 0], "KMZ"
	),
	"Оценка влияния моделей [ОВ]": patch_control(
		[45, 20, 20, 20, 45, 20, 20, 20, 0], None
	),
	"Оценка реализации на пре-промышленном контуре (MVP/Прототип)": {
		"component": "Модельный сервис",
		"norm": 1,
		"normRaw": "1",
		"triggerParam": P["mvp"]["paramName"],
		"triggerParams": [P["mvp"]["paramName"]],
		"triggerRules": [rule_true("mvp")],
		"triggerArchCount": ge1("modelService"),
		"triggerMode": "simple",
		"triggerFormula": None,
		"laborParams": [],
		"laborCoefficients": [],
		"laborArchCounts": [],
		# Нет полей «Оценка»/«Периодичность» в схеме — оставляем N (ручной atypical рядом).
		"formulaText": "N",
		"roundingMode": "CEIL",
		"roundingStep": 0.1,
	},
	"Оценка новых интеграционных решений": {
		"component": "Модельный сервис",
		"norm": 20,
		"normRaw": "20",
		"triggerParam": "Арх. компонент Модельный сервис",
		"triggerParams": [],
		"triggerRules": [],
		"triggerArchCount": ge1("modelService"),
		"triggerMode": "simple",
		"triggerFormula": None,
		"laborParams": [],
		"laborCoefficients": [],
		"laborArchCounts": [],
		"formulaText": "N",
		"roundingMode": "CEIL",
		"roundingStep": 0.1,
	},
}


def main() -> None:
	snap = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
	patched = 0
	for w in snap["typicalWorks"]:
		if w.get("stream") != STREAM:
			continue
		name = (w.get("name") or "").strip()
		patch = PATCHES.get(name)
		if not patch:
			continue
		for k, v in patch.items():
			w[k] = v
		w["stream"] = STREAM
		patched += 1

	missing = sorted(
		set(PATCHES)
		- {
			(w.get("name") or "").strip()
			for w in snap["typicalWorks"]
			if w.get("stream") == STREAM
		}
	)
	SNAPSHOT.write_text(
		json.dumps(snap, ensure_ascii=False, indent="\t") + "\n",
		encoding="utf-8",
	)
	print(f"patched: {patched}")
	if missing:
		print("MISSING:", missing)


if __name__ == "__main__":
	main()

#!/usr/bin/env python3
"""Repair «Источники данных» external works from CSV.

Only rows with Стрим=ИД. Внешний. Does not modify internal (type=Внутренний / ИД. Внутренний).
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SNAPSHOT = (
	ROOT
	/ "apps/nestjs-server/src/modules/anketa-v2/constants/v2-factory-typical-works.snapshot.json"
)
CSV_PATH = ROOT / "llm" / "Типовые работы - Источники данных (внешние).csv"

STREAM_CANON = "Источники данных"
STREAM_LEGACY_EXT = "ИД. Внешний"

P_TYPE = {
	"paramCode": "type",
	"schemaFieldUid": "field_f0070137-09a8-432a-bd47-dd6e901d8cb2",
	"paramName": "Тип системы-источника @ type|тип_системы_источника",
}

EXTRA_TRIGGERS = {
	"необходимо подтвердить возможность интеграции": {
		"paramCode": "field_fJ_7OdE7",
		"schemaFieldUid": "field_8a8bbc10-ade4-41c0-bc37-6f1eadb99723",
		"paramName": "Необходимо подтвердить возможность интеграции @ field_fJ_7OdE7|необходимо_подтвердить_возможность_интеграции",
	},
	"пилот": {
		"paramCode": "field_4jxR0E0m",
		"schemaFieldUid": "field_32d71261-cc35-4a8e-97cd-21e5fd21f199",
		"paramName": "Пилот @ field_4jxR0E0m|пилот",
	},
}


def strip_stage_prefix(name: str) -> str:
	return re.sub(r"^Этап\s*\d+\.\s*", "", (name or "").strip())


def parse_norm(raw: str) -> float | None:
	s = (raw or "").strip().replace(",", ".")
	if not s:
		return None
	try:
		return float(s)
	except ValueError:
		return None


def is_internal_work(work: dict) -> bool:
	if work.get("stream") == "ИД. Внутренний":
		return True
	for rule in work.get("triggerRules") or []:
		vals = rule.get("values") or []
		if rule.get("paramCode") == "type" and (
			rule.get("valueLabel") == "Внутренний"
			or rule.get("valueCode") in {"внутренний", "Внутренний"}
			or "Внутренний" in vals
		):
			return True
	return False


def is_external_work(work: dict) -> bool:
	if work.get("stream") == STREAM_LEGACY_EXT:
		return True
	if work.get("stream") != STREAM_CANON:
		return False
	for rule in work.get("triggerRules") or []:
		vals = rule.get("values") or []
		if rule.get("paramCode") == "type" and (
			rule.get("valueLabel") == "Внешний"
			or rule.get("valueCode") in {"внешний", "Внешний"}
			or "Внешний" in vals
		):
			return True
	return False


def external_type_rule() -> dict:
	return {
		"paramName": P_TYPE["paramName"],
		"paramCode": P_TYPE["paramCode"],
		"schemaFieldUid": P_TYPE["schemaFieldUid"],
		"operator": "=",
		"values": ["Внешний"],
		"valueCode": "внешний",
		"valueLabel": "Внешний",
	}


def rule_true(meta: dict) -> dict:
	return {
		"paramName": meta["paramName"],
		"paramCode": meta["paramCode"],
		"schemaFieldUid": meta["schemaFieldUid"],
		"operator": "=",
		"values": ["Да"],
		"valueCode": "true",
		"valueLabel": "Да",
	}


def ensure_external_triggers(work: dict, trigger_text: str) -> None:
	rules = list(work.get("triggerRules") or [])
	# drop internal type rules
	rules = [
		r
		for r in rules
		if not (
			r.get("paramCode") == "type"
			and (
				r.get("valueLabel") == "Внутренний"
				or "Внутренний" in (r.get("values") or [])
			)
		)
	]
	has_ext = any(
		r.get("paramCode") == "type"
		and (
			r.get("valueLabel") == "Внешний"
			or "Внешний" in (r.get("values") or [])
			or r.get("valueCode") == "внешний"
		)
		for r in rules
	)
	if not has_ext:
		rules.insert(0, external_type_rule())
	else:
		# normalize first type rule
		for r in rules:
			if r.get("paramCode") == "type":
				r.update(external_type_rule())
				break

	tl = (trigger_text or "").lower().replace("\n", " ")
	for needle, meta in EXTRA_TRIGGERS.items():
		if needle in tl and not any(r.get("paramCode") == meta["paramCode"] for r in rules):
			rules.append(rule_true(meta))

	work["triggerRules"] = rules
	work["triggerParams"] = [r["paramName"] for r in rules]
	work["triggerParam"] = work["triggerParams"][0] if work["triggerParams"] else ""


def index_external_works(snap: dict) -> dict[tuple[str, str], dict]:
	idx: dict[tuple[str, str], dict] = {}
	for w in snap["typicalWorks"]:
		if is_internal_work(w):
			continue
		if not is_external_work(w) and w.get("stream") not in {
			STREAM_CANON,
			STREAM_LEGACY_EXT,
		}:
			continue
		if w.get("stream") == STREAM_CANON and not is_external_work(w):
			continue
		stage = (w.get("stage") or "").strip()
		name = (w.get("name") or "").strip()
		idx[(stage, name)] = w
		idx[("", name)] = idx.get(("", name)) or w
		idx[("", strip_stage_prefix(name))] = idx.get(("", strip_stage_prefix(name))) or w
		idx[(stage, strip_stage_prefix(name))] = w
	return idx


def main() -> None:
	rows = [
		r
		for r in csv.DictReader(
			CSV_PATH.open(encoding="utf-8-sig", newline=""), delimiter=";"
		)
		if (r.get("Стрим") or "").strip().startswith("ИД. Внешний")
	]
	snap = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
	idx = index_external_works(snap)

	patched = 0
	missing: list[str] = []
	skipped_internal = 0

	for row in rows:
		smart = (row.get("Название в смарт-анкете СУМ") or "").strip()
		stage = (row.get("Контекст") or "").strip()
		stripped = strip_stage_prefix(smart)
		work = (
			idx.get((stage, stripped))
			or idx.get((stage, smart))
			or idx.get(("", stripped))
			or idx.get(("", smart))
		)
		if not work:
			missing.append(smart)
			continue
		if is_internal_work(work):
			skipped_internal += 1
			continue

		norm = parse_norm(row.get("Наличие норматива") or "")
		if norm is not None:
			work["norm"] = norm
			work["normRaw"] = (row.get("Наличие норматива") or "").strip()

		ensure_external_triggers(work, row.get("Параметр-триггер") or "")

		# Keep machine formula if already N×…; otherwise leave as-is.
		ft = (work.get("formulaText") or "").strip()
		if not ft:
			work["formulaText"] = "N"
		work["roundingMode"] = work.get("roundingMode") or "CEIL"
		work["roundingStep"] = (
			work.get("roundingStep") if work.get("roundingStep") is not None else 0.1
		)

		# Prefer canonical stream for catalog consistency (legacy ИД. Внешний kept if already).
		if work.get("stream") == STREAM_LEGACY_EXT:
			# leave stream label; triggers already mark external
			pass

		patched += 1

	SNAPSHOT.write_text(
		json.dumps(snap, ensure_ascii=False, indent="\t") + "\n",
		encoding="utf-8",
	)
	print(f"patched: {patched}")
	print(f"skipped_internal: {skipped_internal}")
	if missing:
		print(f"MISSING ({len(missing)}):", missing[:10])


if __name__ == "__main__":
	main()

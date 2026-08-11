#!/usr/bin/env python3
"""Offline import: «Оценка Инициативы» → formData по реестру Excel 2026.08.10.

Только колонки реестра; «Проект» не загружается из файла.

  python3 scripts/import-master-initiative-rows-2026-08-10.py
  python3 scripts/import-master-initiative-rows-2026-08-10.py --master /path/to.csv

Выход: llm/new_fields/out/import-protocol.json + formdata-preview.jsonl
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MASTER = (
    ROOT
    / "llm/new_fields/Мастер версия_05.08.26"
    / "Файл для для загрузки 87 - Мастер версия_05.08.26_csv"
    / "Оценка Инициативы.csv"
)
DEFAULT_DEPTS = (
    ROOT
    / "llm/new_fields/Мастер версия_05.08.26"
    / "Файл для для загрузки 87 - Мастер версия_05.08.26_csv"
    / "Департаменты.csv"
)
ANKETA_PATH = (
    Path(__file__).resolve().parents[1]
    / "src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json"
)
OUT_DIR = ROOT / "llm/new_fields/out"

# Excel columns → 0-based
COL_B, COL_C, COL_E, COL_F, COL_H, COL_I, COL_O, COL_Q = 1, 2, 4, 5, 7, 8, 14, 16
HEADER_ROW = 3
DATA_START = 4

STREAM_ALIASES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"^моделирование\s*рб$", re.I), "rb"),
    (re.compile(r"^стрим\s*разработка\s*моделей\s*(киб|кмб).*(смб|ксб)", re.I), "kmbkcb"),
    (re.compile(r"^разработка\s*моделей\s*(кмб|киб).*(ксб|смб)", re.I), "kmbkcb"),
    (re.compile(r"^моделирование\s*rnd$", re.I), "rnd"),
    (re.compile(r"^источники\s*данных$", re.I), "idsrc"),
    (re.compile(r"контроль\s*(качества\s*)?модел", re.I), "mdlctl"),
    (re.compile(r"^стрим\s*[\"«]?контроль\s*моделей[\"»]?$", re.I), "mdlctl"),
    (re.compile(r"цифров(ые|ых)\s*агент", re.I), "digagt"),
    (re.compile(r"^потоковые\s*данные$", re.I), "strdat"),
    (re.compile(r"ai[-\s]*модели\s*партнерств", re.I), "ptitpc"),
    (re.compile(r"^стрим\s*дадм$|^дадм$", re.I), "dadm"),
    (re.compile(r"финансовое\s*моделирование", re.I), "finmdl"),
    (re.compile(r"платформ.*решени.*моделир|^пирм$", re.I), "pirm"),
]


def norm_text(value: object) -> str:
    s = str(value or "")
    s = (
        s.replace("\xa0", " ")
        .replace("\u200b", "")
        .replace("\u200c", "")
        .replace("\u200d", "")
        .replace("\ufeff", "")
    )
    return re.sub(r"\s+", " ", s).strip()


def norm_key(value: object) -> str:
    s = norm_text(value)
    s = re.sub(r"[‐‑‒–—―]", "-", s)
    s = re.sub(r"\s*-\s*", "-", s)
    return s.casefold()


def cell(row: list[str], idx: int) -> str:
    if idx < 0 or idx >= len(row):
        return ""
    return norm_text(row[idx])


def load_dept_dictionary(anketa_path: Path, depts_csv: Path) -> tuple[dict[str, str], set[str]]:
    snap = json.loads(anketa_path.read_text(encoding="utf-8"))
    enum_vals = (
        snap.get("jsonSchema", {})
        .get("properties", {})
        .get("generalInfo", {})
        .get("properties", {})
        .get("businessCustomer", {})
        .get("items", {})
        .get("enum", [])
    )
    by_key: dict[str, str] = {}
    schema_keys: set[str] = set()
    for label in enum_vals:
        key = norm_key(label)
        if key:
            by_key[key] = label
            schema_keys.add(key)

    if depts_csv.is_file():
        with depts_csv.open(encoding="utf-8-sig", newline="") as f:
            for i, row in enumerate(csv.reader(f)):
                if i == 0:
                    continue
                label = norm_text(row[1] if len(row) > 1 else (row[0] if row else ""))
                if not label or re.fullmatch(r"блок", label, flags=re.I):
                    continue
                key = norm_key(label)
                if key and key not in by_key:
                    by_key[key] = label
    return by_key, schema_keys


def resolve_dept(raw: str, by_key: dict[str, str], schema_keys: set[str]) -> str | None:
    key = norm_key(raw)
    if not key:
        return None
    hit = by_key.get(key)
    if hit and norm_key(hit) in schema_keys:
        return hit
    return None


def resolve_stream(raw: str) -> str | None:
    t = norm_text(raw)
    if not t:
        return None
    key = norm_key(t)
    for pattern, code in STREAM_ALIASES:
        if pattern.search(t) or pattern.search(key):
            return code
    return None


def prod_allowed() -> set[str]:
    allowed = {"Не требуется"}
    allowed.update(str(n) for n in range(1, 100))
    return allowed


def find_budget_col(header: list[str]) -> int:
    for i, h in enumerate(header):
        key = norm_key(h)
        if "бюджетн" in key and "кампан" in key:
            return i
    return -1


def row_has_registry_data(row: list[str]) -> bool:
    return any(
        cell(row, idx)
        for idx in (COL_B, COL_C, COL_E, COL_F, COL_H, COL_I, COL_O, COL_Q)
    )


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--master", type=Path, default=DEFAULT_MASTER)
    p.add_argument("--depts", type=Path, default=DEFAULT_DEPTS)
    p.add_argument("--anketa", type=Path, default=ANKETA_PATH)
    p.add_argument("--out-dir", type=Path, default=OUT_DIR)
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    master: Path = args.master.resolve()
    if not master.is_file():
        print(f"Error: master CSV not found: {master}", file=sys.stderr)
        return 1

    with master.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.reader(f))
    if len(rows) <= DATA_START:
        print(f"Error: master CSV too short: {master}", file=sys.stderr)
        return 1

    header = rows[HEADER_ROW]
    budget_col = find_budget_col(header)
    dept_by_key, schema_keys = load_dept_dictionary(args.anketa.resolve(), args.depts.resolve())
    allowed_prod = prod_allowed()

    protocol: dict = {
        "source": str(master),
        "headerRow": HEADER_ROW,
        "dataStart": DATA_START,
        "budgetCampaignColumn": budget_col if budget_col >= 0 else None,
        "deptDictionarySize": len(dept_by_key),
        "stats": {
            "rowsTotal": 0,
            "rowsSkippedEmpty": 0,
            "mapped": {
                "initiative": 0,
                "businessCustomer": 0,
                "implementationStream": 0,
                "name": 0,
                "customerFio": 0,
                "gbl": 0,
                "taskDescription": 0,
                "productionAdditionalReports": 0,
                "budgetCampaign": 0,
            },
            "issues": {
                "dept_unmatched": 0,
                "stream_unmatched": 0,
                "prod_invalid": 0,
            },
        },
        "samples": {
            "dept_unmatched": [],
            "stream_unmatched": [],
            "prod_invalid": [],
        },
        "events": [],
    }
    preview_lines: list[str] = []

    for r in range(DATA_START, len(rows)):
        row = rows[r]
        protocol["stats"]["rowsTotal"] += 1
        if not row_has_registry_data(row):
            protocol["stats"]["rowsSkippedEmpty"] += 1
            continue

        master_no = cell(row, 0) or str(r - DATA_START + 1)
        form_data: dict = {"meta": {}, "generalInfo": {}}
        issues: list[dict] = []

        initiative = cell(row, COL_B)
        if initiative:
            form_data["generalInfo"]["initiative"] = initiative
            protocol["stats"]["mapped"]["initiative"] += 1

        dept_raw = cell(row, COL_C)
        if dept_raw:
            resolved = resolve_dept(dept_raw, dept_by_key, schema_keys)
            if resolved:
                form_data["generalInfo"]["businessCustomer"] = [resolved]
                protocol["stats"]["mapped"]["businessCustomer"] += 1
            else:
                issues.append({"code": "dept_unmatched", "value": dept_raw})
                protocol["stats"]["issues"]["dept_unmatched"] += 1
                if len(protocol["samples"]["dept_unmatched"]) < 30:
                    protocol["samples"]["dept_unmatched"].append(dept_raw)

        stream_raw = cell(row, COL_Q)
        if stream_raw:
            code = resolve_stream(stream_raw)
            if code:
                form_data["generalInfo"]["implementationStream"] = code
                protocol["stats"]["mapped"]["implementationStream"] += 1
            else:
                issues.append({"code": "stream_unmatched", "value": stream_raw})
                protocol["stats"]["issues"]["stream_unmatched"] += 1
                if len(protocol["samples"]["stream_unmatched"]) < 30:
                    protocol["samples"]["stream_unmatched"].append(stream_raw)

        name = cell(row, COL_H)
        if name:
            form_data["meta"]["name"] = name
            protocol["stats"]["mapped"]["name"] += 1

        fio = cell(row, COL_E)
        if fio:
            form_data["generalInfo"]["field_vz9bm7A3"] = fio
            protocol["stats"]["mapped"]["customerFio"] += 1

        gbl = cell(row, COL_F)
        if gbl:
            form_data["generalInfo"]["gbl"] = gbl
            protocol["stats"]["mapped"]["gbl"] += 1

        task_description = cell(row, COL_I)
        if task_description:
            form_data["generalInfo"]["taskDescription"] = task_description
            protocol["stats"]["mapped"]["taskDescription"] += 1

        prod_raw = cell(row, COL_O)
        if prod_raw:
            if prod_raw in allowed_prod:
                form_data["generalInfo"]["productionAdditionalReports"] = prod_raw
                protocol["stats"]["mapped"]["productionAdditionalReports"] += 1
            else:
                issues.append({"code": "prod_invalid", "value": prod_raw})
                protocol["stats"]["issues"]["prod_invalid"] += 1
                if len(protocol["samples"]["prod_invalid"]) < 30:
                    protocol["samples"]["prod_invalid"].append(prod_raw)

        if budget_col >= 0:
            budget = cell(row, budget_col)
            if budget:
                form_data["generalInfo"]["budgetCampaign"] = budget
                protocol["stats"]["mapped"]["budgetCampaign"] += 1

        # «Проект» — schema-only, значения из файла не читаем.

        record = {
            "masterRow": r + 1,
            "masterNo": master_no,
            "formData": form_data,
            "issues": issues,
        }
        preview_lines.append(json.dumps(record, ensure_ascii=False))
        if issues:
            protocol["events"].append(
                {"masterRow": r + 1, "masterNo": master_no, "issues": issues}
            )

    out_dir: Path = args.out_dir.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    protocol_path = out_dir / "import-protocol.json"
    preview_path = out_dir / "formdata-preview.jsonl"
    protocol_path.write_text(
        json.dumps(protocol, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    preview_path.write_text("\n".join(preview_lines) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "protocolPath": str(protocol_path),
                "previewPath": str(preview_path),
                "previewRows": len(preview_lines),
                "stats": protocol["stats"],
                "budgetCampaignColumn": protocol["budgetCampaignColumn"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

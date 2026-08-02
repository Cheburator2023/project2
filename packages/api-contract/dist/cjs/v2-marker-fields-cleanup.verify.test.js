"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const vitest_1 = require("vitest");
const v2_trigger_formula_util_1 = require("./v2-trigger-formula.util");
function resolveMonorepoFile(...parts) {
    const candidates = [
        (0, node_path_1.join)(process.cwd(), ...parts),
        (0, node_path_1.join)(process.cwd(), "../..", ...parts),
    ];
    const hit = candidates.find((p) => (0, node_fs_1.existsSync)(p));
    if (!hit)
        throw new Error(`file not found: ${parts.join("/")}`);
    return hit;
}
const ANKETA = resolveMonorepoFile("apps/nestjs-server/src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json");
const WORKS = resolveMonorepoFile("apps/nestjs-server/src/modules/anketa-v2/constants/v2-factory-typical-works.snapshot.json");
const ORPHANS = [
    // дубли без/с «Маркер:»
    "field_DJJtx7nX",
    "field_1bl3dfSX",
    "field_WgK6lIS-",
    "field_lDw9gG39",
    // старые имена после переименования в CSV 2026.08.01
    "field_wuYlhnu0", // → field_DnB8Ur4I
    "field_61bkBs0m", // → field_xi0W_vl-
    "field_F8GPVM7R", // → field_OyRJyJxD
    "field_VX7y3PsB", // → field_OyRJyJxD
    "field_4Gff93vI",
    "field_TvqjyIO-",
];
const KEPT = [
    "field_LGUdr5mq",
    "field_eIIWBdCg",
    "field_nx1zBg1X",
    "field_KnIEmMxM",
    "field_xi0W_vl-",
    "field_DnB8Ur4I",
    "field_OyRJyJxD",
    "field__NUAXSNP",
    "field_wluxUVJ9",
    "field_TrX4G9Gc",
];
(0, vitest_1.describe)("cleanup Маркер-дубликатов sourceSystems", () => {
    const anketa = JSON.parse((0, node_fs_1.readFileSync)(ANKETA, "utf8"));
    const worksSnap = JSON.parse((0, node_fs_1.readFileSync)(WORKS, "utf8"));
    const props = anketa.jsonSchema.properties.detailInfo.properties.sourceSystems.items
        .properties;
    (0, vitest_1.it)("orphans удалены, префикс Маркер: снят с titles", () => {
        for (const key of ORPHANS) {
            (0, vitest_1.expect)(props[key]).toBeUndefined();
        }
        for (const key of KEPT) {
            (0, vitest_1.expect)(props[key]?.title).toBeTruthy();
            (0, vitest_1.expect)(props[key]?.title).not.toMatch(/^Маркер:/i);
        }
    });
    (0, vitest_1.it)("работы ПиРМ матчятся по оставшимся paramCode без префикса в paramName", () => {
        const pirmWorks = worksSnap.typicalWorks.filter((w) => w.stream === "ПиРМ" &&
            (w.triggerRules ?? []).some((r) => KEPT.includes(r.paramCode)));
        (0, vitest_1.expect)(pirmWorks.length).toBeGreaterThanOrEqual(5);
        for (const work of pirmWorks) {
            const rules = (work.triggerRules ?? []).map((r) => ({
                paramCode: r.paramCode ?? "",
                paramName: r.paramName ?? "",
                operator: (r.operator ?? "="),
                valueCode: r.valueCode ?? "true",
                valueLabel: r.valueLabel ?? "Да",
            }));
            (0, vitest_1.expect)(rules.every((r) => !/^Маркер:/i.test(r.paramName))).toBe(true);
            const source = {};
            for (const rule of rules) {
                if (rule.paramCode)
                    source[rule.paramCode] = true;
            }
            (0, vitest_1.expect)((0, v2_trigger_formula_util_1.matchTypicalWorkTriggers)({ mode: "simple", rules, triggerArchCount: null, triggerFormula: null }, source, { detailInfo: { sourceSystems: [source] } })).toBe(true);
            const off = { ...source };
            const first = rules[0]?.paramCode;
            if (first)
                off[first] = false;
            (0, vitest_1.expect)((0, v2_trigger_formula_util_1.matchTypicalWorkTriggers)({ mode: "simple", rules, triggerArchCount: null, triggerFormula: null }, off, { detailInfo: { sourceSystems: [off] } })).toBe(false);
        }
    });
});

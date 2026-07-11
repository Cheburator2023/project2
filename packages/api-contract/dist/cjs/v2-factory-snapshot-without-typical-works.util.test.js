"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const v2_default_typical_works_logic_util_1 = require("./v2-default-typical-works-logic.util");
const v2_factory_snapshot_without_typical_works_util_1 = require("./v2-factory-snapshot-without-typical-works.util");
const v2_typical_work_output_paths_util_1 = require("./v2-typical-work-output-paths.util");
const vitest_1 = require("vitest");
const defaultSnapshotPath = (0, node_path_1.join)(process.cwd(), "apps/nestjs-server/src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json");
function loadDefaultSnapshot() {
    return JSON.parse((0, node_fs_1.readFileSync)(defaultSnapshotPath, "utf8"));
}
(0, vitest_1.describe)("prepareFactorySnapshotWithoutTypicalWorks", () => {
    (0, vitest_1.it)("disables catalog bindings and strips typical-works logic from factory snapshot", () => {
        const snapshot = loadDefaultSnapshot();
        const prepared = (0, v2_factory_snapshot_without_typical_works_util_1.prepareFactorySnapshotWithoutTypicalWorks)(snapshot);
        for (const binding of (0, v2_typical_work_output_paths_util_1.collectTypicalWorkBlockBindings)(prepared.uiSchema)) {
            (0, vitest_1.expect)(binding.boundWorkIds).toEqual([]);
        }
        const strippedIds = (prepared.logic.rules ?? []).map((rule) => rule.id);
        (0, vitest_1.expect)(strippedIds).not.toContain("unified-source-typical-works");
        (0, vitest_1.expect)(strippedIds).not.toContain("unified-control-typical-works");
        (0, vitest_1.expect)(strippedIds).not.toContain("unified-typical-total");
        (0, vitest_1.expect)(strippedIds.some((id) => id.startsWith("typical-works-catalog-"))).toBe(false);
    });
    (0, vitest_1.it)("keeps patched catalog rules disabled after runtime logic patch", () => {
        const snapshot = loadDefaultSnapshot();
        const prepared = (0, v2_factory_snapshot_without_typical_works_util_1.prepareFactorySnapshotWithoutTypicalWorks)(snapshot);
        const patched = (0, v2_default_typical_works_logic_util_1.patchV2TypicalWorksLogicRules)(prepared.logic, {
            jsonSchema: prepared.jsonSchema,
            uiSchema: prepared.uiSchema,
        });
        const catalogRules = patched.rules.filter((rule) => rule.id.startsWith("typical-works-catalog-"));
        (0, vitest_1.expect)(catalogRules.length).toBeGreaterThan(0);
        for (const rule of catalogRules) {
            (0, vitest_1.expect)(rule.condition).toBe(false);
        }
    });
    (0, vitest_1.it)("stripTypicalWorksLogicRules leaves non-typical rules intact", () => {
        const snapshot = loadDefaultSnapshot();
        const stripped = (0, v2_factory_snapshot_without_typical_works_util_1.stripTypicalWorksLogicRules)(snapshot.logic, snapshot.uiSchema);
        const ids = (stripped.rules ?? []).map((rule) => rule.id);
        (0, vitest_1.expect)(ids.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(ids).not.toContain("unified-source-typical-works");
    });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { patchV2TypicalWorksLogicRules } from "./v2-default-typical-works-logic.util";
import { prepareFactorySnapshotWithoutTypicalWorks, stripTypicalWorksLogicRules, } from "./v2-factory-snapshot-without-typical-works.util";
import { collectTypicalWorkBlockBindings } from "./v2-typical-work-output-paths.util";
import { describe, expect, it } from "vitest";
const defaultSnapshotPath = join(process.cwd(), "apps/nestjs-server/src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json");
function loadDefaultSnapshot() {
    return JSON.parse(readFileSync(defaultSnapshotPath, "utf8"));
}
describe("prepareFactorySnapshotWithoutTypicalWorks", () => {
    it("disables catalog bindings and strips typical-works logic from factory snapshot", () => {
        const snapshot = loadDefaultSnapshot();
        const prepared = prepareFactorySnapshotWithoutTypicalWorks(snapshot);
        for (const binding of collectTypicalWorkBlockBindings(prepared.uiSchema)) {
            expect(binding.boundWorkIds).toEqual([]);
        }
        const strippedIds = (prepared.logic.rules ?? []).map((rule) => rule.id);
        expect(strippedIds).not.toContain("unified-source-typical-works");
        expect(strippedIds).not.toContain("unified-control-typical-works");
        expect(strippedIds).not.toContain("unified-typical-total");
        expect(strippedIds.some((id) => id.startsWith("typical-works-catalog-"))).toBe(false);
    });
    it("keeps patched catalog rules disabled after runtime logic patch", () => {
        const snapshot = loadDefaultSnapshot();
        const prepared = prepareFactorySnapshotWithoutTypicalWorks(snapshot);
        const patched = patchV2TypicalWorksLogicRules(prepared.logic, {
            jsonSchema: prepared.jsonSchema,
            uiSchema: prepared.uiSchema,
        });
        const catalogRules = patched.rules.filter((rule) => rule.id.startsWith("typical-works-catalog-"));
        expect(catalogRules.length).toBeGreaterThan(0);
        for (const rule of catalogRules) {
            expect(rule.condition).toBe(false);
        }
    });
    it("stripTypicalWorksLogicRules leaves non-typical rules intact", () => {
        const snapshot = loadDefaultSnapshot();
        const stripped = stripTypicalWorksLogicRules(snapshot.logic, snapshot.uiSchema);
        const ids = (stripped.rules ?? []).map((rule) => rule.id);
        expect(ids.length).toBeGreaterThan(0);
        expect(ids).not.toContain("unified-source-typical-works");
    });
});

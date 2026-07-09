"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_typical_works_util_1 = require("./v2-typical-works.util");
(0, vitest_1.describe)("v2-typical-works.util stream trigger context", () => {
    (0, vitest_1.it)("flattens nested group fields by leaf key", () => {
        (0, vitest_1.expect)((0, v2_typical_works_util_1.flattenTypicalWorkStreamTriggerFields)({
            groupKirilla: {
                field_dropdown: "Кухня",
                field_number: 322,
            },
            sourceTypicalTasks: [{ name: "skip", estimateHoursPerDay: 1 }],
        })).toEqual({
            field_dropdown: "Кухня",
            field_number: 322,
        });
    });
    (0, vitest_1.it)("reads stream trigger context without sourceSystems rows", () => {
        const context = (0, v2_typical_works_util_1.readTypicalWorksStreamTriggerContext)({
            streamDataSources: {
                groupKirilla: { field_dropdown: "Кухня" },
                localParams: { entityVolume: "Большое" },
            },
        }, "streamDataSources.sourceTypicalTasks");
        (0, vitest_1.expect)(context.field_dropdown).toBe("Кухня");
        (0, vitest_1.expect)(context.entityVolume).toBe("Большое");
        (0, vitest_1.expect)((0, v2_typical_works_util_1.hasTypicalWorkStreamTriggerContext)(context)).toBe(true);
    });
    (0, vitest_1.it)("reads root-level form fields when output is not under a stream block", () => {
        const context = (0, v2_typical_works_util_1.readTypicalWorksStreamTriggerContext)({
            field_KQX2OsDx: "Непосредственно",
            field_SId8TZKZ: [],
            meta: { status: "Активная" },
        }, "field_SId8TZKZ");
        (0, vitest_1.expect)(context.field_KQX2OsDx).toBe("Непосредственно");
        (0, vitest_1.expect)(context.field_SId8TZKZ).toBeUndefined();
        (0, vitest_1.expect)((0, v2_typical_works_util_1.hasTypicalWorkStreamTriggerContext)(context)).toBe(true);
    });
    (0, vitest_1.it)("treats empty sourceSystems row as unfilled", () => {
        (0, vitest_1.expect)((0, v2_typical_works_util_1.isFilledTypicalWorkSourceRow)({})).toBe(false);
        (0, vitest_1.expect)((0, v2_typical_works_util_1.isFilledTypicalWorkSourceRow)({ type: "", name: "" })).toBe(false);
        (0, vitest_1.expect)((0, v2_typical_works_util_1.isFilledTypicalWorkSourceRow)({ field_room: "Кухня" })).toBe(true);
    });
});

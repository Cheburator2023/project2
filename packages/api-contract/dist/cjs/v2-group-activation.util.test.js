"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_group_activation_util_1 = require("./v2-group-activation.util");
(0, vitest_1.describe)("v2-group-activation.util", () => {
    (0, vitest_1.it)("collects defaults for activatable groups", () => {
        (0, vitest_1.expect)((0, v2_group_activation_util_1.collectActivatableGroupDefaults)({
            streamDigitalAgents: {
                "ui:options": {
                    groupActivatable: true,
                    groupActive: false,
                },
            },
        })).toEqual({ streamDigitalAgents: false });
    });
    (0, vitest_1.it)("seeds groupActivation from ui defaults", () => {
        const next = (0, v2_group_activation_util_1.ensureGroupActivationDefaults)({}, {
            streamStreamingData: {
                "ui:options": { groupActivatable: true, groupActive: false },
            },
        });
        (0, vitest_1.expect)(next.groupActivation).toEqual({
            streamStreamingData: false,
        });
    });
    (0, vitest_1.it)("resolveGroupIsActive prefers formData over ui default", () => {
        const ui = {
            streamDigitalAgents: {
                "ui:options": { groupActivatable: true, groupActive: false },
            },
        };
        (0, vitest_1.expect)((0, v2_group_activation_util_1.resolveGroupIsActive)("streamDigitalAgents", ui, {})).toBe(false);
        (0, vitest_1.expect)((0, v2_group_activation_util_1.resolveGroupIsActive)("streamDigitalAgents", ui, (0, v2_group_activation_util_1.setGroupActivationAtPath)({}, "streamDigitalAgents", true))).toBe(true);
    });
    (0, vitest_1.it)("isCalculationPathActive skips inactive subtree", () => {
        const formData = (0, v2_group_activation_util_1.setGroupActivationAtPath)({}, "streamDigitalAgents", false);
        (0, vitest_1.expect)((0, v2_group_activation_util_1.isCalculationPathActive)(formData, "/streamDigitalAgents/localParams")).toBe(false);
        (0, vitest_1.expect)((0, v2_group_activation_util_1.isCalculationPathActive)(formData, "/summary/total")).toBe(true);
    });
    (0, vitest_1.it)("seeds inactive defaults for Источники данных and Контроль моделей", () => {
        const ui = {
            streamDataSources: {
                "ui:options": { groupActivatable: true, groupActive: false },
            },
            streamModelControl: {
                "ui:options": { groupActivatable: true, groupActive: false },
            },
        };
        const seeded = (0, v2_group_activation_util_1.ensureGroupActivationDefaults)({}, ui);
        (0, vitest_1.expect)(seeded.groupActivation).toEqual({
            streamDataSources: false,
            streamModelControl: false,
        });
        (0, vitest_1.expect)((0, v2_group_activation_util_1.isCalculationPathActive)(seeded, "/streamDataSources/field_u-7AkDrP")).toBe(false);
        (0, vitest_1.expect)((0, v2_group_activation_util_1.isCalculationPathActive)(seeded, "/streamModelControl/field_G0AoYAl8")).toBe(false);
    });
    (0, vitest_1.it)("finds trigger-gated activatable ancestor for typical work path", () => {
        const ui = {
            streamDataSources: {
                "ui:options": { groupActivatable: true, groupActive: false },
                field_typical: {
                    "ui:options": { archComponent: "typicalWork" },
                },
            },
        };
        (0, vitest_1.expect)((0, v2_group_activation_util_1.findTriggerGatedGroupActivatableAncestor)(ui, "streamDataSources.field_typical")).toBe("streamDataSources");
    });
    (0, vitest_1.it)("syncs trigger-gated group activation from live typical work rows", () => {
        const ui = {
            streamDataSources: {
                "ui:options": { groupActivatable: true, groupActive: false },
                field_typical: {
                    "ui:options": { archComponent: "typicalWork" },
                },
            },
        };
        const base = (0, v2_group_activation_util_1.ensureGroupActivationDefaults)({}, ui);
        const activated = (0, v2_group_activation_util_1.syncTriggerGatedGroupActivationFromTypicalWorks)(base, ui, {
            streamDataSources: {
                field_typical: [{ name: "Работа Кирилла" }],
            },
        });
        (0, vitest_1.expect)(activated.groupActivation).toEqual({ streamDataSources: true });
        const deactivated = (0, v2_group_activation_util_1.syncTriggerGatedGroupActivationFromTypicalWorks)(activated, ui, {
            streamDataSources: {
                field_typical: [],
            },
        });
        (0, vitest_1.expect)(deactivated.groupActivation).toEqual({ streamDataSources: false });
    });
});

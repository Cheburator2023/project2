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
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const v2_implementation_streams_util_1 = require("./v2-implementation-streams.util");
const v2_anketa_block_access_util_1 = require("./v2-anketa-block-access.util");
const vitest_1 = require("vitest");
const uiSchema = {
    streamDataSources: {
        "ui:options": {
            streamBlock: true,
            streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC,
            streamBlockRoles: ["ds"],
        },
        sourceTypicalTasks: { "ui:options": { archComponent: "typicalWork" } },
        atypicalTasks: { "ui:options": { archComponent: "atypicalWork" } },
    },
    streamPirm: {
        "ui:options": {
            streamBlock: true,
            streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM,
        },
    },
    generalInfo: { "ui:options": { sectionRole: "main" } },
};
(0, vitest_1.describe)("v2-anketa-block-access.util", () => {
    (0, vitest_1.it)("detects access points on stream blocks and arch work arrays", () => {
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.shouldApplyV2AnketaBlockAccessAtPath)(uiSchema, "streamDataSources")).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.shouldApplyV2AnketaBlockAccessAtPath)(uiSchema, "streamDataSources.sourceTypicalTasks")).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.shouldApplyV2AnketaBlockAccessAtPath)(uiSchema, "generalInfo")).toBe(false);
    });
    (0, vitest_1.it)("hides block when role and stream do not match", () => {
        const viewer = {
            roles: ["de"],
            streams: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM],
        };
        const restrictions = (0, v2_anketa_block_access_util_1.resolveV2AnketaBlockAccessRestrictionsForOutputPath)(uiSchema, "streamDataSources");
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.isBlockVisibleForUser)(viewer, restrictions)).toBe(false);
    });
    (0, vitest_1.it)("shows block when stream matches", () => {
        const viewer = {
            roles: ["de"],
            streams: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC],
        };
        const restrictions = (0, v2_anketa_block_access_util_1.resolveV2AnketaBlockAccessRestrictionsForOutputPath)(uiSchema, "streamDataSources");
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.isBlockVisibleForUser)(viewer, restrictions)).toBe(true);
    });
    (0, vitest_1.it)("shows all blocks for leads but masks foreign stream estimates", () => {
        const viewer = {
            roles: ["ds_lead"],
            streams: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC],
        };
        const pirmRestrictions = (0, v2_anketa_block_access_util_1.resolveV2AnketaBlockAccessRestrictionsForOutputPath)(uiSchema, "streamPirm");
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.isBlockVisibleForUser)(viewer, pirmRestrictions)).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.shouldMaskWorkEstimatesForUser)(viewer, pirmRestrictions.streamExecutors)).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.shouldMaskWorkEstimatesForUser)(viewer, (0, v2_anketa_block_access_util_1.resolveV2AnketaBlockAccessRestrictionsForOutputPath)(uiSchema, "streamDataSources").streamExecutors)).toBe(false);
    });
});

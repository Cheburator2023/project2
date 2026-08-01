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
    (0, vitest_1.it)("shows all stream tabs for Level A (ds/de/modelops) — full card detail", () => {
        const viewer = {
            roles: ["de"],
            streams: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM],
        };
        const restrictions = (0, v2_anketa_block_access_util_1.resolveV2AnketaBlockAccessRestrictionsForOutputPath)(uiSchema, "streamDataSources");
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.isBlockVisibleForUser)(viewer, restrictions)).toBe(true);
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
    (0, vitest_1.it)("shows all stream tabs for sacfg (level C) without own stream", () => {
        const viewer = {
            roles: ["sacfg"],
            streams: [],
        };
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.isBlockVisibleForUser)(viewer, (0, v2_anketa_block_access_util_1.resolveV2AnketaBlockAccessRestrictionsForOutputPath)(uiSchema, "streamPirm"))).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.isBlockVisibleForUser)(viewer, (0, v2_anketa_block_access_util_1.resolveV2AnketaBlockAccessRestrictionsForOutputPath)(uiSchema, "streamDataSources"))).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.shouldMaskWorkEstimatesForUser)(viewer, [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM])).toBe(false);
    });
    (0, vitest_1.it)("shows all stream tabs for sarep (level B) and masks foreign estimates", () => {
        const viewer = {
            roles: ["sarep"],
            streams: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM],
        };
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.isBlockVisibleForUser)(viewer, (0, v2_anketa_block_access_util_1.resolveV2AnketaBlockAccessRestrictionsForOutputPath)(uiSchema, "streamPirm"))).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.shouldMaskWorkEstimatesForUser)(viewer, [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM])).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.shouldMaskWorkEstimatesForUser)(viewer, [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM])).toBe(false);
    });
    (0, vitest_1.it)("excludes non-own stream panels from required complete targets for Level A", () => {
        const schema = {
            generalInfo: {
                "ui:options": { sectionRole: "main", workflowSectionId: "generalInfo" },
            },
            detailInfo: {
                "ui:options": { sectionRole: "main", workflowSectionId: "detailInfo" },
            },
            streamDataSources: {
                "ui:options": {
                    streamBlock: true,
                    streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC,
                    streamBlockRoles: ["ds"],
                },
            },
            streamPirm: {
                "ui:options": {
                    streamBlock: true,
                    streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM,
                },
            },
        };
        const dsViewer = {
            roles: ["ds"],
            streams: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC],
        };
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.collectRequiredWorkflowTargetsForViewer)(schema, {}, dsViewer, {
            applyAccessRules: true,
        })).toEqual([
            { kind: "main", sectionId: "generalInfo" },
            { kind: "main", sectionId: "detailInfo" },
            { kind: "main", sectionId: "streamDataSources" },
        ]);
    });
    (0, vitest_1.it)("masks all estimates for validator", () => {
        const viewer = {
            roles: ["validator"],
            streams: [],
        };
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.shouldMaskWorkEstimatesForUser)(viewer, [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC])).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.shouldMaskWorkEstimatesForUser)(viewer, [])).toBe(true);
    });
    (0, vitest_1.it)("masks foreign estimates for architect without own stream", () => {
        const viewer = {
            roles: ["architect"],
            streams: [],
        };
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.shouldMaskWorkEstimatesForUser)(viewer, [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM])).toBe(true);
    });
});
(0, vitest_1.describe)("представитель стрима: правка и подтверждение", () => {
    /** detailInfo намеренно помечен стрим-блоком модельных стримов — как в боевой схеме. */
    const schema = {
        generalInfo: { "ui:options": { sectionRole: "main" } },
        detailInfo: {
            "ui:options": {
                streamBlock: true,
                streamExecutor: [
                    v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB,
                    v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB,
                ],
            },
        },
        streamDadm: {
            "ui:options": {
                streamBlock: true,
                streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM,
            },
        },
        streamPirm: {
            "ui:options": {
                streamBlock: true,
                streamExecutor: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM,
            },
        },
    };
    const sarep = {
        roles: ["sarep"],
        streams: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM],
    };
    const rules = { applyAccessRules: true };
    (0, vitest_1.it)("даёт править свой стрим и запрещает чужой", () => {
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.isV2AnketaPathEditableForViewer)(sarep, schema, "streamDadm", rules)).toBe(true);
        // Вложенные поля наследуют доступ корневого стрим-блока.
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.isV2AnketaPathEditableForViewer)(sarep, schema, "streamDadm.atypicalTasks.0.name", rules)).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.isV2AnketaPathEditableForViewer)(sarep, schema, "streamPirm", rules)).toBe(false);
    });
    (0, vitest_1.it)("оставляет общие разделы редактируемыми, включая detailInfo", () => {
        // detailInfo — стрим-блок модельных стримов, но по требованиям это общая вкладка.
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.isV2AnketaPathEditableForViewer)(sarep, schema, "detailInfo", rules)).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.isV2AnketaPathEditableForViewer)(sarep, schema, "generalInfo", rules)).toBe(true);
    });
    (0, vitest_1.it)("разрешает подтверждать только раздел своего стрима", () => {
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.canViewerCompleteAnketaSection)(sarep, schema, "streamDadm", rules)).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.canViewerCompleteAnketaSection)(sarep, schema, "streamPirm", rules)).toBe(false);
        // Общие разделы закрывает ответственный за анкету, не представитель стрима.
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.canViewerCompleteAnketaSection)(sarep, schema, "detailInfo", rules)).toBe(false);
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.canViewerCompleteAnketaSection)(sarep, schema, "generalInfo", rules)).toBe(false);
    });
    (0, vitest_1.it)("никогда не даёт завершить анкету целиком", () => {
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.canViewerCompleteWholeAnketa)(sarep.roles)).toBe(false);
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.canViewerCompleteWholeAnketa)(["ds_lead"])).toBe(true);
    });
    (0, vitest_1.it)("не меняет поведение остальных ролей", () => {
        // Лид уровня B по-прежнему правит и подтверждает чужие стримы.
        const lead = {
            roles: ["ds_lead"],
            streams: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC],
        };
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.isV2AnketaPathEditableForViewer)(lead, schema, "streamPirm", rules)).toBe(true);
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.canViewerCompleteAnketaSection)(lead, schema, "streamPirm", rules)).toBe(true);
    });
    (0, vitest_1.it)("без стрима в группах закрывает все стрим-блоки, кроме общих", () => {
        const orphan = { roles: ["sarep"], streams: [] };
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.isV2AnketaPathEditableForViewer)(orphan, schema, "streamDadm", rules)).toBe(false);
        (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.isV2AnketaPathEditableForViewer)(orphan, schema, "generalInfo", rules)).toBe(true);
    });
    (0, vitest_1.describe)("серверная проверка workflow при сохранении", () => {
        const empty = { sections: {}, panelSections: {} };
        (0, vitest_1.it)("разрешает закрыть свой стрим и запрещает чужой и общий", () => {
            (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.collectForbiddenV2AnketaWorkflowChanges)(sarep, schema, empty, {
                panelSections: { streamDadm: "Заполнено" },
            })).toEqual([]);
            (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.collectForbiddenV2AnketaWorkflowChanges)(sarep, schema, empty, {
                panelSections: { streamPirm: "Заполнено" },
            })).toEqual([
                { path: "workflow.streamPirm", reason: "foreign_section_complete" },
            ]);
            (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.collectForbiddenV2AnketaWorkflowChanges)(sarep, schema, empty, {
                sections: { detailInfo: "Заполнено" },
            })).toEqual([
                { path: "workflow.detailInfo", reason: "foreign_section_complete" },
            ]);
        });
        (0, vitest_1.it)("разрешает автоматический переход общего раздела в «В работе»", () => {
            // markSectionInProgress срабатывает при первой правке — это не подтверждение.
            (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.collectForbiddenV2AnketaWorkflowChanges)(sarep, schema, { sections: { detailInfo: "Создано" } }, { sections: { detailInfo: "В работе" } })).toEqual([]);
        });
        (0, vitest_1.it)("запрещает глобальное «Заполнено» и не трогает другие роли", () => {
            const globalChange = { globalStatus: "Заполнено", sections: {} };
            (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.collectForbiddenV2AnketaWorkflowChanges)(sarep, schema, empty, globalChange)).toEqual([{ path: "workflow.globalStatus", reason: "global_complete" }]);
            const lead = {
                roles: ["ds_lead"],
                streams: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC],
            };
            (0, vitest_1.expect)((0, v2_anketa_block_access_util_1.collectForbiddenV2AnketaWorkflowChanges)(lead, schema, empty, globalChange)).toEqual([]);
        });
    });
});

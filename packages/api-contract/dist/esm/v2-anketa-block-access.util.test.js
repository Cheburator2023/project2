import { V2_IMPLEMENTATION_STREAM } from "./v2-implementation-streams.util";
import { canViewerCompleteAnketaSection, canViewerCompleteWholeAnketa, collectForbiddenV2AnketaWorkflowChanges, collectRequiredWorkflowTargetsForViewer, isBlockVisibleForUser, isV2AnketaPathEditableForViewer, resolveV2AnketaBlockAccessRestrictionsForOutputPath, shouldApplyV2AnketaBlockAccessAtPath, shouldMaskWorkEstimatesForUser, } from "./v2-anketa-block-access.util";
import { describe, expect, it } from "vitest";
const uiSchema = {
    streamDataSources: {
        "ui:options": {
            streamBlock: true,
            streamExecutor: V2_IMPLEMENTATION_STREAM.IDSRC,
            streamBlockRoles: ["ds"],
        },
        sourceTypicalTasks: { "ui:options": { archComponent: "typicalWork" } },
        atypicalTasks: { "ui:options": { archComponent: "atypicalWork" } },
    },
    streamPirm: {
        "ui:options": {
            streamBlock: true,
            streamExecutor: V2_IMPLEMENTATION_STREAM.PIRM,
        },
    },
    generalInfo: { "ui:options": { sectionRole: "main" } },
};
describe("v2-anketa-block-access.util", () => {
    it("detects access points on stream blocks and arch work arrays", () => {
        expect(shouldApplyV2AnketaBlockAccessAtPath(uiSchema, "streamDataSources")).toBe(true);
        expect(shouldApplyV2AnketaBlockAccessAtPath(uiSchema, "streamDataSources.sourceTypicalTasks")).toBe(true);
        expect(shouldApplyV2AnketaBlockAccessAtPath(uiSchema, "generalInfo")).toBe(false);
    });
    it("shows all stream tabs for Level A (ds/de/modelops) — full card detail", () => {
        const viewer = {
            roles: ["de"],
            streams: [V2_IMPLEMENTATION_STREAM.DADM],
        };
        const restrictions = resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema, "streamDataSources");
        expect(isBlockVisibleForUser(viewer, restrictions)).toBe(true);
    });
    it("shows block when stream matches", () => {
        const viewer = {
            roles: ["de"],
            streams: [V2_IMPLEMENTATION_STREAM.IDSRC],
        };
        const restrictions = resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema, "streamDataSources");
        expect(isBlockVisibleForUser(viewer, restrictions)).toBe(true);
    });
    it("shows all blocks for leads but masks foreign stream estimates", () => {
        const viewer = {
            roles: ["ds_lead"],
            streams: [V2_IMPLEMENTATION_STREAM.IDSRC],
        };
        const pirmRestrictions = resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema, "streamPirm");
        expect(isBlockVisibleForUser(viewer, pirmRestrictions)).toBe(true);
        expect(shouldMaskWorkEstimatesForUser(viewer, pirmRestrictions.streamExecutors)).toBe(true);
        expect(shouldMaskWorkEstimatesForUser(viewer, resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema, "streamDataSources").streamExecutors)).toBe(false);
    });
    it("shows all stream tabs for sacfg (level C) without own stream", () => {
        const viewer = {
            roles: ["sacfg"],
            streams: [],
        };
        expect(isBlockVisibleForUser(viewer, resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema, "streamPirm"))).toBe(true);
        expect(isBlockVisibleForUser(viewer, resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema, "streamDataSources"))).toBe(true);
        expect(shouldMaskWorkEstimatesForUser(viewer, [V2_IMPLEMENTATION_STREAM.PIRM])).toBe(false);
    });
    it("shows all stream tabs for sarep (level B) and masks foreign estimates", () => {
        const viewer = {
            roles: ["sarep"],
            streams: [V2_IMPLEMENTATION_STREAM.DADM],
        };
        expect(isBlockVisibleForUser(viewer, resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema, "streamPirm"))).toBe(true);
        expect(shouldMaskWorkEstimatesForUser(viewer, [V2_IMPLEMENTATION_STREAM.PIRM])).toBe(true);
        expect(shouldMaskWorkEstimatesForUser(viewer, [V2_IMPLEMENTATION_STREAM.DADM])).toBe(false);
    });
    it("excludes non-own stream panels from required complete targets for Level A", () => {
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
                    streamExecutor: V2_IMPLEMENTATION_STREAM.IDSRC,
                    streamBlockRoles: ["ds"],
                },
            },
            streamPirm: {
                "ui:options": {
                    streamBlock: true,
                    streamExecutor: V2_IMPLEMENTATION_STREAM.PIRM,
                },
            },
        };
        const dsViewer = {
            roles: ["ds"],
            streams: [V2_IMPLEMENTATION_STREAM.IDSRC],
        };
        expect(collectRequiredWorkflowTargetsForViewer(schema, {}, dsViewer, {
            applyAccessRules: true,
        })).toEqual([
            { kind: "main", sectionId: "generalInfo" },
            { kind: "main", sectionId: "detailInfo" },
            { kind: "main", sectionId: "streamDataSources" },
        ]);
    });
    it("masks all estimates for validator", () => {
        const viewer = {
            roles: ["validator"],
            streams: [],
        };
        expect(shouldMaskWorkEstimatesForUser(viewer, [V2_IMPLEMENTATION_STREAM.IDSRC])).toBe(true);
        expect(shouldMaskWorkEstimatesForUser(viewer, [])).toBe(true);
    });
    it("masks foreign estimates for architect without own stream", () => {
        const viewer = {
            roles: ["architect"],
            streams: [],
        };
        expect(shouldMaskWorkEstimatesForUser(viewer, [V2_IMPLEMENTATION_STREAM.PIRM])).toBe(true);
    });
});
describe("представитель стрима: правка и подтверждение", () => {
    /** detailInfo намеренно помечен стрим-блоком модельных стримов — как в боевой схеме. */
    const schema = {
        generalInfo: { "ui:options": { sectionRole: "main" } },
        detailInfo: {
            "ui:options": {
                streamBlock: true,
                streamExecutor: [
                    V2_IMPLEMENTATION_STREAM.KMBKCB,
                    V2_IMPLEMENTATION_STREAM.RB,
                ],
            },
        },
        streamDadm: {
            "ui:options": {
                streamBlock: true,
                streamExecutor: V2_IMPLEMENTATION_STREAM.DADM,
            },
        },
        streamPirm: {
            "ui:options": {
                streamBlock: true,
                streamExecutor: V2_IMPLEMENTATION_STREAM.PIRM,
            },
        },
    };
    const sarep = {
        roles: ["sarep"],
        streams: [V2_IMPLEMENTATION_STREAM.DADM],
    };
    const rules = { applyAccessRules: true };
    it("даёт править свой стрим и запрещает чужой", () => {
        expect(isV2AnketaPathEditableForViewer(sarep, schema, "streamDadm", rules)).toBe(true);
        // Вложенные поля наследуют доступ корневого стрим-блока.
        expect(isV2AnketaPathEditableForViewer(sarep, schema, "streamDadm.atypicalTasks.0.name", rules)).toBe(true);
        expect(isV2AnketaPathEditableForViewer(sarep, schema, "streamPirm", rules)).toBe(false);
    });
    it("оставляет общие разделы редактируемыми, включая detailInfo", () => {
        // detailInfo — стрим-блок модельных стримов, но по требованиям это общая вкладка.
        expect(isV2AnketaPathEditableForViewer(sarep, schema, "detailInfo", rules)).toBe(true);
        expect(isV2AnketaPathEditableForViewer(sarep, schema, "generalInfo", rules)).toBe(true);
    });
    it("разрешает подтверждать только раздел своего стрима", () => {
        expect(canViewerCompleteAnketaSection(sarep, schema, "streamDadm", rules)).toBe(true);
        expect(canViewerCompleteAnketaSection(sarep, schema, "streamPirm", rules)).toBe(false);
        // Общие разделы закрывает ответственный за анкету, не представитель стрима.
        expect(canViewerCompleteAnketaSection(sarep, schema, "detailInfo", rules)).toBe(false);
        expect(canViewerCompleteAnketaSection(sarep, schema, "generalInfo", rules)).toBe(false);
    });
    it("никогда не даёт завершить анкету целиком", () => {
        expect(canViewerCompleteWholeAnketa(sarep.roles)).toBe(false);
        expect(canViewerCompleteWholeAnketa(["ds_lead"])).toBe(true);
    });
    it("не меняет поведение остальных ролей", () => {
        // Лид уровня B по-прежнему правит и подтверждает чужие стримы.
        const lead = {
            roles: ["ds_lead"],
            streams: [V2_IMPLEMENTATION_STREAM.IDSRC],
        };
        expect(isV2AnketaPathEditableForViewer(lead, schema, "streamPirm", rules)).toBe(true);
        expect(canViewerCompleteAnketaSection(lead, schema, "streamPirm", rules)).toBe(true);
    });
    it("без стрима в группах закрывает все стрим-блоки, кроме общих", () => {
        const orphan = { roles: ["sarep"], streams: [] };
        expect(isV2AnketaPathEditableForViewer(orphan, schema, "streamDadm", rules)).toBe(false);
        expect(isV2AnketaPathEditableForViewer(orphan, schema, "generalInfo", rules)).toBe(true);
    });
    describe("серверная проверка workflow при сохранении", () => {
        const empty = { sections: {}, panelSections: {} };
        it("разрешает закрыть свой стрим и запрещает чужой и общий", () => {
            expect(collectForbiddenV2AnketaWorkflowChanges(sarep, schema, empty, {
                panelSections: { streamDadm: "Заполнено" },
            })).toEqual([]);
            expect(collectForbiddenV2AnketaWorkflowChanges(sarep, schema, empty, {
                panelSections: { streamPirm: "Заполнено" },
            })).toEqual([
                { path: "workflow.streamPirm", reason: "foreign_section_complete" },
            ]);
            expect(collectForbiddenV2AnketaWorkflowChanges(sarep, schema, empty, {
                sections: { detailInfo: "Заполнено" },
            })).toEqual([
                { path: "workflow.detailInfo", reason: "foreign_section_complete" },
            ]);
        });
        it("разрешает автоматический переход общего раздела в «В работе»", () => {
            // markSectionInProgress срабатывает при первой правке — это не подтверждение.
            expect(collectForbiddenV2AnketaWorkflowChanges(sarep, schema, { sections: { detailInfo: "Создано" } }, { sections: { detailInfo: "В работе" } })).toEqual([]);
        });
        it("запрещает глобальное «Заполнено» и не трогает другие роли", () => {
            const globalChange = { globalStatus: "Заполнено", sections: {} };
            expect(collectForbiddenV2AnketaWorkflowChanges(sarep, schema, empty, globalChange)).toEqual([{ path: "workflow.globalStatus", reason: "global_complete" }]);
            const lead = {
                roles: ["ds_lead"],
                streams: [V2_IMPLEMENTATION_STREAM.IDSRC],
            };
            expect(collectForbiddenV2AnketaWorkflowChanges(lead, schema, empty, globalChange)).toEqual([]);
        });
    });
});

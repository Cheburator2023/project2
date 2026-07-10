import type { V2LogicGraphDto, V2LogicRuleDto } from "./v2-template.types";
import { type PatchV2TypicalWorksLogicOptions } from "./v2-default-typical-works-logic.util";
/** Dot-пути массивов «Нетиповые работы» из uiSchema (archComponent: atypicalWork). */
export declare function collectAtypicalWorkArrayPaths(uiSchema: unknown, prefix?: string): string[];
export declare function buildAtypicalWorkRowTotalRule(arrayPath: string): V2LogicRuleDto;
export declare function buildUnifiedAtypicalTotalRule(arrayPaths: string[]): V2LogicRuleDto | null;
export type PatchV2AtypicalWorksLogicOptions = {
    uiSchema?: unknown;
};
/** Патч типовых + нетиповых правил калькуляции под uiSchema шаблона. */
export declare function patchV2AnketaCalculationLogicRules(logic: V2LogicGraphDto, options?: PatchV2TypicalWorksLogicOptions): V2LogicGraphDto;
/** Добавляет row_computed и unified-atypical-total для arch-блоков «Нетиповые работы». */
export declare function patchV2AtypicalWorksLogicRules(logic: V2LogicGraphDto, options?: PatchV2AtypicalWorksLogicOptions): V2LogicGraphDto;
/** Строки всех массивов нетиповых работ из formData по путям uiSchema. */
export declare function collectAtypicalWorkRowsFromData(data: Record<string, unknown>, uiSchema?: unknown): unknown[];

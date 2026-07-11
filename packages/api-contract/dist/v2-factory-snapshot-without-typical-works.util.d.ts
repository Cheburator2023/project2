import type { V2LogicGraphDto } from "./v2-template.types";
export type V2TemplateSnapshotLike = {
    jsonSchema: unknown;
    uiSchema: unknown;
    logic: V2LogicGraphDto;
    dictionariesSnapshot?: unknown;
    releaseNotes?: string | null;
};
/** Убирает сохранённые правила типовых работ из logic-графа шаблона. */
export declare function stripTypicalWorksLogicRules(logic: V2LogicGraphDto, uiSchema: unknown): V2LogicGraphDto;
/**
 * Заводской снимок без типовых работ: структура анкеты сохраняется,
 * каталог работ не сидится, автогенерация типовых работ отключена.
 */
export declare function prepareFactorySnapshotWithoutTypicalWorks<T extends V2TemplateSnapshotLike>(snapshot: T): T;

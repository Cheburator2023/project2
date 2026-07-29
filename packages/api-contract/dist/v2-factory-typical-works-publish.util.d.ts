import { type V2TypicalWorkCardDto } from "./v2-typical-work.types";
/** Строка catalog snapshot (зеркало V2FactoryTypicalWork + any_of). */
export type V2FactoryCatalogWorkRow = {
    stream: string;
    component: string;
    stage: string;
    name: string;
    originalName: string;
    workType: string;
    norm: number | null;
    normRaw: string;
    triggerParam: string;
    triggerParams: string[];
    triggerRules?: Array<{
        paramName: string;
        paramCode?: string;
        schemaFieldUid?: string;
        operator: "=" | "!=" | "in" | "exists" | "unresolved";
        values: string[];
        valueCode?: string;
        valueLabel?: string;
    }>;
    triggerArchCount?: {
        kind: string;
        steps: Array<{
            count: number;
            coefficient: number;
        }>;
        combinator?: "and" | "or";
    } | null;
    laborParams: string[];
    laborCoefficients?: Array<{
        paramName: string;
        paramCode?: string;
        schemaFieldUid?: string;
        kind?: "by_value" | "any_of";
        values: Array<{
            label: string;
            code?: string;
            coefficient: number;
        }>;
        anyOf?: {
            valueCodes: string[];
            valueLabels: string[];
            coeffOn: number;
            coeffOff: number;
        };
    }>;
    laborArchCounts?: Array<{
        kind: string;
        paramName?: string | null;
        steps: Array<{
            count: number;
            coefficient: number;
            operator?: ">=" | "<=" | "=" | ">" | "<";
            coefficientFormula?: string | null;
        }>;
    }>;
    formulaText?: string;
    roundingMode?: "CEIL" | "FLOOR" | "ROUND" | "NONE";
    roundingStep?: number | null;
};
export type V2FactoryRegistryWorkItem = {
    id: string;
    name: string;
    archComponentType: string;
    workType: string | null;
    streams: string[];
    normsByStream: Record<string, number | null>;
};
export type V2FactoryPublishDroppedField = {
    workId: string;
    workName: string;
    streamExecutor: string;
    field: string;
    reason: string;
};
export type V2FactoryPublishReport = {
    registryWorks: number;
    catalogAdded: number;
    catalogUpdated: number;
    catalogUnchanged: number;
    catalogPreserved: number;
    dropped: V2FactoryPublishDroppedField[];
    legacyStreamCatalogRows: number;
};
export type PublishFactoryTypicalWorksBundleInput = {
    cards: V2TypicalWorkCardDto[];
    existingCatalog: V2FactoryCatalogWorkRow[];
    templateId: string;
    templateName?: string;
    /** Дата для выбора активной нормы (YYYY-MM-DD). */
    coverageDate?: string;
};
export type PublishFactoryTypicalWorksBundleResult = {
    registry: {
        meta: {
            snapshotVersion: number;
            factoryBundle: boolean;
            description: string;
            sourceTemplateId: string;
            sourceTemplateName?: string;
            counts: {
                works: number;
            };
        };
        works: V2FactoryRegistryWorkItem[];
    };
    catalogRows: V2FactoryCatalogWorkRow[];
    report: V2FactoryPublishReport;
};
export declare function extractPublishWorkStage(name: string): string | null;
export declare function normalizePublishArchComponent(raw: string): string;
export declare function buildFactoryCatalogRowKey(row: Pick<V2FactoryCatalogWorkRow, "component" | "stage" | "name" | "stream">): string;
/**
 * Собирает registry + catalog rows из полных карточек и существующего каталога.
 * Catalog: upsert по (component, stage, name, stream); чужие строки сохраняются.
 * Registry: полная замена списком из dump.
 */
export declare function publishFactoryTypicalWorksBundle(input: PublishFactoryTypicalWorksBundleInput): PublishFactoryTypicalWorksBundleResult;
/** Пересчёт meta.counts / streams / components / stages для catalog snapshot. */
export declare function rebuildFactoryCatalogSnapshotMeta(typicalWorks: V2FactoryCatalogWorkRow[], previous?: {
    snapshotVersion?: number;
    description?: string;
}): {
    snapshotVersion: number;
    factoryBundle: boolean;
    description: string;
    counts: Record<string, number>;
    streams: string[];
    components: string[];
    stages: string[];
};

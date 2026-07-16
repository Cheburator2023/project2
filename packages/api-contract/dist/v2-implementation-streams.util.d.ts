/** Именованные коды стрим-исполнителя (значение = код в formData / логике). */
export declare const V2_IMPLEMENTATION_STREAM: {
    readonly KMBKCB: "kmbkcb";
    readonly RB: "rb";
    readonly PTITPC: "ptitpc";
    readonly FINMDL: "finmdl";
    readonly RND: "rnd";
    readonly IDSRC: "idsrc";
    readonly MDLCTL: "mdlctl";
    readonly DADM: "dadm";
    readonly PIRM: "pirm";
    readonly STRDAT: "strdat";
    readonly DIGAGT: "digagt";
};
/** Стрим-исполнитель анкеты (`generalInfo.implementationStream`): ключ в formData / логике. */
export declare const V2_IMPLEMENTATION_STREAM_CODES: readonly ["kmbkcb", "rb", "ptitpc", "finmdl", "rnd", "idsrc", "mdlctl", "dadm", "pirm", "strdat", "digagt"];
export type V2ImplementationStreamCode = (typeof V2_IMPLEMENTATION_STREAM_CODES)[number];
/** Подписи для UI / справочника (значение в formData — код). */
export declare const V2_IMPLEMENTATION_STREAM_LABELS: Record<V2ImplementationStreamCode, string>;
export declare const V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE = "v2.generalInfo.implementationStream";
export declare function isV2ImplementationStreamCode(value: string): value is V2ImplementationStreamCode;
export declare function resolveImplementationStreamLabel(code: string): string;
/** Пары для JSON Schema enum / enumNames и seed справочника. */
export declare function buildImplementationStreamEnumPair(): {
    enums: string[];
    enumNames: string[];
};

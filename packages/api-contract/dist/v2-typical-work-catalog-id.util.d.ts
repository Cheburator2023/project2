export type TypicalWorkCatalogIdLike = {
    id: string;
    name: string;
};
/**
 * Заводской logic snapshot хранит allowedWorkIds реестра (f8e3…4004),
 * а works в БД шаблона могут иметь другие uuid после seed/remap.
 * Сопоставляем по имени работы из factory registry.
 */
export declare function remapFactoryAllowedWorkIdsToTemplateWorks(allowedWorkIds: readonly string[], templateWorks: readonly TypicalWorkCatalogIdLike[], factoryRegistryWorks: readonly TypicalWorkCatalogIdLike[]): string[];

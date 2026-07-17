"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remapFactoryAllowedWorkIdsToTemplateWorks = remapFactoryAllowedWorkIdsToTemplateWorks;
/**
 * Заводской logic snapshot хранит allowedWorkIds реестра (f8e3…4004),
 * а works в БД шаблона могут иметь другие uuid после seed/remap.
 * Сопоставляем по имени работы из factory registry.
 */
function remapFactoryAllowedWorkIdsToTemplateWorks(allowedWorkIds, templateWorks, factoryRegistryWorks) {
    if (allowedWorkIds.length === 0)
        return [];
    const templateById = new Map(templateWorks.map((work) => [work.id, work]));
    const templateByName = new Map(templateWorks.map((work) => [work.name.trim(), work]));
    const registryById = new Map(factoryRegistryWorks.map((work) => [work.id, work]));
    const resolved = [];
    for (const id of allowedWorkIds) {
        if (templateById.has(id)) {
            resolved.push(id);
            continue;
        }
        const registry = registryById.get(id);
        if (!registry)
            continue;
        const match = templateByName.get(registry.name.trim());
        if (match)
            resolved.push(match.id);
    }
    return [...new Set(resolved)];
}

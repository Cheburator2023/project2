import { type V2ImplementationStreamCode } from "./v2-implementation-streams.util";
import { type V2ImplementationStreamCatalogEntry } from "./v2-implementation-stream-catalog.util";
/** Значение `ui:options.streamExecutor` у стрим-блока — код или массив кодов implementationStream. */
export type V2StreamBlockExecutor = V2ImplementationStreamCode;
export type V2StreamBlockExecutorValue = V2StreamBlockExecutor | V2StreamBlockExecutor[];
/** Нормализует код или legacy-подпись стрима → код V2_IMPLEMENTATION_STREAM / каталога. */
export declare function normalizeStreamBlockExecutor(value: string, catalog?: readonly V2ImplementationStreamCatalogEntry[]): V2ImplementationStreamCode | null;
/** Нормализует одно значение или массив в уникальный список кодов (порядок сохраняется). */
export declare function normalizeStreamBlockExecutors(value: unknown, catalog?: readonly V2ImplementationStreamCatalogEntry[]): V2ImplementationStreamCode[];
/** Сериализация в uiSchema: один код — строка, несколько — массив. */
export declare function serializeStreamBlockExecutors(executors: readonly V2ImplementationStreamCode[]): V2StreamBlockExecutorValue | undefined;
export declare function resolveStreamBlockExecutorsLabel(value: string | readonly string[] | undefined | null, catalog?: readonly V2ImplementationStreamCatalogEntry[]): string;
export declare function inferLegacyStreamBlockExecutorCode(blockKey: string): V2ImplementationStreamCode | null;
export declare function resolveStreamBlockExecutorLabel(value: string, catalog?: readonly V2ImplementationStreamCatalogEntry[]): string;
/** Стримы БД / подписи, в которых ищется назначение работы для блока. */
export declare function resolveStreamBlockExecutorScopeStreams(executor: string, catalog?: readonly V2ImplementationStreamCatalogEntry[]): readonly string[];
/** Код implementationStream для имени стрима в БД типовых работ. */
export declare function resolveLogicStreamForDbExecutor(dbStream: string, catalog?: readonly V2ImplementationStreamCatalogEntry[]): V2ImplementationStreamCode | null;
/** Каноническое имя стрима в БД типовых работ для кода / legacy-значения. */
export declare function resolveLogicStreamDbExecutor(codeOrValue: string, catalog?: readonly V2ImplementationStreamCatalogEntry[]): string;

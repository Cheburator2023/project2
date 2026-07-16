import { type V2ImplementationStreamCode } from "./v2-implementation-streams.util";
/** Значение `ui:options.streamExecutor` у стрим-блока анкеты — код implementationStream. */
export type V2StreamBlockExecutor = V2ImplementationStreamCode;
/** Нормализует код или legacy-подпись стрима → код V2_IMPLEMENTATION_STREAM. */
export declare function normalizeStreamBlockExecutor(value: string): V2ImplementationStreamCode | null;
export declare function inferLegacyStreamBlockExecutorCode(blockKey: string): V2ImplementationStreamCode | null;
export declare function resolveStreamBlockExecutorLabel(value: string): string;
/** Стримы БД / подписи, в которых ищется назначение работы для блока. */
export declare function resolveStreamBlockExecutorScopeStreams(executor: string): readonly string[];
/** Код implementationStream для имени стрима в БД типовых работ. */
export declare function resolveLogicStreamForDbExecutor(dbStream: string): V2ImplementationStreamCode | null;
/** Каноническое имя стрима в БД типовых работ для кода / legacy-значения. */
export declare function resolveLogicStreamDbExecutor(codeOrValue: string): string;

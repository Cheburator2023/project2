"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_implementation_streams_util_1 = require("./v2-implementation-streams.util");
(0, vitest_1.describe)("v2-implementation-streams.util", () => {
    (0, vitest_1.it)("exposes stable codes with stream labels (keys ≤ 6 chars)", () => {
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_CODES).toEqual([
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.FINMDL,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.MDLCTL,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.STRDAT,
            v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DIGAGT,
        ]);
        for (const code of v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_CODES) {
            (0, vitest_1.expect)(code.length).toBeLessThanOrEqual(6);
        }
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB]).toBe("Разработка моделей КМБ и КСБ");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB]).toBe("Моделирование РБ");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC]).toBe("AI-модели партнерств");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.FINMDL]).toBe("Финансовое моделирование");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND]).toBe("Моделирование RnD");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC]).toBe("Источники данных");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.MDLCTL]).toBe("Контроль моделей");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM]).toBe("ДАДМ");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM]).toBe("Платформы и Решения для моделирования");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.STRDAT]).toBe("Потоковые данные");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DIGAGT]).toBe("Цифровые агенты");
    });
    (0, vitest_1.it)("builds enum/enumNames pairs for schema and select widgets", () => {
        (0, vitest_1.expect)((0, v2_implementation_streams_util_1.buildImplementationStreamEnumPair)()).toEqual({
            enums: [...v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_CODES],
            enumNames: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_CODES.map((code) => v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[code]),
        });
    });
    (0, vitest_1.it)("validates codes and resolves labels", () => {
        (0, vitest_1.expect)((0, v2_implementation_streams_util_1.isV2ImplementationStreamCode)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB)).toBe(true);
        (0, vitest_1.expect)((0, v2_implementation_streams_util_1.isV2ImplementationStreamCode)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM)).toBe(true);
        (0, vitest_1.expect)((0, v2_implementation_streams_util_1.isV2ImplementationStreamCode)("Моделирование РБ")).toBe(false);
        (0, vitest_1.expect)((0, v2_implementation_streams_util_1.resolveImplementationStreamLabel)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB)).toBe("Моделирование РБ");
        (0, vitest_1.expect)((0, v2_implementation_streams_util_1.resolveImplementationStreamLabel)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC)).toBe("Источники данных");
        (0, vitest_1.expect)((0, v2_implementation_streams_util_1.resolveImplementationStreamLabel)("unknown")).toBe("unknown");
    });
});

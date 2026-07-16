"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_implementation_streams_util_1 = require("./v2-implementation-streams.util");
(0, vitest_1.describe)("v2-implementation-streams.util", () => {
    (0, vitest_1.it)("exposes stable codes with stream labels (keys ≤ 6 chars)", () => {
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_CODES).toEqual([
            "kmbkcb",
            "rb",
            "ptitpc",
            "finmdl",
            "rnd",
            "idsrc",
            "mdlctl",
            "pirm",
            "strdat",
            "digagt",
        ]);
        for (const code of v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_CODES) {
            (0, vitest_1.expect)(code.length).toBeLessThanOrEqual(6);
        }
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS.kmbkcb).toBe("Разработка моделей КМБ и КСБ");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS.rb).toBe("Моделирование РБ");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS.ptitpc).toBe("AI-модели партнерств");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS.finmdl).toBe("Финансовое моделирование");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS.rnd).toBe("Моделирование RnD");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS.idsrc).toBe("Источники данных");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS.mdlctl).toBe("Контроль моделей");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS.pirm).toBe("Платформы и Решения для моделирования");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS.strdat).toBe("Потоковые данные");
        (0, vitest_1.expect)(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS.digagt).toBe("Цифровые агенты");
    });
    (0, vitest_1.it)("builds enum/enumNames pairs for schema and select widgets", () => {
        (0, vitest_1.expect)((0, v2_implementation_streams_util_1.buildImplementationStreamEnumPair)()).toEqual({
            enums: [
                "kmbkcb",
                "rb",
                "ptitpc",
                "finmdl",
                "rnd",
                "idsrc",
                "mdlctl",
                "pirm",
                "strdat",
                "digagt",
            ],
            enumNames: [
                "Разработка моделей КМБ и КСБ",
                "Моделирование РБ",
                "AI-модели партнерств",
                "Финансовое моделирование",
                "Моделирование RnD",
                "Источники данных",
                "Контроль моделей",
                "Платформы и Решения для моделирования",
                "Потоковые данные",
                "Цифровые агенты",
            ],
        });
    });
    (0, vitest_1.it)("validates codes and resolves labels", () => {
        (0, vitest_1.expect)((0, v2_implementation_streams_util_1.isV2ImplementationStreamCode)("rb")).toBe(true);
        (0, vitest_1.expect)((0, v2_implementation_streams_util_1.isV2ImplementationStreamCode)("pirm")).toBe(true);
        (0, vitest_1.expect)((0, v2_implementation_streams_util_1.isV2ImplementationStreamCode)("Моделирование РБ")).toBe(false);
        (0, vitest_1.expect)((0, v2_implementation_streams_util_1.resolveImplementationStreamLabel)("rb")).toBe("Моделирование РБ");
        (0, vitest_1.expect)((0, v2_implementation_streams_util_1.resolveImplementationStreamLabel)("idsrc")).toBe("Источники данных");
        (0, vitest_1.expect)((0, v2_implementation_streams_util_1.resolveImplementationStreamLabel)("unknown")).toBe("unknown");
    });
});

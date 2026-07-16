import { describe, expect, it } from "vitest";
import { buildImplementationStreamEnumPair, isV2ImplementationStreamCode, resolveImplementationStreamLabel, V2_IMPLEMENTATION_STREAM_CODES, V2_IMPLEMENTATION_STREAM_LABELS, } from "./v2-implementation-streams.util";
describe("v2-implementation-streams.util", () => {
    it("exposes stable codes with stream labels (keys ≤ 6 chars)", () => {
        expect(V2_IMPLEMENTATION_STREAM_CODES).toEqual([
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
        for (const code of V2_IMPLEMENTATION_STREAM_CODES) {
            expect(code.length).toBeLessThanOrEqual(6);
        }
        expect(V2_IMPLEMENTATION_STREAM_LABELS.kmbkcb).toBe("Разработка моделей КМБ и КСБ");
        expect(V2_IMPLEMENTATION_STREAM_LABELS.rb).toBe("Моделирование РБ");
        expect(V2_IMPLEMENTATION_STREAM_LABELS.ptitpc).toBe("AI-модели партнерств");
        expect(V2_IMPLEMENTATION_STREAM_LABELS.finmdl).toBe("Финансовое моделирование");
        expect(V2_IMPLEMENTATION_STREAM_LABELS.rnd).toBe("Моделирование RnD");
        expect(V2_IMPLEMENTATION_STREAM_LABELS.idsrc).toBe("Источники данных");
        expect(V2_IMPLEMENTATION_STREAM_LABELS.mdlctl).toBe("Контроль моделей");
        expect(V2_IMPLEMENTATION_STREAM_LABELS.pirm).toBe("Платформы и Решения для моделирования");
        expect(V2_IMPLEMENTATION_STREAM_LABELS.strdat).toBe("Потоковые данные");
        expect(V2_IMPLEMENTATION_STREAM_LABELS.digagt).toBe("Цифровые агенты");
    });
    it("builds enum/enumNames pairs for schema and select widgets", () => {
        expect(buildImplementationStreamEnumPair()).toEqual({
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
    it("validates codes and resolves labels", () => {
        expect(isV2ImplementationStreamCode("rb")).toBe(true);
        expect(isV2ImplementationStreamCode("pirm")).toBe(true);
        expect(isV2ImplementationStreamCode("Моделирование РБ")).toBe(false);
        expect(resolveImplementationStreamLabel("rb")).toBe("Моделирование РБ");
        expect(resolveImplementationStreamLabel("idsrc")).toBe("Источники данных");
        expect(resolveImplementationStreamLabel("unknown")).toBe("unknown");
    });
});

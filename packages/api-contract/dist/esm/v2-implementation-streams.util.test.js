import { describe, expect, it } from "vitest";
import { buildImplementationStreamEnumPair, isV2ImplementationStreamCode, resolveImplementationStreamLabel, V2_IMPLEMENTATION_STREAM, V2_IMPLEMENTATION_STREAM_CODES, V2_IMPLEMENTATION_STREAM_LABELS, } from "./v2-implementation-streams.util";
describe("v2-implementation-streams.util", () => {
    it("exposes stable codes with stream labels (keys ≤ 6 chars)", () => {
        expect(V2_IMPLEMENTATION_STREAM_CODES).toEqual([
            V2_IMPLEMENTATION_STREAM.KMBKCB,
            V2_IMPLEMENTATION_STREAM.RB,
            V2_IMPLEMENTATION_STREAM.PTITPC,
            V2_IMPLEMENTATION_STREAM.FINMDL,
            V2_IMPLEMENTATION_STREAM.RND,
            V2_IMPLEMENTATION_STREAM.IDSRC,
            V2_IMPLEMENTATION_STREAM.MDLCTL,
            V2_IMPLEMENTATION_STREAM.DADM,
            V2_IMPLEMENTATION_STREAM.PIRM,
            V2_IMPLEMENTATION_STREAM.STRDAT,
            V2_IMPLEMENTATION_STREAM.DIGAGT,
        ]);
        for (const code of V2_IMPLEMENTATION_STREAM_CODES) {
            expect(code.length).toBeLessThanOrEqual(6);
        }
        expect(V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.KMBKCB]).toBe("Разработка моделей КМБ и КСБ");
        expect(V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.RB]).toBe("Моделирование РБ");
        expect(V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.PTITPC]).toBe("AI-модели партнерств");
        expect(V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.FINMDL]).toBe("Финансовое моделирование");
        expect(V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.RND]).toBe("Моделирование RnD");
        expect(V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.IDSRC]).toBe("Источники данных");
        expect(V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.MDLCTL]).toBe("Контроль моделей");
        expect(V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.DADM]).toBe("ДАДМ");
        expect(V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.PIRM]).toBe("Платформы и Решения для моделирования");
        expect(V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.STRDAT]).toBe("Потоковые данные");
        expect(V2_IMPLEMENTATION_STREAM_LABELS[V2_IMPLEMENTATION_STREAM.DIGAGT]).toBe("Цифровые агенты");
    });
    it("builds enum/enumNames pairs for schema and select widgets", () => {
        expect(buildImplementationStreamEnumPair()).toEqual({
            enums: [...V2_IMPLEMENTATION_STREAM_CODES],
            enumNames: V2_IMPLEMENTATION_STREAM_CODES.map((code) => V2_IMPLEMENTATION_STREAM_LABELS[code]),
        });
    });
    it("validates codes and resolves labels", () => {
        expect(isV2ImplementationStreamCode(V2_IMPLEMENTATION_STREAM.RB)).toBe(true);
        expect(isV2ImplementationStreamCode(V2_IMPLEMENTATION_STREAM.PIRM)).toBe(true);
        expect(isV2ImplementationStreamCode("Моделирование РБ")).toBe(false);
        expect(resolveImplementationStreamLabel(V2_IMPLEMENTATION_STREAM.RB)).toBe("Моделирование РБ");
        expect(resolveImplementationStreamLabel(V2_IMPLEMENTATION_STREAM.IDSRC)).toBe("Источники данных");
        expect(resolveImplementationStreamLabel("unknown")).toBe("unknown");
    });
});

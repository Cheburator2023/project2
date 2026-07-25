import { describe, expect, it } from "vitest";
import { V2_IMPLEMENTATION_STREAM } from "./v2-implementation-streams.util";
import { typicalWorkAssignedToExecutorStream } from "./v2-executor-streams.util";
import { compareModelStreamTypicalWorkNames, dedupeTypicalWorkRowsByWorkId, isModelStreamTypicalWorkVisibleInSummary, isV2ModelStreamUmbrellaLabel, V2_MODEL_STREAM_CHILD_DB_NAMES, V2_MODEL_STREAM_EXECUTOR, V2_MODEL_STREAM_REGISTRY_STREAM_NAMES, } from "./v2-model-stream-typical-works.constants";
describe("V2_MODEL_STREAM_REGISTRY_STREAM_NAMES", () => {
    it("lists mother + five child DB names for factory assignments", () => {
        expect(V2_MODEL_STREAM_REGISTRY_STREAM_NAMES).toEqual([
            V2_MODEL_STREAM_EXECUTOR,
            ...V2_MODEL_STREAM_CHILD_DB_NAMES,
        ]);
        expect(V2_MODEL_STREAM_CHILD_DB_NAMES).toHaveLength(5);
        expect(isV2ModelStreamUmbrellaLabel(V2_MODEL_STREAM_EXECUTOR)).toBe(true);
        for (const child of V2_MODEL_STREAM_CHILD_DB_NAMES) {
            expect(typicalWorkAssignedToExecutorStream([...V2_MODEL_STREAM_REGISTRY_STREAM_NAMES], V2_IMPLEMENTATION_STREAM.KMBKCB)).toBe(true);
            expect(typicalWorkAssignedToExecutorStream([child], V2_MODEL_STREAM_EXECUTOR)).toBe(true);
        }
    });
});
describe("compareModelStreamTypicalWorkNames", () => {
    it("orders model stream stages like CSV", () => {
        const names = [
            "AutoML: внедрение",
            "05. Разработка модели",
            "01. Постановка задачи",
            "02. Поиск данных",
            "05A. Разработка пилотной модели (MVP)",
        ];
        names.sort(compareModelStreamTypicalWorkNames);
        expect(names).toEqual([
            "01. Постановка задачи",
            "02. Поиск данных",
            "05A. Разработка пилотной модели (MVP)",
            "05. Разработка модели",
            "AutoML: внедрение",
        ]);
    });
});
describe("dedupeTypicalWorkRowsByWorkId", () => {
    it("keeps one row per workId and sums coefficient/total", () => {
        const workId = "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4001";
        const rows = dedupeTypicalWorkRowsByWorkId([
            {
                workId,
                name: "07. Разработка витрины для применения модели",
                estimateHoursPerDay: 56,
                coefficient: 1,
                total: 56,
            },
            {
                workId,
                name: "07. Разработка витрины для применения модели",
                estimateHoursPerDay: 56,
                coefficient: 1,
                total: 56,
            },
            {
                workId,
                name: "07. Разработка витрины для применения модели",
                estimateHoursPerDay: 56,
                coefficient: 1,
                total: 56,
            },
            {
                workId,
                name: "07. Разработка витрины для применения модели",
                estimateHoursPerDay: 56,
                coefficient: 1,
                total: 56,
            },
        ]);
        expect(rows).toHaveLength(1);
        expect(rows[0]?.coefficient).toBe(4);
        expect(rows[0]?.total).toBe(224);
        expect(rows[0]).toMatchObject({
            coefficientDisplay: "×4",
            sourceName: "×4",
        });
    });
});
describe("isModelStreamTypicalWorkVisibleInSummary", () => {
    it("hides zero-total placeholder rows", () => {
        expect(isModelStreamTypicalWorkVisibleInSummary({ total: 0 })).toBe(false);
        expect(isModelStreamTypicalWorkVisibleInSummary({ total: 33 })).toBe(true);
    });
});

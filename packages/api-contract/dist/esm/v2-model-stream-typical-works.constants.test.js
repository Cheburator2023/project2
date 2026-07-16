import { describe, expect, it } from "vitest";
import { compareModelStreamTypicalWorkNames } from "./v2-model-stream-typical-works.constants";
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

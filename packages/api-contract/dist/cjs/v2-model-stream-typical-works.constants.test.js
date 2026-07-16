"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_model_stream_typical_works_constants_1 = require("./v2-model-stream-typical-works.constants");
(0, vitest_1.describe)("compareModelStreamTypicalWorkNames", () => {
    (0, vitest_1.it)("orders model stream stages like CSV", () => {
        const names = [
            "AutoML: внедрение",
            "05. Разработка модели",
            "01. Постановка задачи",
            "02. Поиск данных",
            "05A. Разработка пилотной модели (MVP)",
        ];
        names.sort(v2_model_stream_typical_works_constants_1.compareModelStreamTypicalWorkNames);
        (0, vitest_1.expect)(names).toEqual([
            "01. Постановка задачи",
            "02. Поиск данных",
            "05A. Разработка пилотной модели (MVP)",
            "05. Разработка модели",
            "AutoML: внедрение",
        ]);
    });
});

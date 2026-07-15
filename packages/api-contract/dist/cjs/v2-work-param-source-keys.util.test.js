"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_work_param_source_keys_util_1 = require("./v2-work-param-source-keys.util");
(0, vitest_1.describe)("v2-work-param-source-keys.util", () => {
    (0, vitest_1.it)("parses Cyrillic legacy source keys", () => {
        const value = "Количество сущностей (исходных таблиц) @ field_Y_K0Hy0e|количество_сущностей_исходных_таблиц";
        (0, vitest_1.expect)((0, v2_work_param_source_keys_util_1.parseParamNameSourceKeys)(value)).toEqual({
            displayName: "Количество сущностей (исходных таблиц)",
            sourceKeys: [
                "field_Y_K0Hy0e",
                "количество_сущностей_исходных_таблиц",
            ],
        });
        (0, vitest_1.expect)((0, v2_work_param_source_keys_util_1.stripParamNameSourceKeys)(value)).toBe("Количество сущностей (исходных таблиц)");
    });
});

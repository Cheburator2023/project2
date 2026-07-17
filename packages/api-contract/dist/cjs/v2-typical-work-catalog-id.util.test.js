"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_typical_work_catalog_id_util_1 = require("./v2-typical-work-catalog-id.util");
(0, vitest_1.describe)("remapFactoryAllowedWorkIdsToTemplateWorks", () => {
    const factoryRegistry = [
        {
            id: "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4004",
            name: "05A. Разработка пилотной модели (MVP)",
        },
        {
            id: "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4005",
            name: "05. Разработка модели",
        },
    ];
    (0, vitest_1.it)("maps factory registry ids to template work ids by name", () => {
        const templateWorks = [
            {
                id: "7147da4f-b4cd-445e-8ac3-838c4b106ca7",
                name: "05A. Разработка пилотной модели (MVP)",
            },
            {
                id: "aaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                name: "05. Разработка модели",
            },
        ];
        (0, vitest_1.expect)((0, v2_typical_work_catalog_id_util_1.remapFactoryAllowedWorkIdsToTemplateWorks)([
            "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4004",
            "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4005",
        ], templateWorks, factoryRegistry)).toEqual([
            "7147da4f-b4cd-445e-8ac3-838c4b106ca7",
            "aaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        ]);
    });
    (0, vitest_1.it)("keeps ids unchanged when they already belong to the template", () => {
        const templateWorks = [
            {
                id: "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4004",
                name: "05A. Разработка пилотной модели (MVP)",
            },
        ];
        (0, vitest_1.expect)((0, v2_typical_work_catalog_id_util_1.remapFactoryAllowedWorkIdsToTemplateWorks)(["f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4004"], templateWorks, factoryRegistry)).toEqual(["f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4004"]);
    });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_typical_work_per_instance_util_1 = require("./v2-typical-work-per-instance.util");
const v2_trigger_formula_util_1 = require("./v2-trigger-formula.util");
const v2_work_arch_count_coeff_util_1 = require("./v2-work-arch-count-coeff.util");
(0, vitest_1.describe)("v2-typical-work-per-instance", () => {
    (0, vitest_1.it)("maps arch component type labels to kinds", () => {
        (0, vitest_1.expect)((0, v2_typical_work_per_instance_util_1.resolveArchComponentKindFromType)("Модель")).toBe("model");
        (0, vitest_1.expect)((0, v2_typical_work_per_instance_util_1.resolveArchComponentKindFromType)("Модели")).toBe("model");
        (0, vitest_1.expect)((0, v2_typical_work_per_instance_util_1.resolveArchComponentKindFromType)("Система-источник")).toBe("sourceSystem");
        (0, vitest_1.expect)((0, v2_typical_work_per_instance_util_1.resolveArchComponentKindFromType)("Объект / Витрина данных")).toBe("dataMart");
        (0, vitest_1.expect)((0, v2_typical_work_per_instance_util_1.resolveArchComponentKindFromType)("Процесс обработки данных")).toBe("dataProcess");
        (0, vitest_1.expect)((0, v2_typical_work_per_instance_util_1.resolveArchComponentKindFromType)("Модельный сервис")).toBe("modelService");
    });
    (0, vitest_1.it)("lists model instances from modelsList", () => {
        const formData = {
            detailInfo: {
                modelsList: [
                    { name: "вава", readyPromReports: true },
                    { name: "вавыаы" },
                    { name: "выавыавы", readyPromReports: false },
                ],
            },
        };
        const instances = (0, v2_typical_work_per_instance_util_1.listArchComponentInstances)(formData, "Модель");
        (0, vitest_1.expect)(instances).toHaveLength(3);
        (0, vitest_1.expect)(instances.map((row) => row.sourceLabel)).toEqual([
            "вава",
            "вавыаы",
            "выавыавы",
        ]);
        (0, vitest_1.expect)(instances[0]?.row.readyPromReports).toBe(true);
        (0, vitest_1.expect)(instances[2]?.row.readyPromReports).toBe(false);
    });
    (0, vitest_1.it)("uses factory field key for model name (not generic Модель N)", () => {
        const formData = {
            detailInfo: {
                modelsList: [
                    { "field_atxiq-UM": "ывыфв", workType: "Обучение" },
                    { "field_atxiq-UM": "ыфсфыв", readyPromReports: true },
                ],
            },
        };
        const instances = (0, v2_typical_work_per_instance_util_1.listArchComponentInstances)(formData, "Модель");
        (0, vitest_1.expect)(instances.map((row) => row.sourceLabel)).toEqual([
            "ывыфв",
            "ыфсфыв",
        ]);
    });
    (0, vitest_1.it)("resolves model name from schemaParams title Название модели", () => {
        const formData = {
            detailInfo: {
                modelsList: [
                    { "field_customName": "Альфа", workType: "Обучение" },
                    { "field_customName": "Бета" },
                ],
            },
        };
        const instances = (0, v2_typical_work_per_instance_util_1.listArchComponentInstances)(formData, "Модель", {
            schemaParams: [
                {
                    code: "field_customName",
                    name: "Название модели",
                    archComponent: "Модель",
                },
                {
                    code: "workType",
                    name: "Тип работ",
                    archComponent: "Модель",
                    values: [{ code: "Обучение", label: "Обучение" }],
                },
            ],
        });
        (0, vitest_1.expect)(instances.map((row) => row.sourceLabel)).toEqual(["Альфа", "Бета"]);
    });
    (0, vitest_1.it)("resolves model name by title when schemaParams lack archComponent", () => {
        const instances = (0, v2_typical_work_per_instance_util_1.listArchComponentInstances)({
            detailInfo: {
                modelsList: [{ "field_xyz": "Гамма", workType: "Обучение" }],
            },
        }, "Модель", {
            schemaParams: [
                { code: "field_xyz", name: "Название модели" },
                {
                    code: "workType",
                    name: "Тип работ",
                    values: [{ code: "Обучение", label: "Обучение" }],
                },
            ],
        });
        (0, vitest_1.expect)(instances.map((row) => row.sourceLabel)).toEqual(["Гамма"]);
    });
    (0, vitest_1.it)("matches Cyrillic title Название модели via schemaParams (no JS \\\\b)", () => {
        (0, vitest_1.expect)((0, v2_typical_work_per_instance_util_1.resolveArchInstanceNameFieldKeys)([{ code: "field_atxiq-UM", name: "Название модели" }], "model")).toEqual(["field_atxiq-UM"]);
    });
    (0, vitest_1.it)("uses factory field key for dataMart / dataProcess names", () => {
        (0, vitest_1.expect)((0, v2_typical_work_per_instance_util_1.listArchComponentInstances)({
            detailInfo: {
                dataMart: [{ "field_zApubb5V": "Витрина X", workType: "Новый" }],
            },
        }, "Объект / Витрина данных").map((row) => row.sourceLabel)).toEqual(["Витрина X"]);
        (0, vitest_1.expect)((0, v2_typical_work_per_instance_util_1.listArchComponentInstances)({
            detailInfo: {
                dataProcess: [{ "field_It-B8PfV": "ETL-1" }],
            },
        }, "Процесс обработки данных").map((row) => row.sourceLabel)).toEqual(["ETL-1"]);
    });
    (0, vitest_1.it)("does not fan-out modelService", () => {
        const formData = {
            generalInfo: {
                modelService: [{ name: "A" }, { name: "B" }],
            },
        };
        const instances = (0, v2_typical_work_per_instance_util_1.listArchComponentInstances)(formData, "Модельный сервис");
        (0, vitest_1.expect)(instances).toHaveLength(1);
        (0, vitest_1.expect)(instances[0]?.sourceLabel).toBe("Контекст");
    });
    (0, vitest_1.it)("returns empty list when models are missing", () => {
        (0, vitest_1.expect)((0, v2_typical_work_per_instance_util_1.listArchComponentInstances)({}, "Модель")).toEqual([]);
    });
    (0, vitest_1.it)("lists filled source systems", () => {
        const formData = {
            detailInfo: {
                sourceSystems: [
                    { name: "S1", type: "Внутренний" },
                    { name: "", type: "" },
                    { name: "S2", field_x: true },
                ],
            },
        };
        const instances = (0, v2_typical_work_per_instance_util_1.listArchComponentInstances)(formData, "Система-источник");
        (0, vitest_1.expect)(instances.map((row) => row.sourceLabel)).toEqual(["S1", "S2"]);
    });
    (0, vitest_1.it)("forces arch_count override to 1 for per-instance kind", () => {
        const formData = {
            detailInfo: {
                modelsList: [{ name: "A" }, { name: "B" }, { name: "C" }],
            },
        };
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.resolveWorkArchComponentCount)(formData, "model")).toBe(3);
        const forced = (0, v2_typical_work_per_instance_util_1.withPerInstanceArchCountOverride)(formData, "model", 1);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.resolveWorkArchComponentCount)(forced, "model")).toBe(1);
        (0, vitest_1.expect)((0, v2_typical_work_per_instance_util_1.readPerInstanceArchCountOverride)(forced, "model")).toBe(1);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.resolveWorkArchComponentCount)(forced, "sourceSystem")).toBe(0);
    });
    (0, vitest_1.it)("slices formData to a single model instance for labor lookup", () => {
        const formData = {
            detailInfo: {
                modelsList: [
                    { name: "вава", readyPromReports: true },
                    { name: "выавыавы", readyPromReports: false },
                ],
            },
        };
        const instances = (0, v2_typical_work_per_instance_util_1.listArchComponentInstances)(formData, "Модель");
        const sliced = (0, v2_typical_work_per_instance_util_1.formDataWithSingleArchInstance)(formData, "model", instances[0]);
        const detail = sliced.detailInfo;
        (0, vitest_1.expect)(detail.modelsList).toEqual([
            { name: "вава", readyPromReports: true },
        ]);
        (0, vitest_1.expect)((0, v2_work_arch_count_coeff_util_1.resolveWorkArchComponentCount)(sliced, "model")).toBe(1);
    });
    (0, vitest_1.it)("formats per-instance expanded sum", () => {
        (0, vitest_1.expect)((0, v2_typical_work_per_instance_util_1.formatPerInstanceBreakdownExpanded)([
            {
                sourceLabel: "вава",
                index: 0,
                expanded: "33 × 0.5 = 16.5",
                total: 16.5,
            },
            {
                sourceLabel: "выавыавы",
                index: 1,
                expanded: "33 × 1 = 33",
                total: 33,
            },
        ], 49.5)).toBe("16.5 (вава) + 33 (выавыавы) = 49.5");
    });
    (0, vitest_1.it)("explains empty arch instances in breakdown", () => {
        (0, vitest_1.expect)((0, v2_typical_work_per_instance_util_1.formatEmptyArchInstanceBreakdown)("Процесс обработки данных")).toBe("нет заполненных «Процесс обработки данных» → 0");
        (0, vitest_1.expect)((0, v2_typical_work_per_instance_util_1.formatEmptyArchInstanceBreakdown)("Система-источник")).toBe("нет заполненных «Система-источник» → 0");
        (0, vitest_1.expect)((0, v2_typical_work_per_instance_util_1.formatNoTriggerMatchingArchInstanceBreakdown)("Модель")).toBe("нет «Модели», удовлетворяющих триггеру появления → 0");
    });
    (0, vitest_1.it)("filters per-instance rows by appearance trigger (AutoML on model)", () => {
        const formData = {
            detailInfo: {
                modelsList: [
                    { name: "m1", autoML: true },
                    { name: "m2", autoML: false },
                    { name: "m3", autoML: false },
                ],
            },
        };
        const instances = (0, v2_typical_work_per_instance_util_1.listArchComponentInstances)(formData, "Модель");
        (0, vitest_1.expect)(instances).toHaveLength(3);
        const triggerInput = {
            mode: "simple",
            rules: [
                {
                    paramCode: "autoML",
                    paramName: "Необходимость AutoML",
                    operator: "=",
                    valueCode: "true",
                    valueLabel: "Да",
                },
            ],
        };
        const matched = instances.filter((instance) => {
            const source = { ...instance.row };
            const sliced = (0, v2_typical_work_per_instance_util_1.formDataWithSingleArchInstance)(formData, "model", instance);
            return (0, v2_typical_work_per_instance_util_1.archInstanceMatchesWorkTrigger)({
                triggerInput,
                source,
                formData: sliced,
            });
        });
        (0, vitest_1.expect)(matched.map((row) => row.sourceLabel)).toEqual(["m1"]);
    });
    (0, vitest_1.it)("appearance gate: work appears when any model matches AutoML (not only if all do)", () => {
        const formData = {
            generalInfo: {
                modelService: [{ workType: "Внедрение", field_jUm5syZf: "канал" }],
            },
            detailInfo: {
                modelsList: [
                    {
                        "field_atxiq-UM": "ваыава",
                        autoML: true,
                        algorithmType: "Аудио-аналитика",
                    },
                    {
                        "field_atxiq-UM": "01. Постановка задачи2",
                        autoML: false,
                        algorithmType: "Компьютерное зрение",
                    },
                    {
                        "field_atxiq-UM": "66666677777",
                        autoML: false,
                    },
                ],
            },
        };
        const source = {
            workType: "Внедрение",
            field_jUm5syZf: "канал",
        };
        const triggerInput = {
            mode: "formula",
            rules: [],
            triggerFormula: {
                text: "workType ∈ {Внедрение} И AutoML = Да",
                tokens: [
                    {
                        kind: "param",
                        paramCode: "workType",
                        paramName: "Тип работ",
                        operator: "in",
                        values: [
                            { code: "Внедрение", label: "Внедрение" },
                            {
                                code: "Разработка и внедрение",
                                label: "Разработка и внедрение",
                            },
                        ],
                    },
                    { kind: "logic", op: "and" },
                    {
                        kind: "param",
                        paramCode: "autoML",
                        paramName: "Необходимость AutoML",
                        operator: "=",
                        valueCode: "true",
                        valueLabel: "Да",
                    },
                ],
            },
        };
        // Flatten last-write would see autoML=false from the last model —
        // form-level match must not be the gate for fan-out works.
        (0, vitest_1.expect)((0, v2_trigger_formula_util_1.matchTypicalWorkTriggers)(triggerInput, source, formData)).toBe(false);
        (0, vitest_1.expect)((0, v2_typical_work_per_instance_util_1.matchTypicalWorkAppearanceTriggers)({
            triggerInput,
            archComponentType: "Модель",
            source,
            formData,
        })).toBe(true);
        const matched = (0, v2_typical_work_per_instance_util_1.listArchComponentInstances)(formData, "Модель").filter((instance) => (0, v2_typical_work_per_instance_util_1.archInstanceMatchesWorkTrigger)({
            triggerInput,
            source: { ...source, ...instance.row },
            formData: (0, v2_typical_work_per_instance_util_1.formDataWithSingleArchInstance)(formData, "model", instance),
        }));
        (0, vitest_1.expect)(matched.map((row) => row.sourceLabel)).toEqual(["ваыава"]);
    });
});

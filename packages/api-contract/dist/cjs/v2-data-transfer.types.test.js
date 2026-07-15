"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const v2_data_transfer_types_1 = require("./v2-data-transfer.types");
(0, vitest_1.describe)("v2-data-transfer.types", () => {
    (0, vitest_1.it)("returns all sections when query is empty", () => {
        (0, vitest_1.expect)((0, v2_data_transfer_types_1.parseV2DataTransferSections)(undefined)).toEqual([
            ...v2_data_transfer_types_1.V2_DATA_TRANSFER_DEFAULT_SECTIONS,
        ]);
        (0, vitest_1.expect)((0, v2_data_transfer_types_1.parseV2DataTransferSections)("")).toEqual([
            ...v2_data_transfer_types_1.V2_DATA_TRANSFER_DEFAULT_SECTIONS,
        ]);
    });
    (0, vitest_1.it)("parses comma-separated sections", () => {
        (0, vitest_1.expect)((0, v2_data_transfer_types_1.parseV2DataTransferSections)("templates,questionnaires")).toEqual([
            "templates",
            "questionnaires",
        ]);
    });
    (0, vitest_1.it)("falls back to all when no valid sections", () => {
        (0, vitest_1.expect)((0, v2_data_transfer_types_1.parseV2DataTransferSections)("unknown")).toEqual([
            ...v2_data_transfer_types_1.V2_DATA_TRANSFER_DEFAULT_SECTIONS,
        ]);
    });
    (0, vitest_1.it)("serializes sections", () => {
        (0, vitest_1.expect)((0, v2_data_transfer_types_1.serializeV2DataTransferSections)(["dictionaries", "templates"])).toBe("dictionaries,templates");
    });
    (0, vitest_1.it)("auto-includes templates when exporting typical works", () => {
        (0, vitest_1.expect)((0, v2_data_transfer_types_1.expandV2DataTransferExportSections)(["typicalWorks"])).toEqual([
            "templates",
            "typicalWorks",
        ]);
        (0, vitest_1.expect)((0, v2_data_transfer_types_1.expandV2DataTransferExportSections)(["dictionaries", "typicalWorks"])).toEqual(["templates", "dictionaries", "typicalWorks"]);
        (0, vitest_1.expect)((0, v2_data_transfer_types_1.expandV2DataTransferExportSections)(["templates"])).toEqual([
            "templates",
        ]);
    });
    (0, vitest_1.it)("builds export filename with section slugs and timestamp", () => {
        const exportedAt = new Date("2026-07-15T12:43:30");
        (0, vitest_1.expect)((0, v2_data_transfer_types_1.buildV2DataTransferExportFilename)(["templates"], exportedAt)).toBe("smart-anketa-v2-templates-2026-07-15-12-43-30.json");
        (0, vitest_1.expect)((0, v2_data_transfer_types_1.buildV2DataTransferExportFilename)(["templates", "dictionaries", "typicalWorks"], exportedAt)).toBe("smart-anketa-v2-templates-dictionaries-typical-works-2026-07-15-12-43-30.json");
    });
});

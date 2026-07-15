import { describe, expect, it } from "vitest";
import { buildV2DataTransferExportFilename, expandV2DataTransferExportSections, parseV2DataTransferSections, serializeV2DataTransferSections, V2_DATA_TRANSFER_DEFAULT_SECTIONS, } from "./v2-data-transfer.types";
describe("v2-data-transfer.types", () => {
    it("returns all sections when query is empty", () => {
        expect(parseV2DataTransferSections(undefined)).toEqual([
            ...V2_DATA_TRANSFER_DEFAULT_SECTIONS,
        ]);
        expect(parseV2DataTransferSections("")).toEqual([
            ...V2_DATA_TRANSFER_DEFAULT_SECTIONS,
        ]);
    });
    it("parses comma-separated sections", () => {
        expect(parseV2DataTransferSections("templates,questionnaires")).toEqual([
            "templates",
            "questionnaires",
        ]);
    });
    it("falls back to all when no valid sections", () => {
        expect(parseV2DataTransferSections("unknown")).toEqual([
            ...V2_DATA_TRANSFER_DEFAULT_SECTIONS,
        ]);
    });
    it("serializes sections", () => {
        expect(serializeV2DataTransferSections(["dictionaries", "templates"])).toBe("dictionaries,templates");
    });
    it("auto-includes templates when exporting typical works", () => {
        expect(expandV2DataTransferExportSections(["typicalWorks"])).toEqual([
            "templates",
            "typicalWorks",
        ]);
        expect(expandV2DataTransferExportSections(["dictionaries", "typicalWorks"])).toEqual(["templates", "dictionaries", "typicalWorks"]);
        expect(expandV2DataTransferExportSections(["templates"])).toEqual([
            "templates",
        ]);
    });
    it("builds export filename with section slugs and timestamp", () => {
        const exportedAt = new Date("2026-07-15T12:43:30");
        expect(buildV2DataTransferExportFilename(["templates"], exportedAt)).toBe("smart-anketa-v2-templates-2026-07-15-12-43-30.json");
        expect(buildV2DataTransferExportFilename(["templates", "dictionaries", "typicalWorks"], exportedAt)).toBe("smart-anketa-v2-templates-dictionaries-typical-works-2026-07-15-12-43-30.json");
    });
});

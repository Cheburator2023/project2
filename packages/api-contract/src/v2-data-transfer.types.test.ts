import { describe, expect, it } from "vitest";
import {
	parseV2DataTransferSections,
	serializeV2DataTransferSections,
	V2_DATA_TRANSFER_DEFAULT_SECTIONS,
} from "./v2-data-transfer.types";

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
		expect(
			serializeV2DataTransferSections(["dictionaries", "templates"]),
		).toBe("dictionaries,templates");
	});
});

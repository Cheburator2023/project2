import {
	QuestionnaireResponseDto,
	StreamAverageDto,
} from "../../../../../src/modules/questionnaire/dto/response/questionnaire-response.dto";
import { ReferenceDataDto } from "../../../../../src/modules/questionnaire/dto/response/reference-data.dto";

describe("QuestionnaireResponseDto", () => {
	it("should be defined", () => {
		const dto = new QuestionnaireResponseDto();
		expect(dto).toBeDefined();
	});

	it("should have version property", () => {
		const dto = new QuestionnaireResponseDto();
		dto.version = "1.0.0";
		expect(dto.version).toBe("1.0.0");
	});

	it("should have lastUpdated property", () => {
		const dto = new QuestionnaireResponseDto();
		const date = new Date().toISOString();
		dto.lastUpdated = date;
		expect(dto.lastUpdated).toBe(date);
	});

	it("should have author property", () => {
		const dto = new QuestionnaireResponseDto();
		dto.author = "system";
		expect(dto.author).toBe("system");
	});

	it("should have dictionaries property", () => {
		const dto = new QuestionnaireResponseDto();
		dto.dictionaries = {};
		expect(dto.dictionaries).toEqual({});
	});

	it("should have streamAverages property", () => {
		const dto = new QuestionnaireResponseDto();
		const averages = new StreamAverageDto();
		averages["01. Test Epic"] = 10.5;
		dto.streamAverages = averages;
		expect(dto.streamAverages["01. Test Epic"]).toBe(10.5);
	});

	it("should have referenceData property", () => {
		const dto = new QuestionnaireResponseDto();
		const refData = new ReferenceDataDto();
		refData.department = ["Dept1"];
		refData.streamExecutor = ["Stream1"];
		dto.referenceData = refData;
		expect(dto.referenceData.department).toEqual(["Dept1"]);
		expect(dto.referenceData.streamExecutor).toEqual(["Stream1"]);
	});
});

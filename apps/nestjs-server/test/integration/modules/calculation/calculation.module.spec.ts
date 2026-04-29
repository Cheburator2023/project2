import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CalculationModule } from "../../../../src/modules/calculation/calculation.module";
import { CalculationService } from "../../../../src/modules/calculation/services/calculation.service";
import { ExcelExportService } from "../../../../src/modules/calculation/services/excel-export.service";
import { InMemoryFilterService } from "../../../../src/modules/calculation/services/in-memory-filter.service";
import { AgGridFilterService } from "../../../../src/modules/calculation/services/ag-grid-filter.service";
import { CalculationController } from "../../../../src/modules/calculation/controllers/calculation.controller";
import { Calculation } from "../../../../src/modules/calculation/entities/calculation.entity";

describe("CalculationModule (wiring)", () => {
	let module: TestingModule;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [CalculationModule],
		})
			.overrideProvider(getRepositoryToken(Calculation))
			.useValue({})
			.compile();
	});

	afterAll(async () => {
		await module.close();
	});

	it("registers CalculationService", () => {
		expect(module.get(CalculationService)).toBeDefined();
	});

	it("registers ExcelExportService", () => {
		expect(module.get(ExcelExportService)).toBeDefined();
	});

	it("registers InMemoryFilterService", () => {
		expect(module.get(InMemoryFilterService)).toBeDefined();
	});

	it("registers AgGridFilterService", () => {
		expect(module.get(AgGridFilterService)).toBeDefined();
	});

	it("registers CalculationController", () => {
		expect(module.get(CalculationController)).toBeDefined();
	});
});

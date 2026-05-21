import {
	calculateAMLDrafting,
	calculateAMLEnforcement,
	calculateStage01,
	calculateStage02,
	calculateStage04,
	calculateStage05,
	calculateStage05A,
	calculateStage05B,
	calculateStage07,
	calculateStage09,
} from "./stages";

describe("Stage calculations", () => {
	describe("calculateStage01", () => {
		it("multiplies all coefficients and rounds up to 2 decimals", () => {
			expect(calculateStage01(10, 1.5, 1.25, 1.1, 0.5)).toBe(10.32);
		});
	});

	describe("calculateStage02", () => {
		it("returns 0 when readyPromReports is yes", () => {
			expect(calculateStage02(10, 1, 2, 3, "Да", "5")).toBe(0);
		});

		it("returns 0 when dataSourcesCount is zero", () => {
			expect(calculateStage02(10, 1, 2, 3, "Нет", "0")).toBe(0);
		});

		it("divides by assessed initiatives count when it is greater than 1", () => {
			expect(calculateStage02(10, 2, 1.2, 1.1, "Нет", "2")).toBe(6.6);
		});

		it("does not divide by assessed initiatives count when it is 1", () => {
			expect(calculateStage02(10, 1, 1.2, 1.1, "Нет", "2")).toBe(13.2);
		});
	});

	describe("calculateStage04", () => {
		it("returns 0 when readyPromReports is yes", () => {
			expect(calculateStage04(10, 2, 1.5, 1.1, "Да", "2")).toBe(0);
		});

		it("divides by assessed initiatives count when count is greater than 1 and data sources are non-zero", () => {
			expect(calculateStage04(10, 2, 1.5, 1.1, "Нет", "2")).toBe(8.25);
		});

		it("does not divide when data sources count is zero", () => {
			expect(calculateStage04(10, 2, 1.5, 1.1, "Нет", "0")).toBe(16.5);
		});
	});

	describe("calculateStage05A", () => {
		it("returns 0 when pilot model is not required", () => {
			expect(calculateStage05A(10, 2, 1.5, 1.1, 0.5, 3, "Не требуется")).toBe(
				0,
			);
		});

		it("multiplies all stage 05A coefficients", () => {
			expect(calculateStage05A(10, 2, 1.5, 1.1, 0.5, 3, "Да")).toBe(49.5);
		});
	});

	describe("calculateStage05", () => {
		it("multiplies all stage 05 coefficients", () => {
			expect(calculateStage05(10, 2, 1.5, 1.1, 0.5, 3)).toBe(49.5);
		});
	});

	describe("calculateAMLDrafting", () => {
		it("returns 0 when AutoML is not required", () => {
			expect(calculateAMLDrafting(10, 2, 1.5, 1.1, "Не требуется")).toBe(0);
		});

		it("multiplies AML drafting coefficients", () => {
			expect(calculateAMLDrafting(10, 2, 1.5, 1.1, "Да")).toBe(33);
		});
	});

	describe("calculateStage05B", () => {
		it("returns 0 when pilot support is not required", () => {
			expect(calculateStage05B(10, 1.1, 0.5, "Не требуется")).toBe(0);
		});

		it("multiplies stage 05B coefficients", () => {
			expect(calculateStage05B(10, 1.1, 0.5, "Да")).toBe(5.5);
		});
	});

	describe("calculateStage07", () => {
		it("returns 0 when additional reports are not required", () => {
			expect(calculateStage07(10, 2, 1.5, 1.1, 2, "Не требуется")).toBe(0);
		});

		it("divides by assessed initiatives count when it is greater than 0", () => {
			expect(calculateStage07(10, 2, 1.5, 1.1, 2, "2")).toBe(16.5);
		});

		it("does not divide when assessed initiatives count is zero", () => {
			expect(calculateStage07(10, 0, 1.5, 1.1, 2, "2")).toBe(33);
		});
	});

	describe("calculateStage09", () => {
		it("returns 0 when deployment channels array is empty", () => {
			expect(calculateStage09(10, 2, 1.5, 1.1, 3, 2, [])).toBe(0);
		});

		it("returns 0 when deployment channels include not required marker", () => {
			expect(calculateStage09(10, 2, 1.5, 1.1, 3, 2, ["Не требуется"])).toBe(0);
		});

		it("multiplies all stage 09 coefficients", () => {
			expect(calculateStage09(10, 2, 1.5, 1.1, 3, 2, ["Онлайн"])).toBe(198);
		});
	});

	describe("calculateAMLEnforcement", () => {
		it("returns 0 when AutoML is not required", () => {
			expect(calculateAMLEnforcement(10, 2, 1.5, 1.1, "Не требуется")).toBe(0);
		});

		it("multiplies AML enforcement coefficients", () => {
			expect(calculateAMLEnforcement(10, 2, 1.5, 1.1, "Да")).toBe(33);
		});
	});
});

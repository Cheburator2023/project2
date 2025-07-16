import { testStreamAverage } from "../../../../test-data";

describe("StreamAverageEntity", () => {
	it("should be defined", () => {
		expect(testStreamAverage).toBeDefined();
	});

	it("should have id property", () => {
		expect(testStreamAverage.id).toBeDefined();
	});

	it("should have epicName property", () => {
		expect(testStreamAverage.epicName).toBe("01. Test Epic");
	});

	it("should have averageValue property", () => {
		expect(testStreamAverage.averageValue).toBe(10.5);
	});

	it("should have description property", () => {
		expect(testStreamAverage.description).toBe("Test description");
	});

	it("should have createdAt property", () => {
		expect(testStreamAverage.createdAt).toBeDefined();
	});

	it("should have updatedAt property", () => {
		expect(testStreamAverage.updatedAt).toBeDefined();
	});
});

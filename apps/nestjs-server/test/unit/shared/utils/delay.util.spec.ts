import { delay } from "../../../../src/shared/utils/delay.util";

/**
 * Unit-тест delay.
 * Проверяем, что Promise резолвится не раньше указанного интервала.
 */
describe("delay util", () => {
	it("resolves after configured ms", async () => {
		const start = Date.now();
		await delay(20);
		expect(Date.now() - start).toBeGreaterThanOrEqual(15);
	});
});

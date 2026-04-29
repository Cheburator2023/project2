import { RetryUtil } from "../../../../src/shared/utils/retry.util";

jest.mock("../../../../src/shared/utils/delay.util", () => ({
	delay: () => Promise.resolve(),
}));

/**
 * Unit-тесты RetryUtil.withRetry.
 * delay.util замокан для ускорения тестов.
 * Проверяем: успех с первой попытки, ретрай после ошибки, исчерпание попыток, предикат shouldRetry.
 */
describe("RetryUtil.withRetry", () => {
	// Базовый случай: операция успешна с первого раза
	it("returns result on first successful attempt", async () => {
		const op = jest.fn().mockResolvedValue("ok");
		const result = await RetryUtil.withRetry(op);
		expect(result).toBe("ok");
		expect(op).toHaveBeenCalledTimes(1);
	});

	// Автоматический ретрай после временной ошибки
	it("retries on transient errors and returns success", async () => {
		const op = jest
			.fn()
			.mockRejectedValueOnce(new Error("e1"))
			.mockResolvedValueOnce("ok");
		const result = await RetryUtil.withRetry(op, 3, 1);
		expect(result).toBe("ok");
		expect(op).toHaveBeenCalledTimes(2);
	});

	// После исчерпания maxRetries попыток бросает последнюю ошибку
	it("stops retrying after maxRetries and rethrows last error", async () => {
		const err = new Error("perm");
		const op = jest.fn().mockRejectedValue(err);
		await expect(RetryUtil.withRetry(op, 2, 1)).rejects.toBe(err);
		expect(op).toHaveBeenCalledTimes(2);
	});

	// Предикат shouldRetry=false выходит без повторных попыток
	it("respects shouldRetry=false to bail out immediately", async () => {
		const err = new Error("noretry");
		const op = jest.fn().mockRejectedValue(err);
		await expect(RetryUtil.withRetry(op, 5, 1, () => false)).rejects.toBe(err);
		expect(op).toHaveBeenCalledTimes(1);
	});
});

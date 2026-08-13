import { ServiceUnavailableException } from "@nestjs/common";
import { HealthService } from "../../../../src/modules/health/health.service";

describe("HealthService", () => {
	it("liveness is always ok", () => {
		const service = new HealthService({
			isInitialized: true,
			query: jest.fn(),
		} as never);
		expect(service.getLiveness()).toEqual({ status: "ok" });
	});

	it("readiness ok when SELECT 1 succeeds", async () => {
		const query = jest.fn().mockResolvedValue([{ "?column?": 1 }]);
		const service = new HealthService({
			isInitialized: true,
			query,
		} as never);
		await expect(service.getReadiness()).resolves.toEqual({
			status: "ok",
			checks: { database: "up" },
		});
		expect(query).toHaveBeenCalledWith("SELECT 1");
	});

	it("readiness fails when database is down", async () => {
		const service = new HealthService({
			isInitialized: true,
			query: jest.fn().mockRejectedValue(new Error("connection refused")),
		} as never);
		await expect(service.getReadiness()).rejects.toBeInstanceOf(
			ServiceUnavailableException,
		);
	});
});

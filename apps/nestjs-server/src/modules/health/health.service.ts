import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

export type HealthLivenessDto = {
	status: "ok";
};

export type HealthReadinessDto = {
	status: "ok";
	checks: {
		database: "up";
	};
};

@Injectable()
export class HealthService {
	constructor(
		@InjectDataSource()
		private readonly dataSource: DataSource,
	) {}

	getLiveness(): HealthLivenessDto {
		return { status: "ok" };
	}

	async getReadiness(): Promise<HealthReadinessDto> {
		try {
			if (!this.dataSource.isInitialized) {
				throw new Error("DataSource is not initialized");
			}
			await this.dataSource.query("SELECT 1");
		} catch (error) {
			throw new ServiceUnavailableException({
				status: "error",
				checks: {
					database: "down",
				},
				message:
					error instanceof Error
						? error.message
						: "Database health check failed",
			});
		}

		return {
			status: "ok",
			checks: {
				database: "up",
			},
		};
	}
}

import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

export type HealthLivenessDto = {
	status: "ok";
};

export type HealthMemoryDto = {
	status: "ok";
	rssMb: number;
	heapUsedMb: number;
	heapTotalMb: number;
	externalMb: number;
	arrayBuffersMb: number;
};

export type HealthReadinessDto = {
	status: "ok";
	checks: {
		database: "up";
	};
};

function mb(bytes: number): number {
	return Math.round((bytes / 1024 / 1024) * 10) / 10;
}

@Injectable()
export class HealthService {
	constructor(
		@InjectDataSource()
		private readonly dataSource: DataSource,
	) {}

	getLiveness(): HealthLivenessDto {
		return { status: "ok" };
	}

	getMemory(): HealthMemoryDto {
		const mem = process.memoryUsage();
		return {
			status: "ok",
			rssMb: mb(mem.rss),
			heapUsedMb: mb(mem.heapUsed),
			heapTotalMb: mb(mem.heapTotal),
			externalMb: mb(mem.external),
			arrayBuffersMb: mb(mem.arrayBuffers ?? 0),
		};
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

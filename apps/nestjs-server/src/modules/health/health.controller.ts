import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../../shared/decorators/public.decorator";
import {
	HealthService,
	type HealthLivenessDto,
	type HealthMemoryDto,
	type HealthReadinessDto,
} from "./health.service";

/**
 * Healthchecks без JWT/ролей — для k8s probes и балансировщиков.
 */
@ApiTags("health")
@Public()
@Controller("health")
export class HealthController {
	constructor(private readonly healthService: HealthService) {}

	@Get()
	@ApiOkResponse({ description: "Liveness: процесс жив" })
	getLiveness(): HealthLivenessDto {
		return this.healthService.getLiveness();
	}

	@Get("memory")
	@ApiOkResponse({ description: "RSS/heap процесса (нагрузка, k8s debug)" })
	getMemory(): HealthMemoryDto {
		return this.healthService.getMemory();
	}

	@Get("ready")
	@ApiOkResponse({ description: "Readiness: БД доступна" })
	@ApiServiceUnavailableResponse({
		description: "Зависимости недоступны (например, database)",
	})
	getReadiness(): Promise<HealthReadinessDto> {
		return this.healthService.getReadiness();
	}
}

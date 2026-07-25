import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { V2StreamCatalogService } from "../services/v2-stream-catalog.service";

@ApiTags("v2-streams")
@Controller("v2/streams")
export class V2StreamCatalogController {
	constructor(private readonly streamCatalog: V2StreamCatalogService) {}

	@Get()
	@ApiOperation({
		summary: "Каталог стрим-исполнителей (resolved implementationStream)",
	})
	@ApiResponse({ status: 200 })
	async list(
		@Query("includeInactive") includeInactive?: string,
	) {
		const catalog = await this.streamCatalog.getCatalog({
			activeOnly: includeInactive !== "1" && includeInactive !== "true",
			forceRefresh: true,
		});
		return catalog.map((entry) => ({
			code: entry.code,
			label: entry.label,
			order: entry.order,
			isActive: entry.isActive,
			dbNames: entry.payload.dbNames,
			legacyLabels: entry.payload.legacyLabels,
			keycloakAliases: entry.payload.keycloakAliases,
			isModelStream: entry.payload.isModelStream,
			isUmbrellaStream: entry.payload.isUmbrellaStream,
			v1Labels: entry.payload.v1Labels,
			payload: entry.payload,
		}));
	}
}

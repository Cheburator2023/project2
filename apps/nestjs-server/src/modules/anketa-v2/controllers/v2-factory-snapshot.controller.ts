import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type {
	UpdateV2FactorySnapshotSettingDto,
	V2FactorySnapshotSettingDto,
} from "@smart-anketa/api-contract";
import { CurrentUser } from "../../../shared/decorators/user.decorator";
import { V2FactorySnapshotService } from "../services/v2-factory-snapshot.service";

@ApiTags("v2-factory-snapshot")
@Controller("v2/factory-snapshot")
export class V2FactorySnapshotController {
	constructor(private readonly factorySnapshotService: V2FactorySnapshotService) {}

	@Get()
	@ApiOperation({ summary: "Текущий заводской эталон (встроенный или схема из БД)" })
	async getSetting(): Promise<V2FactorySnapshotSettingDto> {
		return this.factorySnapshotService.getSettingDto();
	}

	@Put()
	@ApiOperation({
		summary:
			"Назначить заводской эталон: встроенный JSON-снимок или версия выбранной схемы",
	})
	async updateSetting(
		@Body() body: UpdateV2FactorySnapshotSettingDto,
		@CurrentUser() user: { id: string } | null,
	): Promise<V2FactorySnapshotSettingDto> {
		return this.factorySnapshotService.updateSetting(body, user?.id ?? null);
	}
}

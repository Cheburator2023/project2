import { Body, Controller, Delete, Get, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";
import { DomainRoles } from "../../../shared/decorators/domain-roles.decorator";
import { CurrentUser } from "../../../shared/decorators/user.decorator";
import {
	V2RuntimeSettingsService,
	type V2StreamFilterSettingDto,
} from "../services/v2-runtime-settings.service";

class UpdateV2StreamFilterSettingDto {
	@IsBoolean()
	enabled!: boolean;
}

@ApiTags("v2-runtime-settings")
@Controller("v2/runtime-settings")
export class V2RuntimeSettingsController {
	constructor(private readonly settings: V2RuntimeSettingsService) {}

	@Get("stream-filter")
	@ApiOperation({
		summary:
			"Включён ли UI-фильтр реестра по стриму (env default ⊕ override админки)",
	})
	async getStreamFilter(): Promise<V2StreamFilterSettingDto> {
		return this.settings.getStreamFilterSetting();
	}

	@Put("stream-filter")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary: "Включить/выключить UI-фильтр реестра по стриму (override)",
	})
	async putStreamFilter(
		@Body() body: UpdateV2StreamFilterSettingDto,
		@CurrentUser() user?: { preferred_username?: string; username?: string },
	): Promise<V2StreamFilterSettingDto> {
		const updatedBy =
			user?.preferred_username || user?.username || null;
		return this.settings.setStreamFilterEnabled(body.enabled, updatedBy);
	}

	@Delete("stream-filter/override")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary: "Сбросить override — снова брать STREAM_FILTER_DISABLED / default",
	})
	async clearStreamFilterOverride(
		@CurrentUser() user?: { preferred_username?: string; username?: string },
	): Promise<V2StreamFilterSettingDto> {
		const updatedBy =
			user?.preferred_username || user?.username || null;
		return this.settings.clearStreamFilterOverride(updatedBy);
	}
}

import { Body, Controller, Delete, Get, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { DomainRoles } from "../../../shared/decorators/domain-roles.decorator";
import { CurrentUser } from "../../../shared/decorators/user.decorator";
import {
	V2RuntimeSettingsService,
	type V2RoleCompatSettingDto,
	type V2StreamFilterSettingDto,
	type V2WorkEstimatesStreamFilterSettingDto,
} from "../services/v2-runtime-settings.service";

class UpdateV2StreamFilterSettingDto {
	@IsBoolean()
	enabled!: boolean;
}

class UpdateV2WorkEstimatesStreamFilterSettingDto {
	@IsBoolean()
	enabled!: boolean;
}

class UpdateV2RoleCompatSettingDto {
	@IsOptional()
	@IsBoolean()
	adminItAsAppadmin?: boolean;

	@IsOptional()
	@IsBoolean()
	allowNestedLeadGroups?: boolean;
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

	@Get("work-estimates-stream-filter")
	@ApiOperation({
		summary:
			"Фильтр оценок работ по стриму для DS/DE/ModelOps(+lead); sarep/architect — всегда",
	})
	async getWorkEstimatesStreamFilter(): Promise<V2WorkEstimatesStreamFilterSettingDto> {
		return this.settings.getWorkEstimatesStreamFilterSetting();
	}

	@Put("work-estimates-stream-filter")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary: "Включить/выключить фильтр оценок работ по стриму (override)",
	})
	async putWorkEstimatesStreamFilter(
		@Body() body: UpdateV2WorkEstimatesStreamFilterSettingDto,
		@CurrentUser() user?: { preferred_username?: string; username?: string },
	): Promise<V2WorkEstimatesStreamFilterSettingDto> {
		const updatedBy =
			user?.preferred_username || user?.username || null;
		return this.settings.setWorkEstimatesStreamFilterEnabled(
			body.enabled,
			updatedBy,
		);
	}

	@Delete("work-estimates-stream-filter/override")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary:
			"Сбросить override — снова брать WORK_ESTIMATES_STREAM_FILTER_ENABLED / default",
	})
	async clearWorkEstimatesStreamFilterOverride(
		@CurrentUser() user?: { preferred_username?: string; username?: string },
	): Promise<V2WorkEstimatesStreamFilterSettingDto> {
		const updatedBy =
			user?.preferred_username || user?.username || null;
		return this.settings.clearWorkEstimatesStreamFilterOverride(updatedBy);
	}

	@Get("role-compat")
	@ApiOperation({
		summary:
			"Совместимость ролей с п-прод: /admin_it→appadmin и nested lead-группы",
	})
	async getRoleCompat(): Promise<V2RoleCompatSettingDto> {
		return this.settings.getRoleCompatSetting();
	}

	@Put("role-compat")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({ summary: "Override совместимости ролей (п-прод)" })
	async putRoleCompat(
		@Body() body: UpdateV2RoleCompatSettingDto,
		@CurrentUser() user?: { preferred_username?: string; username?: string },
	): Promise<V2RoleCompatSettingDto> {
		const updatedBy =
			user?.preferred_username || user?.username || null;
		return this.settings.setRoleCompatSetting(body, updatedBy);
	}

	@Delete("role-compat/override")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary:
			"Сбросить override — ADMIN_IT_AS_APPADMIN / ALLOW_NESTED_LEAD_GROUPS",
	})
	async clearRoleCompatOverride(
		@CurrentUser() user?: { preferred_username?: string; username?: string },
	): Promise<V2RoleCompatSettingDto> {
		const updatedBy =
			user?.preferred_username || user?.username || null;
		return this.settings.clearRoleCompatOverride(updatedBy);
	}
}

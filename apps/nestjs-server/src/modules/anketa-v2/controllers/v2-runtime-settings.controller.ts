import { Body, Controller, Delete, Get, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { DomainRoles } from "../../../shared/decorators/domain-roles.decorator";
import { CurrentUser } from "../../../shared/decorators/user.decorator";
import {
	V2RuntimeSettingsService,
	type V2DadmProgramManagerSettingDto,
	type V2EditLockHardDisableSettingDto,
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

class UpdateV2DadmProgramManagerSettingDto {
	@IsBoolean()
	enabled!: boolean;
}

class UpdateV2EditLockHardDisableSettingDto {
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

	@Get("dadm-program-manager")
	@ApiOperation({
		summary:
			"Feature flag: функционал менеджера программ ДАДМ (default ON)",
	})
	async getDadmProgramManager(): Promise<V2DadmProgramManagerSettingDto> {
		return this.settings.getDadmProgramManagerSetting();
	}

	@Put("dadm-program-manager")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary: "Включить/выключить функционал менеджера программ ДАДМ",
	})
	async putDadmProgramManager(
		@Body() body: UpdateV2DadmProgramManagerSettingDto,
		@CurrentUser() user?: { preferred_username?: string; username?: string },
	): Promise<V2DadmProgramManagerSettingDto> {
		const updatedBy =
			user?.preferred_username || user?.username || null;
		return this.settings.setDadmProgramManagerEnabled(body.enabled, updatedBy);
	}

	@Delete("dadm-program-manager/override")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary:
			"Сбросить override — снова брать DADM_PROGRAM_MANAGER_ENABLED / default ON",
	})
	async clearDadmProgramManagerOverride(
		@CurrentUser() user?: { preferred_username?: string; username?: string },
	): Promise<V2DadmProgramManagerSettingDto> {
		const updatedBy =
			user?.preferred_username || user?.username || null;
		return this.settings.clearDadmProgramManagerOverride(updatedBy);
	}

	@Get("edit-lock-hard-disable")
	@ApiOperation({
		summary:
			"Feature flag: жёсткий disable формы при чужом edit-lock (default OFF)",
	})
	async getEditLockHardDisable(): Promise<V2EditLockHardDisableSettingDto> {
		return this.settings.getEditLockHardDisableSetting();
	}

	@Put("edit-lock-hard-disable")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary:
			"Включить/выключить жёсткий disable формы при чужом edit-lock",
	})
	async putEditLockHardDisable(
		@Body() body: UpdateV2EditLockHardDisableSettingDto,
		@CurrentUser() user?: { preferred_username?: string; username?: string },
	): Promise<V2EditLockHardDisableSettingDto> {
		const updatedBy =
			user?.preferred_username || user?.username || null;
		return this.settings.setEditLockHardDisableEnabled(
			body.enabled,
			updatedBy,
		);
	}

	@Delete("edit-lock-hard-disable/override")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary:
			"Сбросить override — снова брать EDIT_LOCK_HARD_DISABLE_ENABLED / default OFF",
	})
	async clearEditLockHardDisableOverride(
		@CurrentUser() user?: { preferred_username?: string; username?: string },
	): Promise<V2EditLockHardDisableSettingDto> {
		const updatedBy =
			user?.preferred_username || user?.username || null;
		return this.settings.clearEditLockHardDisableOverride(updatedBy);
	}
}

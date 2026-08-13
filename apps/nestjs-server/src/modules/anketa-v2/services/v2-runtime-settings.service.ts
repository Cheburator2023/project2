import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { V2RoleCompatOptions } from "@smart-anketa/api-contract";
import { Repository } from "typeorm";
import { setV2RoleCompatRuntime } from "../../../shared/utils/v2-role-compat-runtime";
import { V2RuntimeSettingsEntity } from "../entities/v2-runtime-settings.entity";

export type V2StreamFilterSettingDto = {
	enabled: boolean;
	envDefaultEnabled: boolean;
	override: boolean | null;
	deModelopsViewAllStreams: boolean;
};

export type V2WorkEstimatesStreamFilterSettingDto = {
	enabled: boolean;
	envDefaultEnabled: boolean;
	override: boolean | null;
};

export type V2RoleCompatSettingDto = {
	adminItAsAppadmin: boolean;
	adminItAsAppadminEnvDefault: boolean;
	adminItAsAppadminOverride: boolean | null;
	allowNestedLeadGroups: boolean;
	allowNestedLeadGroupsEnvDefault: boolean;
	allowNestedLeadGroupsOverride: boolean | null;
};

/** Feature flag ДАДМ: default OFF (старое поведение без утверждения/срезов). */
export type V2DadmProgramManagerSettingDto = {
	enabled: boolean;
	envDefaultEnabled: boolean;
	override: boolean | null;
};

/**
 * Жёсткий disable формы при чужом edit-lock.
 * Default OFF — только предупреждение, форма остаётся редактируемой.
 */
export type V2EditLockHardDisableSettingDto = {
	enabled: boolean;
	envDefaultEnabled: boolean;
	override: boolean | null;
};

@Injectable()
export class V2RuntimeSettingsService implements OnModuleInit {
	constructor(
		@InjectRepository(V2RuntimeSettingsEntity)
		private readonly repo: Repository<V2RuntimeSettingsEntity>,
	) {}

	async onModuleInit(): Promise<void> {
		try {
			await this.getRoleCompatSetting();
		} catch {
			/** DB может быть ещё не смигрирована — остаёмся на env. */
		}
	}

	getEnvDefaultEnabled(): boolean {
		return process.env.STREAM_FILTER_DISABLED !== "true";
	}

	/**
	 * Фильтр оценок работ по стриму для DS/DE/ModelOps(+lead).
	 * Default ON (как фильтр реестра). Пока исполнители всё равно видят все
	 * оценки — см. `V2_WORK_ESTIMATE_STREAM_FILTER_FOR_EXECUTORS_ACTIVE`.
	 */
	getEnvWorkEstimatesStreamFilterEnabled(): boolean {
		return process.env.WORK_ESTIMATES_STREAM_FILTER_ENABLED !== "false";
	}

	getDeModelopsViewAllStreams(): boolean {
		return process.env.DE_MODELOPS_VIEW_ALL_STREAMS !== "false";
	}

	getEnvAdminItAsAppadmin(): boolean {
		return process.env.ADMIN_IT_AS_APPADMIN !== "false";
	}

	getEnvAllowNestedLeadGroups(): boolean {
		return process.env.ALLOW_NESTED_LEAD_GROUPS !== "false";
	}

	/** Default OFF — включается явно через админку или `DADM_PROGRAM_MANAGER_ENABLED=true`. */
	getEnvDadmProgramManagerEnabled(): boolean {
		return process.env.DADM_PROGRAM_MANAGER_ENABLED === "true";
	}

	/** Default OFF — `EDIT_LOCK_HARD_DISABLE_ENABLED=true` или override в админке. */
	getEnvEditLockHardDisableEnabled(): boolean {
		return process.env.EDIT_LOCK_HARD_DISABLE_ENABLED === "true";
	}

	async getStreamFilterSetting(): Promise<V2StreamFilterSettingDto> {
		const row = await this.getOrCreate();
		const envDefaultEnabled = this.getEnvDefaultEnabled();
		const override = row.streamFilterEnabled;
		return {
			enabled: override == null ? envDefaultEnabled : override,
			envDefaultEnabled,
			override,
			deModelopsViewAllStreams: this.getDeModelopsViewAllStreams(),
		};
	}

	async setStreamFilterEnabled(
		enabled: boolean,
		updatedBy?: string | null,
	): Promise<V2StreamFilterSettingDto> {
		const row = await this.getOrCreate();
		row.streamFilterEnabled = enabled;
		row.updatedBy = updatedBy ?? null;
		await this.repo.save(row);
		return this.getStreamFilterSetting();
	}

	async clearStreamFilterOverride(
		updatedBy?: string | null,
	): Promise<V2StreamFilterSettingDto> {
		const row = await this.getOrCreate();
		row.streamFilterEnabled = null;
		row.updatedBy = updatedBy ?? null;
		await this.repo.save(row);
		return this.getStreamFilterSetting();
	}

	async getWorkEstimatesStreamFilterSetting(): Promise<V2WorkEstimatesStreamFilterSettingDto> {
		const row = await this.getOrCreate();
		const envDefaultEnabled = this.getEnvWorkEstimatesStreamFilterEnabled();
		const override = row.workEstimatesStreamFilterEnabled;
		return {
			enabled: override == null ? envDefaultEnabled : override,
			envDefaultEnabled,
			override,
		};
	}

	async setWorkEstimatesStreamFilterEnabled(
		enabled: boolean,
		updatedBy?: string | null,
	): Promise<V2WorkEstimatesStreamFilterSettingDto> {
		const row = await this.getOrCreate();
		row.workEstimatesStreamFilterEnabled = enabled;
		row.updatedBy = updatedBy ?? null;
		await this.repo.save(row);
		return this.getWorkEstimatesStreamFilterSetting();
	}

	async clearWorkEstimatesStreamFilterOverride(
		updatedBy?: string | null,
	): Promise<V2WorkEstimatesStreamFilterSettingDto> {
		const row = await this.getOrCreate();
		row.workEstimatesStreamFilterEnabled = null;
		row.updatedBy = updatedBy ?? null;
		await this.repo.save(row);
		return this.getWorkEstimatesStreamFilterSetting();
	}

	async getRoleCompatSetting(): Promise<V2RoleCompatSettingDto> {
		const row = await this.getOrCreate();
		const adminEnv = this.getEnvAdminItAsAppadmin();
		const nestedEnv = this.getEnvAllowNestedLeadGroups();
		const adminOverride = row.adminItAsAppadmin;
		const nestedOverride = row.allowNestedLeadGroups;
		const dto: V2RoleCompatSettingDto = {
			adminItAsAppadmin: adminOverride == null ? adminEnv : adminOverride,
			adminItAsAppadminEnvDefault: adminEnv,
			adminItAsAppadminOverride: adminOverride,
			allowNestedLeadGroups:
				nestedOverride == null ? nestedEnv : nestedOverride,
			allowNestedLeadGroupsEnvDefault: nestedEnv,
			allowNestedLeadGroupsOverride: nestedOverride,
		};
		setV2RoleCompatRuntime({
			adminItAsAppadmin: dto.adminItAsAppadmin,
			allowNestedLeadGroups: dto.allowNestedLeadGroups,
		});
		return dto;
	}

	async setRoleCompatSetting(
		patch: {
			adminItAsAppadmin?: boolean;
			allowNestedLeadGroups?: boolean;
		},
		updatedBy?: string | null,
	): Promise<V2RoleCompatSettingDto> {
		const row = await this.getOrCreate();
		if (patch.adminItAsAppadmin !== undefined) {
			row.adminItAsAppadmin = patch.adminItAsAppadmin;
		}
		if (patch.allowNestedLeadGroups !== undefined) {
			row.allowNestedLeadGroups = patch.allowNestedLeadGroups;
		}
		row.updatedBy = updatedBy ?? null;
		await this.repo.save(row);
		return this.getRoleCompatSetting();
	}

	async clearRoleCompatOverride(
		updatedBy?: string | null,
	): Promise<V2RoleCompatSettingDto> {
		const row = await this.getOrCreate();
		row.adminItAsAppadmin = null;
		row.allowNestedLeadGroups = null;
		row.updatedBy = updatedBy ?? null;
		await this.repo.save(row);
		return this.getRoleCompatSetting();
	}

	async getRoleCompatOptions(): Promise<V2RoleCompatOptions> {
		const dto = await this.getRoleCompatSetting();
		return {
			adminItAsAppadmin: dto.adminItAsAppadmin,
			allowNestedLeadGroups: dto.allowNestedLeadGroups,
		};
	}

	async getDadmProgramManagerSetting(): Promise<V2DadmProgramManagerSettingDto> {
		const row = await this.getOrCreate();
		const envDefaultEnabled = this.getEnvDadmProgramManagerEnabled();
		const override = row.dadmProgramManagerEnabled;
		return {
			enabled: override == null ? envDefaultEnabled : override,
			envDefaultEnabled,
			override,
		};
	}

	async setDadmProgramManagerEnabled(
		enabled: boolean,
		updatedBy?: string | null,
	): Promise<V2DadmProgramManagerSettingDto> {
		const row = await this.getOrCreate();
		row.dadmProgramManagerEnabled = enabled;
		row.updatedBy = updatedBy ?? null;
		await this.repo.save(row);
		return this.getDadmProgramManagerSetting();
	}

	async clearDadmProgramManagerOverride(
		updatedBy?: string | null,
	): Promise<V2DadmProgramManagerSettingDto> {
		const row = await this.getOrCreate();
		row.dadmProgramManagerEnabled = null;
		row.updatedBy = updatedBy ?? null;
		await this.repo.save(row);
		return this.getDadmProgramManagerSetting();
	}

	async isDadmProgramManagerEnabled(): Promise<boolean> {
		const dto = await this.getDadmProgramManagerSetting();
		return dto.enabled;
	}

	async getEditLockHardDisableSetting(): Promise<V2EditLockHardDisableSettingDto> {
		const row = await this.getOrCreate();
		const envDefaultEnabled = this.getEnvEditLockHardDisableEnabled();
		const override = row.editLockHardDisableEnabled;
		return {
			enabled: override == null ? envDefaultEnabled : override,
			envDefaultEnabled,
			override,
		};
	}

	async setEditLockHardDisableEnabled(
		enabled: boolean,
		updatedBy?: string | null,
	): Promise<V2EditLockHardDisableSettingDto> {
		const row = await this.getOrCreate();
		row.editLockHardDisableEnabled = enabled;
		row.updatedBy = updatedBy ?? null;
		await this.repo.save(row);
		return this.getEditLockHardDisableSetting();
	}

	async clearEditLockHardDisableOverride(
		updatedBy?: string | null,
	): Promise<V2EditLockHardDisableSettingDto> {
		const row = await this.getOrCreate();
		row.editLockHardDisableEnabled = null;
		row.updatedBy = updatedBy ?? null;
		await this.repo.save(row);
		return this.getEditLockHardDisableSetting();
	}

	async isEditLockHardDisableEnabled(): Promise<boolean> {
		const dto = await this.getEditLockHardDisableSetting();
		return dto.enabled;
	}

	async getKeycloakEtalonOverlay(): Promise<Record<string, unknown> | null> {
		const row = await this.getOrCreate();
		return row.keycloakEtalonOverlay ?? null;
	}

	async setKeycloakEtalonOverlay(
		overlay: Record<string, unknown> | null,
		updatedBy?: string | null,
	): Promise<Record<string, unknown> | null> {
		const row = await this.getOrCreate();
		row.keycloakEtalonOverlay = overlay;
		row.updatedBy = updatedBy ?? null;
		await this.repo.save(row);
		return row.keycloakEtalonOverlay ?? null;
	}

	private async getOrCreate(): Promise<V2RuntimeSettingsEntity> {
		let row = await this.repo.findOne({ where: { id: 1 } });
		if (row) return row;
		row = this.repo.create({
			id: 1,
			streamFilterEnabled: null,
			workEstimatesStreamFilterEnabled: null,
			adminItAsAppadmin: null,
			allowNestedLeadGroups: null,
			dadmProgramManagerEnabled: null,
			editLockHardDisableEnabled: null,
			updatedBy: null,
		});
		return this.repo.save(row);
	}
}

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

export type V2RoleCompatSettingDto = {
	adminItAsAppadmin: boolean;
	adminItAsAppadminEnvDefault: boolean;
	adminItAsAppadminOverride: boolean | null;
	allowNestedLeadGroups: boolean;
	allowNestedLeadGroupsEnvDefault: boolean;
	allowNestedLeadGroupsOverride: boolean | null;
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

	getDeModelopsViewAllStreams(): boolean {
		return process.env.DE_MODELOPS_VIEW_ALL_STREAMS !== "false";
	}

	getEnvAdminItAsAppadmin(): boolean {
		return process.env.ADMIN_IT_AS_APPADMIN !== "false";
	}

	getEnvAllowNestedLeadGroups(): boolean {
		return process.env.ALLOW_NESTED_LEAD_GROUPS !== "false";
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
			adminItAsAppadmin: null,
			allowNestedLeadGroups: null,
			updatedBy: null,
		});
		return this.repo.save(row);
	}
}

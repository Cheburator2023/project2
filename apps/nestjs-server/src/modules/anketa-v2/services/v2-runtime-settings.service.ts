import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { V2RuntimeSettingsEntity } from "../entities/v2-runtime-settings.entity";

export type V2StreamFilterSettingDto = {
	/** Итоговый флаг для UI (env default ⊕ DB override). */
	enabled: boolean;
	/** Default из env: STREAM_FILTER_DISABLED=true → false. */
	envDefaultEnabled: boolean;
	/** Явный override из админки; null = только env. */
	override: boolean | null;
};

@Injectable()
export class V2RuntimeSettingsService {
	constructor(
		@InjectRepository(V2RuntimeSettingsEntity)
		private readonly repo: Repository<V2RuntimeSettingsEntity>,
	) {}

	/** Env default: фильтр включён, пока не STREAM_FILTER_DISABLED=true. */
	getEnvDefaultEnabled(): boolean {
		return process.env.STREAM_FILTER_DISABLED !== "true";
	}

	async getStreamFilterSetting(): Promise<V2StreamFilterSettingDto> {
		const row = await this.getOrCreate();
		const envDefaultEnabled = this.getEnvDefaultEnabled();
		const override = row.streamFilterEnabled;
		return {
			enabled: override == null ? envDefaultEnabled : override,
			envDefaultEnabled,
			override,
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
			updatedBy: null,
		});
		return this.repo.save(row);
	}
}

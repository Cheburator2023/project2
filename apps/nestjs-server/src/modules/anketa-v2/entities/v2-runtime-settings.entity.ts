import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

/**
 * Singleton runtime-настройки v2.
 * `stream_filter_enabled = null` → брать default из env Nest
 * (`STREAM_FILTER_DISABLED=true` → выкл., иначе вкл.).
 */
@Entity({ name: "v2_runtime_settings" })
export class V2RuntimeSettingsEntity {
	@PrimaryColumn({ type: "smallint", default: 1 })
	id!: number;

	/**
	 * UI-фильтр реестра по стриму.
	 * null = использовать env default.
	 */
	@Column({
		name: "stream_filter_enabled",
		type: "boolean",
		nullable: true,
		default: null,
	})
	streamFilterEnabled!: boolean | null;

	/**
	 * Overlay эталона матрицы Keycloak (groupRoleTarget + testUsers).
	 * null = только code defaults (F-05 + test-users).
	 */
	@Column({
		name: "keycloak_etalon_overlay",
		type: "jsonb",
		nullable: true,
		default: null,
	})
	keycloakEtalonOverlay!: Record<string, unknown> | null;

	@UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
	updatedAt!: Date;

	@Column({ name: "updated_by", type: "varchar", length: 255, nullable: true })
	updatedBy!: string | null;
}

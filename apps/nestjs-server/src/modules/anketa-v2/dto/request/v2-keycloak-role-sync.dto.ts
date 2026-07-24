import {
	IsBoolean,
	IsObject,
	IsOptional,
	IsString,
	MinLength,
	ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

/** Креды Keycloak admin + опциональный override URL (не сохраняются). */
export class V2KeycloakAdminCredsDto {
	@IsString()
	@MinLength(1)
	adminUsername!: string;

	@IsString()
	@MinLength(1)
	adminPassword!: string;

	/**
	 * Base URL Keycloak Admin/OpenID (без trailing slash), напр.
	 * https://keycloak-….local/auth
	 * Если пусто — берётся KEYCLOAK_URL с сервера.
	 */
	@IsOptional()
	@IsString()
	keycloakUrl?: string;

	/** Realm приложения (по умолчанию KEYCLOAK_REALMS / cym). */
	@IsOptional()
	@IsString()
	realm?: string;

	/** Realm админа для admin-cli token (по умолчанию KEYCLOAK_ADMIN_REALM / master). */
	@IsOptional()
	@IsString()
	adminRealm?: string;
}

/** Что включать в JSON-бекап (по умолчанию всё true). */
export class V2KeycloakBackupIncludeDto {
	@IsOptional()
	@IsBoolean()
	realmRoles?: boolean;

	@IsOptional()
	@IsBoolean()
	groups?: boolean;

	@IsOptional()
	@IsBoolean()
	groupAttributes?: boolean;

	@IsOptional()
	@IsBoolean()
	groupRealmRoles?: boolean;

	@IsOptional()
	@IsBoolean()
	groupMembers?: boolean;

	@IsOptional()
	@IsBoolean()
	users?: boolean;

	@IsOptional()
	@IsBoolean()
	userProfile?: boolean;

	@IsOptional()
	@IsBoolean()
	userAttributes?: boolean;

	@IsOptional()
	@IsBoolean()
	userGroups?: boolean;

	@IsOptional()
	@IsBoolean()
	userRealmRoles?: boolean;
}

export class V2KeycloakBackupRequestDto extends V2KeycloakAdminCredsDto {
	@IsOptional()
	@ValidateNested()
	@Type(() => V2KeycloakBackupIncludeDto)
	include?: V2KeycloakBackupIncludeDto;
}

/**
 * Восстановление из JSON, скачанного через /backup.
 * `backup` — целиком тело файла (валидируется в сервисе).
 */
export class V2KeycloakRestoreRequestDto extends V2KeycloakAdminCredsDto {
	/** По умолчанию true — только план без записи. */
	@IsOptional()
	@IsBoolean()
	dryRun?: boolean;

	@IsObject()
	backup!: Record<string, unknown>;

	/**
	 * Какие секции восстанавливать. Если не задано — по `backup.include`
	 * (или всё доступное в JSON).
	 */
	@IsOptional()
	@ValidateNested()
	@Type(() => V2KeycloakBackupIncludeDto)
	include?: V2KeycloakBackupIncludeDto;
}

export class V2KeycloakRoleSyncDto extends V2KeycloakAdminCredsDto {
	/** По умолчанию true — только план без записи. */
	@IsOptional()
	@IsBoolean()
	dryRun?: boolean;

	/** Remap group → anketa_* roles. Merge дублей отключён и игнорируется, если прислать. */
	@IsOptional()
	@IsBoolean()
	applyRemap?: boolean;

	/**
	 * Префикс стенда для AD-групп: `test_` / `dev_` / `prod_` / пусто.
	 * На ИФТ: test_ → роли ещё и на `/test_sum_appadmin` (AD: всегда sum_, не test_appadmin).
	 */
	@IsOptional()
	@IsString()
	standPrefix?: string;
}

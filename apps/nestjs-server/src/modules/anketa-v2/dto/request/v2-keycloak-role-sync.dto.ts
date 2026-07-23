import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

/** Креды Keycloak admin (не сохраняются). */
export class V2KeycloakAdminCredsDto {
	@IsString()
	@MinLength(1)
	adminUsername!: string;

	@IsString()
	@MinLength(1)
	adminPassword!: string;
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
}

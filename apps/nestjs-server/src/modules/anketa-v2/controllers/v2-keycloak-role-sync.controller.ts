import { Body, Controller, Delete, Get, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { DomainRoles } from "../../../shared/decorators/domain-roles.decorator";
import { CurrentUser } from "../../../shared/decorators/user.decorator";
import {
	V2KeycloakBackupRequestDto,
	V2KeycloakEtalonOverlayDto,
	V2KeycloakMatrixApplyDto,
	V2KeycloakMatrixDiffDto,
	V2KeycloakMatrixInspectDto,
	V2KeycloakRestoreRequestDto,
	V2KeycloakRoleSyncDto,
	V2KeycloakTestUsersDto,
} from "../dto/request/v2-keycloak-role-sync.dto";
import {
	type V2KeycloakMatrixInspectDto as InspectResult,
	V2KeycloakRoleSyncService,
} from "../services/v2-keycloak-role-sync.service";

function readUsername(
	user: Record<string, unknown> | undefined,
): string | null {
	const preferred = user?.preferred_username;
	if (typeof preferred === "string" && preferred.trim()) return preferred.trim();
	const username = user?.username;
	if (typeof username === "string" && username.trim()) return username.trim();
	return null;
}

@ApiTags("v2-keycloak-role-sync")
@Controller("v2/admin/keycloak-role-sync")
export class V2KeycloakRoleSyncController {
	constructor(private readonly syncService: V2KeycloakRoleSyncService) {}

	@Get("defaults")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary:
			"Дефолтный Keycloak URL / realm из env Nest (для префилла в UI)",
	})
	defaults(): {
		keycloakUrl: string;
		realm: string;
		adminRealm: string;
	} {
		return this.syncService.getDefaults();
	}

	@Get("etalon")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary: "Эталон матрицы: code defaults ⊕ overlay (+ standPrefix query через body POST resolve)",
	})
	async getEtalon() {
		const overlay = await this.syncService.getEtalonOverlay();
		const resolved = await this.syncService.resolveEtalonWithOverlay("dev_");
		return { overlay, resolved };
	}

	@Put("etalon")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({ summary: "Сохранить custom etalon overlay" })
	async putEtalon(
		@Body() body: V2KeycloakEtalonOverlayDto,
		@CurrentUser() user: Record<string, unknown> | undefined,
	) {
		const overlay = await this.syncService.setEtalonOverlay(
			body,
			readUsername(user),
		);
		return { overlay };
	}

	@Delete("etalon")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({ summary: "Сбросить overlay к code defaults" })
	async clearEtalon(
		@CurrentUser() user: Record<string, unknown> | undefined,
	) {
		await this.syncService.setEtalonOverlay(null, readUsername(user));
		return { overlay: null };
	}

	@Post("etalon/resolve")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({ summary: "Резолв эталона с standPrefix (без KK)" })
	async resolveEtalon(@Body() body: { standPrefix?: string }) {
		return this.syncService.resolveEtalonWithOverlay(body.standPrefix);
	}

	@Post("inspect")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary:
			"Live-снимок KK для матрицы (группы anketa_*, members, test-users groups)",
	})
	async inspect(@Body() body: V2KeycloakMatrixInspectDto) {
		return this.syncService.inspectMatrix({
			adminUsername: body.adminUsername,
			adminPassword: body.adminPassword,
			keycloakUrl: body.keycloakUrl,
			realm: body.realm,
			adminRealm: body.adminRealm,
			standPrefix: body.standPrefix,
			etalonScopeOnly: body.etalonScopeOnly !== false,
		});
	}

	@Post("matrix/diff")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({ summary: "Сверка live KK с эталоном F-05 + test-users" })
	async matrixDiff(@Body() body: V2KeycloakMatrixDiffDto) {
		return this.syncService.diffMatrix({
			adminUsername: body.adminUsername,
			adminPassword: body.adminPassword,
			keycloakUrl: body.keycloakUrl,
			realm: body.realm,
			adminRealm: body.adminRealm,
			standPrefix: body.standPrefix,
			inspect: body.inspect as InspectResult | undefined,
		});
	}

	@Post("matrix/apply")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary:
			"Применить patch матрицы (group anketa_* + user membership; dry-run по умолчанию)",
	})
	async matrixApply(@Body() body: V2KeycloakMatrixApplyDto) {
		return this.syncService.applyMatrixPatch({
			adminUsername: body.adminUsername,
			adminPassword: body.adminPassword,
			keycloakUrl: body.keycloakUrl,
			realm: body.realm,
			adminRealm: body.adminRealm,
			standPrefix: body.standPrefix,
			dryRun: body.dryRun !== false,
			groupRoleChanges: body.groupRoleChanges,
			userGroupChanges: body.userGroupChanges,
		});
	}

	@Post("backup")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary:
			"Скачать JSON-бекап Keycloak (секции через include.*; креды не сохраняются)",
	})
	async backup(@Body() body: V2KeycloakBackupRequestDto) {
		return this.syncService.createBackup({
			adminUsername: body.adminUsername,
			adminPassword: body.adminPassword,
			keycloakUrl: body.keycloakUrl,
			realm: body.realm,
			adminRealm: body.adminRealm,
			include: body.include,
		});
	}

	@Post("restore")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary:
			"Восстановить Keycloak из JSON-бекапа (dry-run по умолчанию; anketa_* на группах/юзерах, membership)",
	})
	async restore(@Body() body: V2KeycloakRestoreRequestDto) {
		return this.syncService.restoreFromBackup({
			adminUsername: body.adminUsername,
			adminPassword: body.adminPassword,
			dryRun: body.dryRun !== false,
			keycloakUrl: body.keycloakUrl,
			realm: body.realm,
			adminRealm: body.adminRealm,
			backup: body.backup,
			include: body.include,
		});
	}

	@Post()
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary:
			"Remap realm roles групп по F-05 (+ AD-alias с standPrefix; креды admin не сохраняются)",
	})
	async sync(@Body() body: V2KeycloakRoleSyncDto) {
		return this.syncService.sync({
			adminUsername: body.adminUsername,
			adminPassword: body.adminPassword,
			dryRun: body.dryRun !== false,
			applyRemap: body.applyRemap !== false,
			keycloakUrl: body.keycloakUrl,
			realm: body.realm,
			adminRealm: body.adminRealm,
			standPrefix: body.standPrefix,
		});
	}

	@Post("test-users")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary:
			"Создать тестовых test_* пользователей по матрице (пароль=логин; существующих пропускает)",
	})
	async provisionTestUsers(@Body() body: V2KeycloakTestUsersDto) {
		return this.syncService.provisionTestUsers({
			adminUsername: body.adminUsername,
			adminPassword: body.adminPassword,
			dryRun: body.dryRun !== false,
			keycloakUrl: body.keycloakUrl,
			realm: body.realm,
			adminRealm: body.adminRealm,
			standPrefix: body.standPrefix,
		});
	}
}

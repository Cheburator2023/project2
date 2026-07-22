import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RealmRole } from "../../../shared/decorators/realm-role.decorator";
import { Permission } from "../../../shared/types/permissions";
import {
	V2KeycloakAdminCredsDto,
	V2KeycloakRoleSyncDto,
} from "../dto/request/v2-keycloak-role-sync.dto";
import { V2KeycloakRoleSyncService } from "../services/v2-keycloak-role-sync.service";

@ApiTags("v2-keycloak-role-sync")
@Controller("v2/admin/keycloak-role-sync")
export class V2KeycloakRoleSyncController {
	constructor(private readonly syncService: V2KeycloakRoleSyncService) {}

	@Get("status")
	@RealmRole(Permission.ANKETA_ADMIN_PANEL)
	@ApiOperation({
		summary:
			"Доступна ли кнопка синхронизации ролей Keycloak (ИФТ/dev)",
	})
	status(): { enabled: boolean } {
		return { enabled: this.syncService.isEnabled() };
	}

	@Post("backup")
	@RealmRole(Permission.ANKETA_ADMIN_PANEL)
	@ApiOperation({
		summary:
			"Скачать JSON-бекап групп/ролей/юзеров Keycloak перед sync (креды не сохраняются)",
	})
	async backup(@Body() body: V2KeycloakAdminCredsDto) {
		return this.syncService.createBackup({
			adminUsername: body.adminUsername,
			adminPassword: body.adminPassword,
		});
	}

	@Post()
	@RealmRole(Permission.ANKETA_ADMIN_PANEL)
	@ApiOperation({
		summary:
			"Remap realm roles групп по F-05 (без склейки/удаления Latin-дублей; креды admin не сохраняются)",
	})
	async sync(@Body() body: V2KeycloakRoleSyncDto) {
		return this.syncService.sync({
			adminUsername: body.adminUsername,
			adminPassword: body.adminPassword,
			dryRun: body.dryRun !== false,
			applyRemap: body.applyRemap !== false,
		});
	}
}

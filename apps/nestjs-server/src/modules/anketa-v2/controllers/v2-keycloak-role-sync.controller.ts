import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { DomainRoles } from "../../../shared/decorators/domain-roles.decorator";
import {
	V2KeycloakAdminCredsDto,
	V2KeycloakRoleSyncDto,
} from "../dto/request/v2-keycloak-role-sync.dto";
import { V2KeycloakRoleSyncService } from "../services/v2-keycloak-role-sync.service";

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

	@Post("backup")
	@DomainRoles("appadmin", "sacfg")
	@ApiOperation({
		summary:
			"Скачать JSON-бекап групп/ролей/юзеров Keycloak перед sync (креды не сохраняются)",
	})
	async backup(@Body() body: V2KeycloakAdminCredsDto) {
		return this.syncService.createBackup({
			adminUsername: body.adminUsername,
			adminPassword: body.adminPassword,
			keycloakUrl: body.keycloakUrl,
			realm: body.realm,
			adminRealm: body.adminRealm,
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
}

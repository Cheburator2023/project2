import {
	CanActivate,
	ExecutionContext,
	Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DOMAIN_ROLES_KEY } from "../decorators/domain-roles.decorator";
import { normalizeUserGroups } from "../utils/user-groups.util";

@Injectable()
export class DomainRolesGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		if (process.env.NO_ROLES === "true") return true;

		const required = this.reflector.getAllAndOverride<string[] | undefined>(
			DOMAIN_ROLES_KEY,
			[context.getHandler(), context.getClass()],
		);
		if (!required?.length) return true;

		const request = context.switchToHttp().getRequest();
		const user = request.user as
			| {
					groups?: string[];
					realm_access?: { roles?: string[] };
			  }
			| undefined;

		const fromGroups = new Set(normalizeUserGroups(user?.groups ?? []));
		const fromRealm = new Set(user?.realm_access?.roles ?? []);

		return required.some(
			(role) => fromGroups.has(role) || fromRealm.has(role),
		);
	}
}

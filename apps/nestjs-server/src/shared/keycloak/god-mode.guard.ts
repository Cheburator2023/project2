import {
	CanActivate,
	ExecutionContext,
	Inject,
	Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class GodModeGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		@Inject("DELEGATE_GUARD") private readonly delegateGuard: CanActivate,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) {
			return true;
		}

		if (process.env.NO_ROLES === "true") {
			// God mode: always allow
			return true;
		}
		// Otherwise, delegate to the real guard
		if (typeof this.delegateGuard.canActivate === "function") {
			return this.delegateGuard.canActivate(context) as any;
		}
		return true;
	}
}

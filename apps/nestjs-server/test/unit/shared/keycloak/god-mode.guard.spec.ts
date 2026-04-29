import { GodModeGuard } from "../../../../src/shared/keycloak/god-mode.guard";

describe("GodModeGuard", () => {
	const ctx = { switchToHttp: () => ({}) } as any;
	const reflector: any = {};

	afterEach(() => {
		delete process.env.NO_ROLES;
	});

	it("returns true when NO_ROLES=true", async () => {
		process.env.NO_ROLES = "true";
		const guard = new GodModeGuard(reflector, {
			canActivate: jest.fn(),
		} as any);
		expect(await guard.canActivate(ctx)).toBe(true);
	});

	it("delegates to provided guard otherwise", async () => {
		const delegate = { canActivate: jest.fn().mockResolvedValue(false) };
		const guard = new GodModeGuard(reflector, delegate as any);
		expect(await guard.canActivate(ctx)).toBe(false);
		expect(delegate.canActivate).toHaveBeenCalled();
	});

	it("returns true if delegate has no canActivate function", async () => {
		const guard = new GodModeGuard(reflector, {} as any);
		expect(await guard.canActivate(ctx)).toBe(true);
	});
});

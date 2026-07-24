import {
	ForbiddenException,
	Injectable,
	Logger,
	ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
	V2_KEYCLOAK_GROUP_ROLE_TARGET,
	V2_KEYCLOAK_GROUPS_TO_ENSURE,
	V2_KEYCLOAK_ROLE_DESCRIPTIONS,
	V2_KEYCLOAK_ROLES_TO_ENSURE,
} from "../constants/v2-keycloak-f05-sync";

type KcGroup = {
	id: string;
	name: string;
	path: string;
	subGroups?: KcGroup[];
};

type KcRole = { id: string; name: string };

type KcUser = { id: string; username?: string };

export type V2KeycloakRoleSyncResult = {
	dryRun: boolean;
	keycloakUrl: string;
	realm: string;
	/** Merge дублей отключён — всегда пустой (не трогаем /DE vs /de). */
	merge: [];
	rolesCreated: string[];
	/** Созданные top-level группы из матрицы (/mntranlst, /da, /auditorib, …). */
	groupsCreated: string[];
	groupRoleChanges: Array<{
		path: string;
		add: string[];
		remove: string[];
		status: "ok" | "missing_group" | "updated" | "would_update";
	}>;
};

export type V2KeycloakBackupDto = {
	exportedAt: string;
	keycloakUrl: string;
	realm: string;
	purpose: "pre-f05-sync-backup";
	counts: {
		realmRoles: number;
		anketaRoles: number;
		groups: number;
		users: number;
	};
	realmRoles: Array<{ id: string; name: string; description?: string | null }>;
	groups: Array<{
		id: string;
		path: string;
		name: string;
		realmRoles: string[];
		anketaRealmRoles: string[];
		memberUsernames: string[];
	}>;
	users: Array<{
		id: string;
		username: string | null;
		email: string | null;
		enabled: boolean | null;
		groups: string[];
		realmRolesDirect: string[];
		realmRolesEffective: string[];
		anketaPermissions: string[];
	}>;
};

@Injectable()
export class V2KeycloakRoleSyncService {
	private readonly logger = new Logger(V2KeycloakRoleSyncService.name);

	constructor(private readonly config: ConfigService) {}

	/** Дефолты из env — для префилла в UI. */
	getDefaults(): {
		keycloakUrl: string;
		realm: string;
		adminRealm: string;
	} {
		return {
			keycloakUrl: (this.config.get<string>("KEYCLOAK_URL") || "").replace(
				/\/$/,
				"",
			),
			realm: this.config.get<string>("KEYCLOAK_REALMS") || "cym",
			adminRealm: this.config.get<string>("KEYCLOAK_ADMIN_REALM") || "master",
		};
	}

	private resolveConnection(options: {
		keycloakUrl?: string;
		realm?: string;
		adminRealm?: string;
	}): { keycloakUrl: string; realm: string; adminRealm: string } {
		const defaults = this.getDefaults();
		const keycloakUrl = (
			options.keycloakUrl?.trim() ||
			defaults.keycloakUrl ||
			""
		).replace(/\/$/, "");
		const realm = options.realm?.trim() || defaults.realm;
		const adminRealm = options.adminRealm?.trim() || defaults.adminRealm;
		if (!keycloakUrl) {
			throw new ServiceUnavailableException(
				"Keycloak URL не задан (KEYCLOAK_URL / поле в UI)",
			);
		}
		return { keycloakUrl, realm, adminRealm };
	}

	async createBackup(options: {
		adminUsername: string;
		adminPassword: string;
		keycloakUrl?: string;
		realm?: string;
		adminRealm?: string;
	}): Promise<V2KeycloakBackupDto> {
		const { keycloakUrl, realm, adminRealm } = this.resolveConnection(options);

		const token = await this.fetchAdminToken({
			keycloakUrl,
			adminRealm,
			username: options.adminUsername,
			password: options.adminPassword,
		});

		const realmRolesRaw =
			(await this.api<
				Array<KcRole & { description?: string }>
			>(keycloakUrl, realm, token, "GET", "/roles?max=500")) || [];

		const byPath = await this.loadGroupsByPath(keycloakUrl, realm, token);
		const groups: V2KeycloakBackupDto["groups"] = [];
		for (const g of Object.values(byPath).sort((a, b) =>
			a.path.localeCompare(b.path),
		)) {
			const roles =
				(await this.api<KcRole[]>(
					keycloakUrl,
					realm,
					token,
					"GET",
					`/groups/${g.id}/role-mappings/realm`,
				)) || [];
			const roleNames = roles.map((r) => r.name).sort();
			const members = await this.listMembers(
				keycloakUrl,
				realm,
				token,
				g.id,
			);
			groups.push({
				id: g.id,
				path: g.path,
				name: g.name,
				realmRoles: roleNames,
				anketaRealmRoles: roleNames.filter((n) => n.startsWith("anketa_")),
				memberUsernames: members
					.map((m) => m.username || m.id)
					.sort(),
			});
		}

		const users: V2KeycloakBackupDto["users"] = [];
		for (let first = 0; ; first += 100) {
			const batch =
				(await this.api<
					Array<{
						id: string;
						username?: string;
						email?: string;
						enabled?: boolean;
					}>
				>(
					keycloakUrl,
					realm,
					token,
					"GET",
					`/users?first=${first}&max=100&briefRepresentation=false`,
				)) || [];
			if (!batch.length) break;

			for (const u of batch) {
				const [userGroups, realmDirect, realmComposite] = await Promise.all([
					this.api<KcGroup[]>(
						keycloakUrl,
						realm,
						token,
						"GET",
						`/users/${u.id}/groups?max=200`,
					),
					this.api<KcRole[]>(
						keycloakUrl,
						realm,
						token,
						"GET",
						`/users/${u.id}/role-mappings/realm`,
					),
					this.api<KcRole[]>(
						keycloakUrl,
						realm,
						token,
						"GET",
						`/users/${u.id}/role-mappings/realm/composite`,
					),
				]);
				const effective = (realmComposite || []).map((r) => r.name).sort();
				users.push({
					id: u.id,
					username: u.username ?? null,
					email: u.email ?? null,
					enabled: u.enabled ?? null,
					groups: (userGroups || [])
						.map((g) => g.path)
						.sort(),
					realmRolesDirect: (realmDirect || []).map((r) => r.name).sort(),
					realmRolesEffective: effective,
					anketaPermissions: effective.filter((n) => n.startsWith("anketa_")),
				});
			}
			if (batch.length < 100) break;
		}

		users.sort((a, b) =>
			String(a.username).localeCompare(String(b.username)),
		);

		const backup: V2KeycloakBackupDto = {
			exportedAt: new Date().toISOString(),
			keycloakUrl,
			realm,
			purpose: "pre-f05-sync-backup",
			counts: {
				realmRoles: realmRolesRaw.length,
				anketaRoles: realmRolesRaw.filter((r) =>
					r.name.startsWith("anketa_"),
				).length,
				groups: groups.length,
				users: users.length,
			},
			realmRoles: realmRolesRaw
				.map((r) => ({
					id: r.id,
					name: r.name,
					description: r.description ?? null,
				}))
				.sort((a, b) => a.name.localeCompare(b.name)),
			groups,
			users,
		};

		this.logger.log(
			`Keycloak backup: realm=${realm} groups=${groups.length} users=${users.length}`,
		);
		return backup;
	}

	async sync(options: {
		adminUsername: string;
		adminPassword: string;
		dryRun: boolean;
		applyRemap: boolean;
		keycloakUrl?: string;
		realm?: string;
		adminRealm?: string;
	}): Promise<V2KeycloakRoleSyncResult> {
		const { keycloakUrl, realm, adminRealm } = this.resolveConnection(options);

		const token = await this.fetchAdminToken({
			keycloakUrl,
			adminRealm,
			username: options.adminUsername,
			password: options.adminPassword,
		});

		const apply = !options.dryRun;
		const result: V2KeycloakRoleSyncResult = {
			dryRun: options.dryRun,
			keycloakUrl,
			realm,
			merge: [],
			rolesCreated: [],
			groupsCreated: [],
			groupRoleChanges: [],
		};

		// Merge Latin-дублей (/DE→/de) намеренно НЕ выполняется — дубли не трогаем.
		if (options.applyRemap) {
			const remap = await this.runRemap({
				keycloakUrl,
				realm,
				token,
				apply,
			});
			result.rolesCreated = remap.rolesCreated;
			result.groupsCreated = remap.groupsCreated;
			result.groupRoleChanges = remap.groupRoleChanges;
		}

		this.logger.log(
			`Keycloak F-05 sync finished dryRun=${options.dryRun} roleChanges=${result.groupRoleChanges.length}`,
		);
		return result;
	}

	private describeFetchError(url: string, err: unknown): string {
		const e = err as {
			message?: string;
			cause?: { code?: string; hostname?: string; message?: string };
		};
		const code = e?.cause?.code || "";
		const host = e?.cause?.hostname || "";
		const detail = [code, host, e?.cause?.message || e?.message]
			.filter(Boolean)
			.join(" · ");
		return `Не удалось достучаться до Keycloak (${url}): ${detail || "fetch failed"}. Проверьте URL (DNS/сеть из пода API) или переопределите в UI.`;
	}

	private async safeFetch(
		url: string,
		init?: RequestInit,
	): Promise<Response> {
		try {
			return await fetch(url, init);
		} catch (err) {
			throw new ServiceUnavailableException(this.describeFetchError(url, err));
		}
	}

	private async fetchAdminToken(args: {
		keycloakUrl: string;
		adminRealm: string;
		username: string;
		password: string;
	}): Promise<string> {
		const body = new URLSearchParams({
			client_id: "admin-cli",
			username: args.username,
			password: args.password,
			grant_type: "password",
		});
		const tokenUrl = `${args.keycloakUrl}/realms/${args.adminRealm}/protocol/openid-connect/token`;
		const res = await this.safeFetch(tokenUrl, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body,
		});
		if (!res.ok) {
			throw new ForbiddenException(
				`Не удалось получить admin token (${res.status}) с ${tokenUrl}. Проверьте креды и admin realm.`,
			);
		}
		const json = (await res.json()) as { access_token?: string };
		if (!json.access_token) {
			throw new ForbiddenException("Admin token пустой");
		}
		return json.access_token;
	}

	private async api<T>(
		keycloakUrl: string,
		realm: string,
		token: string,
		method: string,
		path: string,
		body?: unknown,
	): Promise<T | null> {
		const url = `${keycloakUrl}/admin/realms/${realm}${path}`;
		const res = await this.safeFetch(url, {
			method,
			headers: {
				Authorization: `Bearer ${token}`,
				...(body !== undefined ? { "Content-Type": "application/json" } : {}),
			},
			body: body !== undefined ? JSON.stringify(body) : undefined,
		});
		if (!res.ok && res.status !== 204) {
			const text = await res.text();
			throw new ServiceUnavailableException(
				`Keycloak ${method} ${path} → ${res.status}: ${text.slice(0, 400)}`,
			);
		}
		if (res.status === 204 || res.status === 201) return null;
		const text = await res.text();
		return text ? (JSON.parse(text) as T) : null;
	}

	private flattenGroups(nodes: KcGroup[] | undefined, acc: KcGroup[] = []) {
		for (const g of nodes || []) {
			acc.push(g);
			if (g.subGroups?.length) this.flattenGroups(g.subGroups, acc);
		}
		return acc;
	}

	private async loadGroupsByPath(
		keycloakUrl: string,
		realm: string,
		token: string,
	): Promise<Record<string, KcGroup>> {
		const tree = await this.api<KcGroup[]>(
			keycloakUrl,
			realm,
			token,
			"GET",
			"/groups?briefRepresentation=false&max=1000",
		);
		const groups = this.flattenGroups(tree || []);
		return Object.fromEntries(groups.map((g) => [g.path, g]));
	}

	private async listMembers(
		keycloakUrl: string,
		realm: string,
		token: string,
		groupId: string,
	): Promise<KcUser[]> {
		const out: KcUser[] = [];
		for (let first = 0; ; first += 100) {
			const batch = await this.api<KcUser[]>(
				keycloakUrl,
				realm,
				token,
				"GET",
				`/groups/${groupId}/members?first=${first}&max=100`,
			);
			if (!batch?.length) break;
			out.push(...batch);
			if (batch.length < 100) break;
		}
		return out;
	}

	private async runRemap(args: {
		keycloakUrl: string;
		realm: string;
		token: string;
		apply: boolean;
	}): Promise<{
		rolesCreated: string[];
		groupsCreated: string[];
		groupRoleChanges: V2KeycloakRoleSyncResult["groupRoleChanges"];
	}> {
		const roles =
			(await this.api<KcRole[]>(
				args.keycloakUrl,
				args.realm,
				args.token,
				"GET",
				"/roles?max=500",
			)) || [];
		const byName: Record<string, KcRole> = Object.fromEntries(
			roles.map((r) => [r.name, r]),
		);
		const rolesCreated: string[] = [];

		for (const name of V2_KEYCLOAK_ROLES_TO_ENSURE) {
			if (byName[name]) continue;
			if (!args.apply) {
				rolesCreated.push(name);
				continue;
			}
			try {
				await this.api(args.keycloakUrl, args.realm, args.token, "POST", "/roles", {
					name,
					description: V2_KEYCLOAK_ROLE_DESCRIPTIONS[name] || name,
				});
			} catch (e) {
				const msg = String(e);
				if (!msg.includes("409")) throw e;
			}
			const created = await this.api<KcRole>(
				args.keycloakUrl,
				args.realm,
				args.token,
				"GET",
				`/roles/${encodeURIComponent(name)}`,
			);
			if (created) {
				byName[name] = created;
				rolesCreated.push(name);
			}
		}

		const refreshed =
			(await this.api<KcRole[]>(
				args.keycloakUrl,
				args.realm,
				args.token,
				"GET",
				"/roles?max=500",
			)) || [];
		for (const r of refreshed) byName[r.name] = r;

		let byPath = await this.loadGroupsByPath(
			args.keycloakUrl,
			args.realm,
			args.token,
		);

		// Создаём недостающие группы из матрицы (parents first; ничего не удаляем).
		const groupsCreated: string[] = [];
		for (const path of V2_KEYCLOAK_GROUPS_TO_ENSURE) {
			if (byPath[path]) continue;
			groupsCreated.push(path);
			if (!args.apply) continue;

			const parts = path.split("/").filter(Boolean);
			const name = parts[parts.length - 1];
			try {
				if (parts.length === 1) {
					await this.api(
						args.keycloakUrl,
						args.realm,
						args.token,
						"POST",
						"/groups",
						{ name },
					);
				} else {
					const parentPath = `/${parts.slice(0, -1).join("/")}`;
					const parent = byPath[parentPath];
					if (!parent?.id) {
						throw new ServiceUnavailableException(
							`Нельзя создать ${path}: нет родителя ${parentPath}`,
						);
					}
					await this.api(
						args.keycloakUrl,
						args.realm,
						args.token,
						"POST",
						`/groups/${parent.id}/children`,
						{ name },
					);
				}
			} catch (e) {
				const msg = String(e);
				if (!msg.includes("409")) throw e;
			}
			byPath = await this.loadGroupsByPath(
				args.keycloakUrl,
				args.realm,
				args.token,
			);
		}

		const groupRoleChanges: V2KeycloakRoleSyncResult["groupRoleChanges"] = [];

		for (const [path, desired] of Object.entries(V2_KEYCLOAK_GROUP_ROLE_TARGET)) {
			const g = byPath[path];
			if (!g) {
				groupRoleChanges.push({
					path,
					add: [...desired],
					remove: [],
					status: "missing_group",
				});
				continue;
			}
			const current =
				(await this.api<KcRole[]>(
					args.keycloakUrl,
					args.realm,
					args.token,
					"GET",
					`/groups/${g.id}/role-mappings/realm`,
				)) || [];
			const have = current
				.map((r) => r.name)
				.filter((n) => n.startsWith("anketa_"))
				.sort();
			const want = [...desired].sort();
			const add = want.filter((n) => !have.includes(n));
			const remove = have.filter((n) => !want.includes(n));
			if (!add.length && !remove.length) {
				groupRoleChanges.push({ path, add: [], remove: [], status: "ok" });
				continue;
			}
			if (!args.apply) {
				groupRoleChanges.push({
					path,
					add,
					remove,
					status: "would_update",
				});
				continue;
			}
			if (add.length) {
				await this.api(
					args.keycloakUrl,
					args.realm,
					args.token,
					"POST",
					`/groups/${g.id}/role-mappings/realm`,
					add.map((name) => {
						const role = byName[name];
						if (!role) {
							throw new ServiceUnavailableException(`Role missing: ${name}`);
						}
						return { id: role.id, name: role.name };
					}),
				);
			}
			if (remove.length) {
				await this.api(
					args.keycloakUrl,
					args.realm,
					args.token,
					"DELETE",
					`/groups/${g.id}/role-mappings/realm`,
					remove.map((name) => {
						const role = byName[name];
						if (!role) {
							throw new ServiceUnavailableException(`Role missing: ${name}`);
						}
						return { id: role.id, name: role.name };
					}),
				);
			}
			groupRoleChanges.push({ path, add, remove, status: "updated" });
		}

		return { rolesCreated, groupsCreated, groupRoleChanges };
	}
}

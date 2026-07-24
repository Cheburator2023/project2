import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { expandV2KeycloakTargetsWithAdAliases, resolveV2KeycloakGroupPath } from "@smart-anketa/api-contract";
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
	attributes?: Record<string, string[]>;
	subGroups?: KcGroup[];
};

type KcRole = { id: string; name: string; composite?: boolean };

type KcUser = { id: string; username?: string };

const V2_KEYCLOAK_BACKUP_EXCLUDES = [
	"passwords / credentials",
	"clients, client scopes, protocol mappers",
	"client-level role mappings (user/group)",
	"identity providers / LDAP federation config",
	"realm settings, auth flows, localization",
] as const;

export type V2KeycloakBackupInclude = {
	realmRoles: boolean;
	groups: boolean;
	groupAttributes: boolean;
	groupRealmRoles: boolean;
	groupMembers: boolean;
	users: boolean;
	userProfile: boolean;
	userAttributes: boolean;
	userGroups: boolean;
	userRealmRoles: boolean;
};

export const V2_KEYCLOAK_BACKUP_INCLUDE_DEFAULTS: V2KeycloakBackupInclude = {
	realmRoles: true,
	groups: true,
	groupAttributes: true,
	groupRealmRoles: true,
	groupMembers: true,
	users: true,
	userProfile: true,
	userAttributes: true,
	userGroups: true,
	userRealmRoles: true,
};

function resolveBackupInclude(
	raw?: Partial<V2KeycloakBackupInclude> | null,
): V2KeycloakBackupInclude {
	return {
		...V2_KEYCLOAK_BACKUP_INCLUDE_DEFAULTS,
		...(raw ?? {}),
	};
}

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
	/** Фактически выбранные секции. */
	include: V2KeycloakBackupInclude;
	scope: {
		includes: string[];
		excludes: string[];
	};
	counts: {
		realmRoles: number;
		anketaRoles: number;
		groups: number;
		users: number;
	};
	realmRoles: Array<{
		id: string;
		name: string;
		description?: string | null;
		composite?: boolean | null;
	}>;
	groups: Array<{
		id: string;
		path: string;
		name: string;
		attributes: Record<string, string[]> | null;
		realmRoles: string[];
		anketaRealmRoles: string[];
		memberUsernames: string[];
	}>;
	users: Array<{
		id: string;
		username: string | null;
		email: string | null;
		firstName: string | null;
		lastName: string | null;
		emailVerified: boolean | null;
		enabled: boolean | null;
		createdTimestamp: number | null;
		federationLink: string | null;
		requiredActions: string[];
		attributes: Record<string, string[]> | null;
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
		include?: Partial<V2KeycloakBackupInclude> | null;
	}): Promise<V2KeycloakBackupDto> {
		const include = resolveBackupInclude(options.include);
		if (!include.realmRoles && !include.groups && !include.users) {
			throw new BadRequestException(
				"Выберите хотя бы одну секцию бекапа: realm roles / groups / users",
			);
		}

		const { keycloakUrl, realm, adminRealm } = this.resolveConnection(options);

		const token = await this.fetchAdminToken({
			keycloakUrl,
			adminRealm,
			username: options.adminUsername,
			password: options.adminPassword,
		});

		let realmRolesRaw: Array<KcRole & { description?: string }> = [];
		if (include.realmRoles) {
			realmRolesRaw =
				(await this.api<Array<KcRole & { description?: string }>>(
					keycloakUrl,
					realm,
					token,
					"GET",
					"/roles?briefRepresentation=false&max=1000",
				)) || [];
		}

		const groups: V2KeycloakBackupDto["groups"] = [];
		if (include.groups) {
			const byPath = await this.loadGroupsByPath(keycloakUrl, realm, token);
			for (const g of Object.values(byPath).sort((a, b) =>
				a.path.localeCompare(b.path),
			)) {
				let roleNames: string[] = [];
				if (include.groupRealmRoles) {
					const roles =
						(await this.api<KcRole[]>(
							keycloakUrl,
							realm,
							token,
							"GET",
							`/groups/${g.id}/role-mappings/realm`,
						)) || [];
					roleNames = roles.map((r) => r.name).sort();
				}

				let memberUsernames: string[] = [];
				if (include.groupMembers) {
					const members = await this.listMembers(
						keycloakUrl,
						realm,
						token,
						g.id,
					);
					memberUsernames = members
						.map((m) => m.username || m.id)
						.sort();
				}

				groups.push({
					id: g.id,
					path: g.path,
					name: g.name,
					attributes: include.groupAttributes ? (g.attributes ?? null) : null,
					realmRoles: roleNames,
					anketaRealmRoles: roleNames.filter((n) => n.startsWith("anketa_")),
					memberUsernames,
				});
			}
		}

		const users: V2KeycloakBackupDto["users"] = [];
		if (include.users) {
			for (let first = 0; ; first += 100) {
				const batch =
					(await this.api<
						Array<{
							id: string;
							username?: string;
							email?: string;
							firstName?: string;
							lastName?: string;
							emailVerified?: boolean;
							enabled?: boolean;
							createdTimestamp?: number;
							federationLink?: string;
							requiredActions?: string[];
							attributes?: Record<string, string[]>;
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
					const needGroups = include.userGroups;
					const needRoles = include.userRealmRoles;
					const [userGroups, realmDirect, realmComposite] = await Promise.all([
						needGroups
							? this.listUserGroups(keycloakUrl, realm, token, u.id)
							: Promise.resolve([] as KcGroup[]),
						needRoles
							? this.api<KcRole[]>(
									keycloakUrl,
									realm,
									token,
									"GET",
									`/users/${u.id}/role-mappings/realm`,
								)
							: Promise.resolve([] as KcRole[]),
						needRoles
							? this.api<KcRole[]>(
									keycloakUrl,
									realm,
									token,
									"GET",
									`/users/${u.id}/role-mappings/realm/composite`,
								)
							: Promise.resolve([] as KcRole[]),
					]);
					const effective = (realmComposite || []).map((r) => r.name).sort();
					const profile = include.userProfile;
					users.push({
						id: u.id,
						username: u.username ?? null,
						email: profile ? (u.email ?? null) : null,
						firstName: profile ? (u.firstName ?? null) : null,
						lastName: profile ? (u.lastName ?? null) : null,
						emailVerified: profile ? (u.emailVerified ?? null) : null,
						enabled: u.enabled ?? null,
						createdTimestamp: profile ? (u.createdTimestamp ?? null) : null,
						federationLink: profile ? (u.federationLink ?? null) : null,
						requiredActions: profile
							? [...(u.requiredActions || [])].sort()
							: [],
						attributes: include.userAttributes ? (u.attributes ?? null) : null,
						groups: needGroups
							? userGroups.map((g) => g.path).sort()
							: [],
						realmRolesDirect: needRoles
							? (realmDirect || []).map((r) => r.name).sort()
							: [],
						realmRolesEffective: needRoles ? effective : [],
						anketaPermissions: needRoles
							? effective.filter((n) => n.startsWith("anketa_"))
							: [],
					});
				}
				if (batch.length < 100) break;
			}

			users.sort((a, b) =>
				String(a.username).localeCompare(String(b.username)),
			);
		}

		const includesDesc: string[] = [];
		if (include.realmRoles) includesDesc.push("realm roles");
		if (include.groups) {
			const parts = ["groups"];
			if (include.groupAttributes) parts.push("attributes");
			if (include.groupRealmRoles) parts.push("realm role mappings");
			if (include.groupMembers) parts.push("members");
			includesDesc.push(parts.join(": "));
		}
		if (include.users) {
			const parts = ["users"];
			if (include.userProfile) parts.push("profile");
			if (include.userAttributes) parts.push("attributes");
			if (include.userGroups) parts.push("groups");
			if (include.userRealmRoles) parts.push("realm roles");
			includesDesc.push(parts.join(": "));
		}

		const backup: V2KeycloakBackupDto = {
			exportedAt: new Date().toISOString(),
			keycloakUrl,
			realm,
			purpose: "pre-f05-sync-backup",
			include,
			scope: {
				includes: includesDesc,
				excludes: [...V2_KEYCLOAK_BACKUP_EXCLUDES],
			},
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
					composite: r.composite ?? null,
				}))
				.sort((a, b) => a.name.localeCompare(b.name)),
			groups,
			users,
		};

		this.logger.log(
			`Keycloak backup: realm=${realm} groups=${groups.length} users=${users.length} include=${JSON.stringify(include)}`,
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
		standPrefix?: string;
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
				standPrefix: options.standPrefix,
			});
			result.rolesCreated = remap.rolesCreated;
			result.groupsCreated = remap.groupsCreated;
			result.groupRoleChanges = remap.groupRoleChanges;
		}

		this.logger.log(
			`Keycloak F-05 sync finished dryRun=${options.dryRun} standPrefix=${options.standPrefix || ""} roleChanges=${result.groupRoleChanges.length}`,
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

	private async listUserGroups(
		keycloakUrl: string,
		realm: string,
		token: string,
		userId: string,
	): Promise<KcGroup[]> {
		const out: KcGroup[] = [];
		for (let first = 0; ; first += 100) {
			const batch = await this.api<KcGroup[]>(
				keycloakUrl,
				realm,
				token,
				"GET",
				`/users/${userId}/groups?first=${first}&max=100&briefRepresentation=false`,
			);
			if (!batch?.length) break;
			out.push(...batch);
			if (batch.length < 100) break;
		}
		return out;
	}

	private flattenGroups(nodes: KcGroup[] | undefined, acc: KcGroup[] = []) {
		for (const g of nodes || []) {
			acc.push(g);
			if (g.subGroups?.length) this.flattenGroups(g.subGroups, acc);
		}
		return acc;
	}

	/**
	 * Дерево групп через `/groups` + flatten subGroups.
	 * GET `/groups/{id}/children` на старых KC (SUMD) → 405 — не используем.
	 * Недостающие TARGET leaf догружаем через `?search=&exact=true`.
	 */
	private async loadGroupsByPath(
		keycloakUrl: string,
		realm: string,
		token: string,
		neededPaths: readonly string[] = [],
	): Promise<Record<string, KcGroup>> {
		const byPath: Record<string, KcGroup> = {};
		const pageSize = 100;

		for (let first = 0; ; first += pageSize) {
			const batch =
				(await this.api<KcGroup[]>(
					keycloakUrl,
					realm,
					token,
					"GET",
					`/groups?briefRepresentation=false&first=${first}&max=${pageSize}`,
				)) || [];
			if (!batch.length) break;
			for (const g of this.flattenGroups(batch)) {
				if (g?.path) byPath[g.path] = g;
			}
			if (batch.length < pageSize) break;
		}

		for (const path of neededPaths) {
			if (resolveV2KeycloakGroupPath(path, Object.keys(byPath))) continue;
			const leaf = path.split("/").filter(Boolean).pop();
			if (!leaf) continue;
			const found =
				(await this.api<KcGroup[]>(
					keycloakUrl,
					realm,
					token,
					"GET",
					`/groups?search=${encodeURIComponent(leaf)}&exact=true&briefRepresentation=false&max=50`,
				)) || [];
			for (const g of this.flattenGroups(found)) {
				if (g?.path) byPath[g.path] = g;
			}
		}

		return byPath;
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
		standPrefix?: string;
	}): Promise<{
		rolesCreated: string[];
		groupsCreated: string[];
		groupRoleChanges: V2KeycloakRoleSyncResult["groupRoleChanges"];
	}> {
		const target = expandV2KeycloakTargetsWithAdAliases(
			V2_KEYCLOAK_GROUP_ROLE_TARGET,
			args.standPrefix,
		);
		const groupsToEnsure = [
			...new Set([
				...V2_KEYCLOAK_GROUPS_TO_ENSURE,
				...Object.keys(target),
			]),
		].sort(
			(a, b) =>
				a.split("/").length - b.split("/").length || a.localeCompare(b),
		);

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
			groupsToEnsure,
		);

		// Создаём недостающие группы: канон + AD-alias (parents first).
		// Leaf уже есть под другим path (`/sarep/dev_sum_sarep_dadm`) — не дублируем.
		const groupsCreated: string[] = [];
		for (const path of groupsToEnsure) {
			const existingPath = resolveV2KeycloakGroupPath(
				path,
				Object.keys(byPath),
			);
			if (existingPath) continue;
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
					const resolvedParent =
						resolveV2KeycloakGroupPath(parentPath, Object.keys(byPath)) ??
						parentPath;
					const parent = byPath[resolvedParent];
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
				groupsToEnsure,
			);
		}

		const groupRoleChanges: V2KeycloakRoleSyncResult["groupRoleChanges"] = [];
		/** Один KK group id — один remap (alias paths могут сходиться). */
		const remappedGroupIds = new Set<string>();

		for (const [path, desired] of Object.entries(target)) {
			const resolvedPath =
				resolveV2KeycloakGroupPath(path, Object.keys(byPath)) ?? path;
			const g = byPath[resolvedPath];
			if (!g) {
				groupRoleChanges.push({
					path,
					add: [...desired],
					remove: [],
					status: "missing_group",
				});
				continue;
			}
			if (remappedGroupIds.has(g.id)) {
				if (resolvedPath !== path) {
					groupRoleChanges.push({
						path: `${path} → ${resolvedPath}`,
						add: [],
						remove: [],
						status: "ok",
					});
				}
				continue;
			}
			remappedGroupIds.add(g.id);

			const reportPath =
				resolvedPath === path ? path : `${path} → ${resolvedPath}`;
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
				groupRoleChanges.push({
					path: reportPath,
					add: [],
					remove: [],
					status: "ok",
				});
				continue;
			}
			if (!args.apply) {
				groupRoleChanges.push({
					path: reportPath,
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
			groupRoleChanges.push({
				path: reportPath,
				add,
				remove,
				status: "updated",
			});
		}

		return { rolesCreated, groupsCreated, groupRoleChanges };
	}
}

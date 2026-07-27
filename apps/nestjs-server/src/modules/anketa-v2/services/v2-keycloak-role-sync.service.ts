import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
	expandV2KeycloakTargetsWithAdAliases,
	isV2KeycloakIgnoredOrgGroupPath,
	shouldEnsureV2KeycloakGroupPath,
	resolveV2KeycloakGroupPath,
	v2KeycloakGroupParentPath,
} from "@smart-anketa/api-contract";
import {
	V2_KEYCLOAK_GROUP_ROLE_TARGET,
	V2_KEYCLOAK_GROUPS_TO_ENSURE,
	V2_KEYCLOAK_ROLE_DESCRIPTIONS,
	V2_KEYCLOAK_ROLES_TO_ENSURE,
} from "../constants/v2-keycloak-f05-sync";
import { resolveV2KeycloakTestUsers } from "../constants/v2-keycloak-test-users";
import { V2RuntimeSettingsService } from "./v2-runtime-settings.service";

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
	/** Созданные группы (папки + AD-листы; без голых `/auditorib` / `/appadmin`). */
	groupsCreated: string[];
	groupRoleChanges: Array<{
		path: string;
		add: string[];
		remove: string[];
		status: "ok" | "missing_group" | "updated" | "would_update";
	}>;
};

export type V2KeycloakRestoreResult = {
	dryRun: boolean;
	keycloakUrl: string;
	realm: string;
	backupExportedAt: string | null;
	include: V2KeycloakBackupInclude;
	rolesCreated: string[];
	groupsCreated: string[];
	groupRoleChanges: Array<{
		path: string;
		add: string[];
		remove: string[];
		status: "ok" | "missing_group" | "updated" | "would_update";
	}>;
	userGroupChanges: Array<{
		username: string;
		join: string[];
		leave: string[];
		status: "ok" | "missing_user" | "updated" | "would_update";
	}>;
	userRoleChanges: Array<{
		username: string;
		add: string[];
		remove: string[];
		status: "ok" | "missing_user" | "updated" | "would_update";
	}>;
	warnings: string[];
};

export type V2KeycloakTestUsersResult = {
	dryRun: boolean;
	keycloakUrl: string;
	realm: string;
	standPrefix: string;
	users: Array<{
		username: string;
		label: string;
		groups: string[];
		status: "created" | "would_create" | "skipped_exists" | "error";
		error?: string;
	}>;
	groupsEnsured: string[];
	warnings: string[];
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

export type V2KeycloakEtalonOverlay = {
	groupRoleTarget?: Record<string, string[]>;
	testUsers?: Array<{ username: string; groups: string[]; label?: string }>;
};

export type V2KeycloakMatrixInspectDto = {
	exportedAt: string;
	keycloakUrl: string;
	realm: string;
	standPrefix: string;
	anketaRoles: string[];
	groups: Array<{
		path: string;
		anketaRoles: string[];
		memberUsernames: string[];
	}>;
	users: Array<{
		username: string;
		groups: string[];
	}>;
};

export type V2KeycloakMatrixDiffDto = {
	standPrefix: string;
	etalonSource: "code" | "code+overlay";
	groupRoleDiffs: Array<{
		path: string;
		role: string;
		status: "ok" | "missing" | "extra";
		expected: boolean;
		actual: boolean;
	}>;
	userGroupDiffs: Array<{
		username: string;
		group: string;
		status: "ok" | "missing" | "extra" | "warn";
		expected: boolean;
		actual: boolean;
		/** Soft placement hint (parent vs AD-leaf / nested lead). */
		hint?: string;
	}>;
	summary: {
		groupRoleMissing: number;
		groupRoleExtra: number;
		userGroupMissing: number;
		userGroupExtra: number;
		userGroupWarn: number;
	};
	etalon: {
		groupRoleTarget: Record<string, string[]>;
		testUsers: Array<{ username: string; label: string; groups: string[] }>;
	};
};

export type V2KeycloakMatrixApplyResult = {
	dryRun: boolean;
	keycloakUrl: string;
	realm: string;
	groupRoleChanges: V2KeycloakRoleSyncResult["groupRoleChanges"];
	userGroupChanges: V2KeycloakRestoreResult["userGroupChanges"];
	warnings: string[];
};

@Injectable()
export class V2KeycloakRoleSyncService {
	private readonly logger = new Logger(V2KeycloakRoleSyncService.name);

	constructor(
		private readonly config: ConfigService,
		private readonly runtimeSettings: V2RuntimeSettingsService,
	) {}

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

	/**
	 * Откат по JSON с /backup:
	 * - создать недостающие realm roles / groups path;
	 * - выровнять anketa_* на группах;
	 * - выровнять membership юзеров и их direct anketa_* (если есть в бекапе).
	 * Пароли, clients, IdP не трогаем.
	 */
	async restoreFromBackup(options: {
		adminUsername: string;
		adminPassword: string;
		dryRun: boolean;
		keycloakUrl?: string;
		realm?: string;
		adminRealm?: string;
		backup: unknown;
		include?: Partial<V2KeycloakBackupInclude> | null;
	}): Promise<V2KeycloakRestoreResult> {
		const parsed = this.parseBackupPayload(options.backup);
		const requested = resolveBackupInclude({
			...parsed.include,
			...(options.include ?? {}),
		});
		/** Не откатываем секцию, если в бекапе она была выключена (пустые массивы = риск wipe). */
		const include: V2KeycloakBackupInclude = {
			...requested,
			groupRealmRoles:
				requested.groupRealmRoles && parsed.include.groupRealmRoles !== false,
			groupAttributes:
				requested.groupAttributes &&
				parsed.include.groupAttributes !== false,
			userGroups:
				requested.userGroups && parsed.include.userGroups !== false,
			userRealmRoles:
				requested.userRealmRoles && parsed.include.userRealmRoles !== false,
			userProfile: false,
			userAttributes: false,
			groupMembers: false,
		};
		if (!include.realmRoles && !include.groups && !include.users) {
			throw new BadRequestException(
				"Выберите хотя бы одну секцию restore: realm roles / groups / users",
			);
		}

		const { keycloakUrl, realm, adminRealm } = this.resolveConnection({
			keycloakUrl: options.keycloakUrl || parsed.keycloakUrl || undefined,
			realm: options.realm || parsed.realm || undefined,
			adminRealm: options.adminRealm,
		});

		const token = await this.fetchAdminToken({
			keycloakUrl,
			adminRealm,
			username: options.adminUsername,
			password: options.adminPassword,
		});

		const apply = !options.dryRun;
		const result: V2KeycloakRestoreResult = {
			dryRun: options.dryRun,
			keycloakUrl,
			realm,
			backupExportedAt: parsed.exportedAt,
			include,
			rolesCreated: [],
			groupsCreated: [],
			groupRoleChanges: [],
			userGroupChanges: [],
			userRoleChanges: [],
			warnings: [...parsed.warnings],
		};
		if (
			requested.groupRealmRoles &&
			parsed.include.groupRealmRoles === false
		) {
			result.warnings.push(
				"groupRealmRoles пропущены: в бекапе секция была выключена",
			);
		}
		if (requested.userGroups && parsed.include.userGroups === false) {
			result.warnings.push(
				"userGroups пропущены: в бекапе секция была выключена",
			);
		}
		if (requested.userRealmRoles && parsed.include.userRealmRoles === false) {
			result.warnings.push(
				"userRealmRoles пропущены: в бекапе секция была выключена",
			);
		}

		let byName = await this.loadRolesByName(keycloakUrl, realm, token);

		if (include.realmRoles && parsed.realmRoles.length) {
			for (const role of parsed.realmRoles) {
				if (byName[role.name]) continue;
				result.rolesCreated.push(role.name);
				if (!apply) continue;
				try {
					await this.api(keycloakUrl, realm, token, "POST", "/roles", {
						name: role.name,
						description: role.description || role.name,
					});
				} catch (e) {
					const msg = String(e);
					if (!msg.includes("409")) throw e;
				}
			}
			byName = await this.loadRolesByName(keycloakUrl, realm, token);
		}

		let byPath = await this.loadGroupsByPath(
			keycloakUrl,
			realm,
			token,
			parsed.groups.map((g) => g.path),
		);

		if (include.groups && parsed.groups.length) {
			const pathsToEnsure = [
				...new Set(
					parsed.groups
						.map((g) => g.path)
						.filter(Boolean)
						.sort(
							(a, b) =>
								a.split("/").length - b.split("/").length ||
								a.localeCompare(b),
						),
				),
			];

			for (const path of pathsToEnsure) {
				if (byPath[path]) continue;
				result.groupsCreated.push(path);
				if (!apply) continue;
				await this.ensureGroupPath(keycloakUrl, realm, token, path, byPath);
				byPath = await this.loadGroupsByPath(
					keycloakUrl,
					realm,
					token,
					pathsToEnsure,
				);
			}

			if (include.groupAttributes) {
				for (const gBackup of parsed.groups) {
					if (!gBackup.attributes || !Object.keys(gBackup.attributes).length) {
						continue;
					}
					const g = byPath[gBackup.path];
					if (!g?.id) continue;
					if (!apply) continue;
					await this.api(keycloakUrl, realm, token, "PUT", `/groups/${g.id}`, {
						id: g.id,
						name: g.name,
						path: g.path,
						attributes: gBackup.attributes,
					});
				}
			}

			if (include.groupRealmRoles) {
				for (const gBackup of parsed.groups) {
					const g = byPath[gBackup.path];
					if (!g?.id) {
						result.groupRoleChanges.push({
							path: gBackup.path,
							add: gBackup.anketaRealmRoles,
							remove: [],
							status: "missing_group",
						});
						continue;
					}
					const current =
						(await this.api<KcRole[]>(
							keycloakUrl,
							realm,
							token,
							"GET",
							`/groups/${g.id}/role-mappings/realm`,
						)) || [];
					const have = current
						.map((r) => r.name)
						.filter((n) => n.startsWith("anketa_"))
						.sort();
					const want = [...gBackup.anketaRealmRoles].sort();
					const add = want.filter((n) => !have.includes(n));
					const remove = have.filter((n) => !want.includes(n));
					if (!add.length && !remove.length) {
						result.groupRoleChanges.push({
							path: gBackup.path,
							add: [],
							remove: [],
							status: "ok",
						});
						continue;
					}
					if (!apply) {
						result.groupRoleChanges.push({
							path: gBackup.path,
							add,
							remove,
							status: "would_update",
						});
						continue;
					}
					if (add.length) {
						await this.api(
							keycloakUrl,
							realm,
							token,
							"POST",
							`/groups/${g.id}/role-mappings/realm`,
							add.map((name) => {
								const role = byName[name];
								if (!role) {
									throw new ServiceUnavailableException(
										`Role missing: ${name}`,
									);
								}
								return { id: role.id, name: role.name };
							}),
						);
					}
					if (remove.length) {
						await this.api(
							keycloakUrl,
							realm,
							token,
							"DELETE",
							`/groups/${g.id}/role-mappings/realm`,
							remove.map((name) => {
								const role = byName[name];
								if (!role) {
									throw new ServiceUnavailableException(
										`Role missing: ${name}`,
									);
								}
								return { id: role.id, name: role.name };
							}),
						);
					}
					result.groupRoleChanges.push({
						path: gBackup.path,
						add,
						remove,
						status: "updated",
					});
				}
			}
		}

		if (
			include.users &&
			parsed.users.length &&
			(include.userGroups || include.userRealmRoles)
		) {
			const usersByUsername = await this.loadUsersByUsername(
				keycloakUrl,
				realm,
				token,
			);
			byPath = await this.loadGroupsByPath(
				keycloakUrl,
				realm,
				token,
				parsed.users.flatMap((u) => u.groups),
			);

			for (const uBackup of parsed.users) {
				const username = uBackup.username;
				if (!username) {
					result.warnings.push("Пропущен пользователь без username в бекапе");
					continue;
				}
				const live = usersByUsername.get(username.toLowerCase());
				if (!live?.id) {
					if (include.userGroups) {
						result.userGroupChanges.push({
							username,
							join: uBackup.groups,
							leave: [],
							status: "missing_user",
						});
					}
					if (include.userRealmRoles) {
						result.userRoleChanges.push({
							username,
							add: uBackup.anketaDirectRoles,
							remove: [],
							status: "missing_user",
						});
					}
					continue;
				}

				if (include.userGroups) {
					const currentGroups = await this.listUserGroups(
						keycloakUrl,
						realm,
						token,
						live.id,
					);
					const have = currentGroups.map((g) => g.path).sort();
					const want = [...uBackup.groups].sort();
					const join = want.filter((p) => !have.includes(p));
					const leave = have.filter((p) => !want.includes(p));
					if (!join.length && !leave.length) {
						result.userGroupChanges.push({
							username,
							join: [],
							leave: [],
							status: "ok",
						});
					} else if (!apply) {
						result.userGroupChanges.push({
							username,
							join,
							leave,
							status: "would_update",
						});
					} else {
						for (const path of join) {
							const g = byPath[path];
							if (!g?.id) {
								result.warnings.push(
									`${username}: нет группы ${path} для join`,
								);
								continue;
							}
							await this.api(
								keycloakUrl,
								realm,
								token,
								"PUT",
								`/users/${live.id}/groups/${g.id}`,
							);
						}
						for (const path of leave) {
							const g =
								currentGroups.find((x) => x.path === path) || byPath[path];
							if (!g?.id) continue;
							await this.api(
								keycloakUrl,
								realm,
								token,
								"DELETE",
								`/users/${live.id}/groups/${g.id}`,
							);
						}
						result.userGroupChanges.push({
							username,
							join,
							leave,
							status: "updated",
						});
					}
				}

				if (include.userRealmRoles) {
					const current =
						(await this.api<KcRole[]>(
							keycloakUrl,
							realm,
							token,
							"GET",
							`/users/${live.id}/role-mappings/realm`,
						)) || [];
					const have = current
						.map((r) => r.name)
						.filter((n) => n.startsWith("anketa_"))
						.sort();
					const want = [...uBackup.anketaDirectRoles].sort();
					const add = want.filter((n) => !have.includes(n));
					const remove = have.filter((n) => !want.includes(n));
					if (!add.length && !remove.length) {
						result.userRoleChanges.push({
							username,
							add: [],
							remove: [],
							status: "ok",
						});
					} else if (!apply) {
						result.userRoleChanges.push({
							username,
							add,
							remove,
							status: "would_update",
						});
					} else {
						if (add.length) {
							await this.api(
								keycloakUrl,
								realm,
								token,
								"POST",
								`/users/${live.id}/role-mappings/realm`,
								add.map((name) => {
									const role = byName[name];
									if (!role) {
										throw new ServiceUnavailableException(
											`Role missing: ${name}`,
										);
									}
									return { id: role.id, name: role.name };
								}),
							);
						}
						if (remove.length) {
							await this.api(
								keycloakUrl,
								realm,
								token,
								"DELETE",
								`/users/${live.id}/role-mappings/realm`,
								remove.map((name) => {
									const role = byName[name];
									if (!role) {
										throw new ServiceUnavailableException(
											`Role missing: ${name}`,
										);
									}
									return { id: role.id, name: role.name };
								}),
							);
						}
						result.userRoleChanges.push({
							username,
							add,
							remove,
							status: "updated",
						});
					}
				}
			}
		}

		this.logger.log(
			`Keycloak restore: realm=${realm} dryRun=${options.dryRun} groupRoleΔ=${result.groupRoleChanges.filter((c) => c.add.length || c.remove.length).length} userGroupΔ=${result.userGroupChanges.filter((c) => c.join.length || c.leave.length).length}`,
		);
		return result;
	}

	private parseBackupPayload(raw: unknown): {
		exportedAt: string | null;
		keycloakUrl: string | null;
		realm: string | null;
		include: Partial<V2KeycloakBackupInclude>;
		realmRoles: Array<{ name: string; description?: string | null }>;
		groups: Array<{
			path: string;
			name: string;
			attributes: Record<string, string[]> | null;
			anketaRealmRoles: string[];
		}>;
		users: Array<{
			username: string | null;
			groups: string[];
			anketaDirectRoles: string[];
		}>;
		warnings: string[];
	} {
		if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
			throw new BadRequestException(
				"backup: ожидается JSON-объект из «Создать бекап»",
			);
		}
		const obj = raw as Record<string, unknown>;
		const warnings: string[] = [];
		if (
			obj.purpose != null &&
			obj.purpose !== "pre-f05-sync-backup"
		) {
			warnings.push(
				`Нестандартный purpose=${String(obj.purpose)} — продолжаем`,
			);
		}

		const includeRaw =
			obj.include && typeof obj.include === "object" && !Array.isArray(obj.include)
				? (obj.include as Partial<V2KeycloakBackupInclude>)
				: {};

		const realmRoles: Array<{ name: string; description?: string | null }> = [];
		if (Array.isArray(obj.realmRoles)) {
			for (const r of obj.realmRoles) {
				if (!r || typeof r !== "object") continue;
				const name = String((r as { name?: unknown }).name || "").trim();
				if (!name) continue;
				realmRoles.push({
					name,
					description:
						typeof (r as { description?: unknown }).description === "string"
							? ((r as { description: string }).description as string)
							: null,
				});
			}
		}

		const groups: Array<{
			path: string;
			name: string;
			attributes: Record<string, string[]> | null;
			anketaRealmRoles: string[];
		}> = [];
		if (Array.isArray(obj.groups)) {
			for (const g of obj.groups) {
				if (!g || typeof g !== "object") continue;
				const path = String((g as { path?: unknown }).path || "").trim();
				if (!path.startsWith("/")) continue;
				const name =
					String((g as { name?: unknown }).name || "").trim() ||
					path.split("/").filter(Boolean).pop() ||
					path;
				const anketaFromField = Array.isArray(
					(g as { anketaRealmRoles?: unknown }).anketaRealmRoles,
				)
					? ((g as { anketaRealmRoles: unknown[] }).anketaRealmRoles as unknown[])
							.map((n) => String(n))
							.filter((n) => n.startsWith("anketa_"))
					: null;
				const fromRealmRoles = Array.isArray(
					(g as { realmRoles?: unknown }).realmRoles,
				)
					? ((g as { realmRoles: unknown[] }).realmRoles as unknown[])
							.map((n) => String(n))
							.filter((n) => n.startsWith("anketa_"))
					: [];
				const attrsRaw = (g as { attributes?: unknown }).attributes;
				let attributes: Record<string, string[]> | null = null;
				if (attrsRaw && typeof attrsRaw === "object" && !Array.isArray(attrsRaw)) {
					attributes = {};
					for (const [k, v] of Object.entries(
						attrsRaw as Record<string, unknown>,
					)) {
						if (Array.isArray(v)) {
							attributes[k] = v.map((x) => String(x));
						}
					}
				}
				groups.push({
					path,
					name,
					attributes,
					anketaRealmRoles: [...new Set(anketaFromField ?? fromRealmRoles)].sort(),
				});
			}
		}

		const users: Array<{
			username: string | null;
			groups: string[];
			anketaDirectRoles: string[];
		}> = [];
		if (Array.isArray(obj.users)) {
			for (const u of obj.users) {
				if (!u || typeof u !== "object") continue;
				const usernameRaw = (u as { username?: unknown }).username;
				const username =
					typeof usernameRaw === "string" && usernameRaw.trim()
						? usernameRaw.trim()
						: null;
				const groupsList = Array.isArray((u as { groups?: unknown }).groups)
					? ((u as { groups: unknown[] }).groups as unknown[])
							.map((p) => String(p))
							.filter((p) => p.startsWith("/"))
					: [];
				const direct = Array.isArray(
					(u as { realmRolesDirect?: unknown }).realmRolesDirect,
				)
					? ((u as { realmRolesDirect: unknown[] }).realmRolesDirect as unknown[])
							.map((n) => String(n))
							.filter((n) => n.startsWith("anketa_"))
					: [];
				users.push({
					username,
					groups: [...new Set(groupsList)].sort(),
					anketaDirectRoles: [...new Set(direct)].sort(),
				});
			}
		}

		if (!realmRoles.length && !groups.length && !users.length) {
			throw new BadRequestException(
				"В backup нет секций realmRoles / groups / users — нечего восстанавливать",
			);
		}

		return {
			exportedAt:
				typeof obj.exportedAt === "string" ? obj.exportedAt : null,
			keycloakUrl:
				typeof obj.keycloakUrl === "string" ? obj.keycloakUrl : null,
			realm: typeof obj.realm === "string" ? obj.realm : null,
			include: includeRaw,
			realmRoles,
			groups,
			users,
			warnings,
		};
	}

	private async loadRolesByName(
		keycloakUrl: string,
		realm: string,
		token: string,
	): Promise<Record<string, KcRole>> {
		const roles =
			(await this.api<KcRole[]>(
				keycloakUrl,
				realm,
				token,
				"GET",
				"/roles?max=1000",
			)) || [];
		return Object.fromEntries(roles.map((r) => [r.name, r]));
	}

	private async ensureGroupPath(
		keycloakUrl: string,
		realm: string,
		token: string,
		path: string,
		byPath: Record<string, KcGroup>,
	): Promise<void> {
		const parts = path.split("/").filter(Boolean);
		let currentPath = "";
		for (let i = 0; i < parts.length; i++) {
			currentPath += `/${parts[i]}`;
			if (byPath[currentPath]) continue;
			const name = parts[i];
			try {
				if (i === 0) {
					await this.api(keycloakUrl, realm, token, "POST", "/groups", {
						name,
					});
				} else {
					const parentPath = `/${parts.slice(0, i).join("/")}`;
					const parent = byPath[parentPath];
					if (!parent?.id) {
						throw new ServiceUnavailableException(
							`Нельзя создать ${currentPath}: нет родителя ${parentPath}`,
						);
					}
					await this.api(
						keycloakUrl,
						realm,
						token,
						"POST",
						`/groups/${parent.id}/children`,
						{ name },
					);
				}
			} catch (e) {
				const msg = String(e);
				if (!msg.includes("409")) throw e;
			}
			const refreshed = await this.loadGroupsByPath(
				keycloakUrl,
				realm,
				token,
				[currentPath],
			);
			Object.assign(byPath, refreshed);
		}
	}

	private async loadUsersByUsername(
		keycloakUrl: string,
		realm: string,
		token: string,
	): Promise<Map<string, KcUser & { username?: string }>> {
		const map = new Map<string, KcUser & { username?: string }>();
		for (let first = 0; ; first += 100) {
			const batch =
				(await this.api<Array<KcUser & { username?: string }>>(
					keycloakUrl,
					realm,
					token,
					"GET",
					`/users?first=${first}&max=100&briefRepresentation=true`,
				)) || [];
			if (!batch.length) break;
			for (const u of batch) {
				if (u.username) map.set(u.username.toLowerCase(), u);
			}
			if (batch.length < 100) break;
		}
		return map;
	}

	/** POST /users + reset-password (password = username). Возвращает id. */
	private async createUserWithPassword(
		keycloakUrl: string,
		realm: string,
		token: string,
		username: string,
	): Promise<string> {
		const url = `${keycloakUrl}/admin/realms/${realm}/users`;
		const res = await this.safeFetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				username,
				enabled: true,
				emailVerified: true,
				firstName: username,
				lastName: "test",
			}),
		});
		if (!res.ok && res.status !== 201) {
			const text = await res.text();
			throw new ServiceUnavailableException(
				`Keycloak POST /users → ${res.status}: ${text.slice(0, 400)}`,
			);
		}

		let userId = "";
		const location = res.headers.get("Location") || res.headers.get("location");
		if (location) {
			userId = location.split("/").filter(Boolean).pop() || "";
		}
		if (!userId) {
			const found =
				(await this.api<Array<KcUser & { username?: string }>>(
					keycloakUrl,
					realm,
					token,
					"GET",
					`/users?username=${encodeURIComponent(username)}&exact=true&max=1`,
				)) || [];
			userId = found[0]?.id || "";
		}
		if (!userId) {
			throw new ServiceUnavailableException(
				`Keycloak: пользователь ${username} создан, но id не найден`,
			);
		}

		await this.api(
			keycloakUrl,
			realm,
			token,
			"PUT",
			`/users/${userId}/reset-password`,
			{
				type: "password",
				value: username,
				temporary: false,
			},
		);
		return userId;
	}

	/**
	 * Создать тестовых `test_*` по матрице.
	 * Существующих пропускает; для новых password = username.
	 */
	async provisionTestUsers(options: {
		adminUsername: string;
		adminPassword: string;
		dryRun: boolean;
		keycloakUrl?: string;
		realm?: string;
		adminRealm?: string;
		standPrefix?: string;
	}): Promise<V2KeycloakTestUsersResult> {
		const { keycloakUrl, realm, adminRealm } = this.resolveConnection(options);
		const standPrefix = options.standPrefix?.trim() ?? "";
		const users = resolveV2KeycloakTestUsers(standPrefix);

		const token = await this.fetchAdminToken({
			keycloakUrl,
			adminRealm,
			username: options.adminUsername,
			password: options.adminPassword,
		});

		const apply = !options.dryRun;
		const result: V2KeycloakTestUsersResult = {
			dryRun: options.dryRun,
			keycloakUrl,
			realm,
			standPrefix,
			users: [],
			groupsEnsured: [],
			warnings: [],
		};

		const neededGroups = [...new Set(users.flatMap((u) => u.groups))];
		const byPath = await this.loadGroupsByPath(
			keycloakUrl,
			realm,
			token,
			neededGroups,
		);

		if (apply) {
			for (const path of neededGroups.sort(
				(a, b) =>
					a.split("/").length - b.split("/").length || a.localeCompare(b),
			)) {
				const before = Boolean(byPath[path]?.id);
				await this.ensureGroupPath(keycloakUrl, realm, token, path, byPath);
				if (!before && byPath[path]?.id) {
					result.groupsEnsured.push(path);
				}
			}
		} else {
			for (const path of neededGroups) {
				if (!byPath[path]?.id) {
					result.groupsEnsured.push(path);
				}
			}
		}

		const usersByUsername = await this.loadUsersByUsername(
			keycloakUrl,
			realm,
			token,
		);

		for (const def of users) {
			const existing = usersByUsername.get(def.username.toLowerCase());
			if (existing?.id) {
				result.users.push({
					username: def.username,
					label: def.label,
					groups: def.groups,
					status: "skipped_exists",
				});
				continue;
			}

			if (!apply) {
				result.users.push({
					username: def.username,
					label: def.label,
					groups: def.groups,
					status: "would_create",
				});
				continue;
			}

			try {
				const userId = await this.createUserWithPassword(
					keycloakUrl,
					realm,
					token,
					def.username,
				);
				usersByUsername.set(def.username.toLowerCase(), {
					id: userId,
					username: def.username,
				});
				for (const path of def.groups) {
					const g = byPath[path];
					if (!g?.id) {
						result.warnings.push(
							`${def.username}: нет группы ${path} для join`,
						);
						continue;
					}
					await this.api(
						keycloakUrl,
						realm,
						token,
						"PUT",
						`/users/${userId}/groups/${g.id}`,
					);
				}
				result.users.push({
					username: def.username,
					label: def.label,
					groups: def.groups,
					status: "created",
				});
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				result.warnings.push(`${def.username}: ${message}`);
				result.users.push({
					username: def.username,
					label: def.label,
					groups: def.groups,
					status: "error",
					error: message.slice(0, 300),
				});
			}
		}

		this.logger.log(
			`Keycloak test-users dryRun=${options.dryRun} standPrefix=${standPrefix} created=${result.users.filter((u) => u.status === "created").length} skipped=${result.users.filter((u) => u.status === "skipped_exists").length}`,
		);
		return result;
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
		/** Delegated-каноны вроде `/appadmin` не создаём — роли на AD `/admin_it/{stand}sum_appadmin`. */
		const groupsToEnsure = [
			...new Set([
				...V2_KEYCLOAK_GROUPS_TO_ENSURE,
				...Object.keys(target),
			]),
		]
			.filter((path) => shouldEnsureV2KeycloakGroupPath(path))
			.sort(
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

	normalizeStandPrefix(raw?: string | null): string {
		const t = (raw ?? "").trim().toLowerCase().replace(/_+$/, "");
		if (!t) return "";
		return `${t}_`;
	}

	async getEtalonOverlay(): Promise<V2KeycloakEtalonOverlay | null> {
		const raw = await this.runtimeSettings.getKeycloakEtalonOverlay();
		if (!raw || typeof raw !== "object") return null;
		return this.parseEtalonOverlay(raw);
	}

	async setEtalonOverlay(
		overlay: V2KeycloakEtalonOverlay | null,
		updatedBy?: string | null,
	): Promise<V2KeycloakEtalonOverlay | null> {
		if (overlay == null) {
			await this.runtimeSettings.setKeycloakEtalonOverlay(null, updatedBy);
			return null;
		}
		const parsed = this.parseEtalonOverlay(overlay);
		await this.runtimeSettings.setKeycloakEtalonOverlay(
			parsed as Record<string, unknown>,
			updatedBy,
		);
		return parsed;
	}

	resolveEtalon(standPrefixRaw?: string | null): {
		standPrefix: string;
		source: "code" | "code+overlay";
		groupRoleTarget: Record<string, string[]>;
		testUsers: Array<{ username: string; label: string; groups: string[] }>;
	} {
		const standPrefix = this.normalizeStandPrefix(standPrefixRaw);
		const baseTarget = expandV2KeycloakTargetsWithAdAliases(
			V2_KEYCLOAK_GROUP_ROLE_TARGET,
			standPrefix,
		);
		const baseUsers = resolveV2KeycloakTestUsers(standPrefix).map((u) => ({
			username: u.username,
			label: u.label,
			groups: [...u.groups],
		}));

		return {
			standPrefix,
			source: "code",
			groupRoleTarget: Object.fromEntries(
				Object.entries(baseTarget).map(([path, roles]) => [
					path,
					[...roles].sort(),
				]),
			),
			testUsers: baseUsers,
		};
	}

	async resolveEtalonWithOverlay(standPrefixRaw?: string | null): Promise<{
		standPrefix: string;
		source: "code" | "code+overlay";
		groupRoleTarget: Record<string, string[]>;
		testUsers: Array<{ username: string; label: string; groups: string[] }>;
	}> {
		const base = this.resolveEtalon(standPrefixRaw);
		const overlay = await this.getEtalonOverlay();
		if (!overlay) return base;

		const groupRoleTarget = { ...base.groupRoleTarget };
		if (overlay.groupRoleTarget) {
			for (const [path, roles] of Object.entries(overlay.groupRoleTarget)) {
				groupRoleTarget[path] = [...new Set(roles.map(String))].sort();
			}
		}

		const byUser = new Map(
			base.testUsers.map((u) => [u.username.toLowerCase(), { ...u }]),
		);
		if (overlay.testUsers?.length) {
			for (const u of overlay.testUsers) {
				const key = u.username.toLowerCase();
				byUser.set(key, {
					username: u.username,
					label: u.label || byUser.get(key)?.label || u.username,
					groups: [...new Set(u.groups.map(String))].sort(),
				});
			}
		}

		return {
			standPrefix: base.standPrefix,
			source: "code+overlay",
			groupRoleTarget,
			testUsers: [...byUser.values()].sort((a, b) =>
				a.username.localeCompare(b.username),
			),
		};
	}

	async inspectMatrix(options: {
		adminUsername: string;
		adminPassword: string;
		keycloakUrl?: string;
		realm?: string;
		adminRealm?: string;
		standPrefix?: string;
		/** Если true — только группы/юзеры из эталона (+ их members). */
		etalonScopeOnly?: boolean;
	}): Promise<V2KeycloakMatrixInspectDto> {
		const etalon = await this.resolveEtalonWithOverlay(options.standPrefix);
		const { keycloakUrl, realm, adminRealm } = this.resolveConnection(options);
		const token = await this.fetchAdminToken({
			keycloakUrl,
			adminRealm,
			username: options.adminUsername,
			password: options.adminPassword,
		});

		const roles =
			(await this.api<KcRole[]>(
				keycloakUrl,
				realm,
				token,
				"GET",
				"/roles?max=500",
			)) || [];
		const anketaRoles = roles
			.map((r) => r.name)
			.filter((n) => n.startsWith("anketa_"))
			.sort();

		const etalonPaths = new Set(Object.keys(etalon.groupRoleTarget));
		for (const u of etalon.testUsers) {
			for (const g of u.groups) etalonPaths.add(g);
		}

		const byPath = await this.loadGroupsByPath(keycloakUrl, realm, token);
		const groupEntries = Object.values(byPath)
			.filter((g) =>
				options.etalonScopeOnly === false
					? true
					: etalonPaths.has(g.path) ||
						[...etalonPaths].some(
							(p) =>
								resolveV2KeycloakGroupPath(p, [g.path]) === g.path,
						),
			)
			.sort((a, b) => a.path.localeCompare(b.path));

		const groups: V2KeycloakMatrixInspectDto["groups"] = [];
		const memberUsernames = new Set<string>();
		for (const g of groupEntries) {
			const mapped =
				(await this.api<KcRole[]>(
					keycloakUrl,
					realm,
					token,
					"GET",
					`/groups/${g.id}/role-mappings/realm`,
				)) || [];
			const anketa = mapped
				.map((r) => r.name)
				.filter((n) => n.startsWith("anketa_"))
				.sort();
			const members = await this.listMembers(
				keycloakUrl,
				realm,
				token,
				g.id,
			);
			const usernames = members
				.map((m) => m.username)
				.filter((u): u is string => Boolean(u))
				.sort();
			for (const u of usernames) memberUsernames.add(u);
			groups.push({
				path: g.path,
				anketaRoles: anketa,
				memberUsernames: usernames,
			});
		}

		const usernamesToLoad = new Set<string>([
			...etalon.testUsers.map((u) => u.username),
			...memberUsernames,
		]);

		const usersByName = await this.loadUsersByUsername(
			keycloakUrl,
			realm,
			token,
		);
		const users: V2KeycloakMatrixInspectDto["users"] = [];
		for (const username of [...usernamesToLoad].sort()) {
			const live = usersByName.get(username.toLowerCase());
			if (!live?.id) {
				users.push({ username, groups: [] });
				continue;
			}
			const userGroups = await this.listUserGroups(
				keycloakUrl,
				realm,
				token,
				live.id,
			);
			users.push({
				username: live.username || username,
				groups: userGroups.map((g) => g.path).sort(),
			});
		}

		return {
			exportedAt: new Date().toISOString(),
			keycloakUrl,
			realm,
			standPrefix: etalon.standPrefix,
			anketaRoles,
			groups,
			users,
		};
	}

	async diffMatrix(options: {
		adminUsername: string;
		adminPassword: string;
		keycloakUrl?: string;
		realm?: string;
		adminRealm?: string;
		standPrefix?: string;
		inspect?: V2KeycloakMatrixInspectDto | null;
	}): Promise<V2KeycloakMatrixDiffDto> {
		const etalon = await this.resolveEtalonWithOverlay(options.standPrefix);
		const inspect =
			options.inspect ??
			(await this.inspectMatrix({
				...options,
				etalonScopeOnly: true,
			}));

		/**
		 * Map live KK roles by path. Alias by leaf only when etalon path missing —
		 * never overwrite `/architect/dev_sum_arch_*` with empty top-level
		 * `/dev_sum_arch_*` duplicates (same leaf).
		 */
		const actualGroupRoles = new Map<string, Set<string>>();
		for (const g of inspect.groups) {
			actualGroupRoles.set(g.path, new Set(g.anketaRoles));
		}
		const liveGroupPaths = inspect.groups.map((g) => g.path);
		for (const etalonPath of Object.keys(etalon.groupRoleTarget)) {
			if (actualGroupRoles.has(etalonPath)) continue;
			const resolved = resolveV2KeycloakGroupPath(
				etalonPath,
				liveGroupPaths,
			);
			if (!resolved) continue;
			const roles = actualGroupRoles.get(resolved);
			if (roles) actualGroupRoles.set(etalonPath, new Set(roles));
		}

		const groupRoleDiffs: V2KeycloakMatrixDiffDto["groupRoleDiffs"] = [];
		for (const [path, expectedRoles] of Object.entries(
			etalon.groupRoleTarget,
		)) {
			const resolved =
				resolveV2KeycloakGroupPath(path, liveGroupPaths) ?? path;
			const actual =
				actualGroupRoles.get(path) ??
				actualGroupRoles.get(resolved) ??
				new Set<string>();
			const want = new Set(expectedRoles);
			const allRoles = new Set([...want, ...actual]);
			for (const role of [...allRoles].sort()) {
				const expected = want.has(role);
				const have = actual.has(role);
				const status: "ok" | "missing" | "extra" =
					expected && have
						? "ok"
						: expected && !have
							? "missing"
							: !expected && have
								? "extra"
								: "ok";
				if (status === "ok" && !expected) continue;
				groupRoleDiffs.push({
					path,
					role,
					status,
					expected,
					actual: have,
				});
			}
		}

		const actualUserGroups = new Map<string, Set<string>>();
		for (const u of inspect.users) {
			actualUserGroups.set(u.username.toLowerCase(), new Set(u.groups));
		}

		const userGroupDiffs: V2KeycloakMatrixDiffDto["userGroupDiffs"] = [];
		for (const u of etalon.testUsers) {
			const have = actualUserGroups.get(u.username.toLowerCase()) ?? new Set();
			const want = new Set(
				u.groups.filter((g) => !isV2KeycloakIgnoredOrgGroupPath(g)),
			);
			const haveRelevant = [...have].filter(
				(g) => !isV2KeycloakIgnoredOrgGroupPath(g),
			);
			const all = new Set([...want, ...haveRelevant]);
			for (const group of [...all].sort()) {
				if (isV2KeycloakIgnoredOrgGroupPath(group)) continue;
				const expected = want.has(group);
				const actual = haveRelevant.some(
					(p) =>
						p === group ||
						resolveV2KeycloakGroupPath(group, [p]) === p,
				);
				let status: "ok" | "missing" | "extra" | "warn";
				let hint: string | undefined;
				if (expected && actual) {
					status = "ok";
				} else if (expected && !actual) {
					const parent = v2KeycloakGroupParentPath(group);
					if (parent && have.has(parent)) {
						status = "warn";
						hint = `предположительно не там: в parent ${parent}, эталон ждёт AD-leaf ${group}`;
					} else {
						status = "missing";
					}
				} else if (!expected && actual) {
					const childLeaf = [...want].find((w) => {
						const parent = v2KeycloakGroupParentPath(w);
						if (parent !== group) return false;
						return !haveRelevant.some(
							(p) =>
								p === w || resolveV2KeycloakGroupPath(w, [p]) === p,
						);
					});
					if (childLeaf) {
						status = "warn";
						hint = `предположительно не там: в parent ${group}, эталон ждёт AD-leaf ${childLeaf}`;
					} else {
						const aliasedWant = [...want].find((w) => {
							if (w === group) return false;
							return resolveV2KeycloakGroupPath(w, [group]) === group;
						});
						if (aliasedWant) {
							status = "warn";
							hint = `предположительно не там: nested ${group}, эталон top-level ${aliasedWant}`;
						} else {
							status = "extra";
						}
					}
				} else {
					status = "ok";
				}
				if (status === "ok" && !expected) continue;
				userGroupDiffs.push({
					username: u.username,
					group,
					status,
					expected,
					actual,
					...(hint ? { hint } : {}),
				});
			}
		}

		return {
			standPrefix: etalon.standPrefix,
			etalonSource: etalon.source,
			groupRoleDiffs,
			userGroupDiffs,
			summary: {
				groupRoleMissing: groupRoleDiffs.filter((d) => d.status === "missing")
					.length,
				groupRoleExtra: groupRoleDiffs.filter((d) => d.status === "extra")
					.length,
				userGroupMissing: userGroupDiffs.filter((d) => d.status === "missing")
					.length,
				userGroupExtra: userGroupDiffs.filter((d) => d.status === "extra")
					.length,
				userGroupWarn: userGroupDiffs.filter((d) => d.status === "warn")
					.length,
			},
			etalon: {
				groupRoleTarget: etalon.groupRoleTarget,
				testUsers: etalon.testUsers,
			},
		};
	}

	async applyMatrixPatch(options: {
		adminUsername: string;
		adminPassword: string;
		keycloakUrl?: string;
		realm?: string;
		adminRealm?: string;
		standPrefix?: string;
		dryRun?: boolean;
		groupRoleChanges?: Array<{
			path: string;
			add: string[];
			remove: string[];
		}>;
		userGroupChanges?: Array<{
			username: string;
			addGroups: string[];
			removeGroups: string[];
		}>;
	}): Promise<V2KeycloakMatrixApplyResult> {
		const dryRun = options.dryRun !== false;
		const apply = !dryRun;
		const { keycloakUrl, realm, adminRealm } = this.resolveConnection(options);
		const token = await this.fetchAdminToken({
			keycloakUrl,
			adminRealm,
			username: options.adminUsername,
			password: options.adminPassword,
		});

		const groupRoleChangesIn = options.groupRoleChanges ?? [];
		const userGroupChangesIn = options.userGroupChanges ?? [];
		const warnings: string[] = [];
		const groupRoleChanges: V2KeycloakRoleSyncResult["groupRoleChanges"] = [];
		const userGroupChanges: V2KeycloakRestoreResult["userGroupChanges"] = [];

		const roles =
			(await this.api<KcRole[]>(
				keycloakUrl,
				realm,
				token,
				"GET",
				"/roles?max=500",
			)) || [];
		const byName: Record<string, KcRole> = Object.fromEntries(
			roles.map((r) => [r.name, r]),
		);

		for (const name of V2_KEYCLOAK_ROLES_TO_ENSURE) {
			if (byName[name]) continue;
			if (!apply) continue;
			try {
				await this.api(keycloakUrl, realm, token, "POST", "/roles", {
					name,
					description: V2_KEYCLOAK_ROLE_DESCRIPTIONS[name] || name,
				});
				const created = await this.api<KcRole>(
					keycloakUrl,
					realm,
					token,
					"GET",
					`/roles/${encodeURIComponent(name)}`,
				);
				if (created) byName[name] = created;
			} catch (e) {
				const msg = String(e);
				if (!msg.includes("409")) throw e;
			}
		}

		const pathsNeeded = [
			...groupRoleChangesIn.map((c) => c.path),
			...userGroupChangesIn.flatMap((c) => [
				...c.addGroups,
				...c.removeGroups,
			]),
		];
		let byPath = await this.loadGroupsByPath(
			keycloakUrl,
			realm,
			token,
			pathsNeeded,
		);

		for (const change of groupRoleChangesIn) {
			const add = (change.add ?? []).filter((n) => n.startsWith("anketa_"));
			const remove = (change.remove ?? []).filter((n) =>
				n.startsWith("anketa_"),
			);
			const resolved =
				resolveV2KeycloakGroupPath(change.path, Object.keys(byPath)) ??
				change.path;
			const g = byPath[resolved];
			if (!g) {
				groupRoleChanges.push({
					path: change.path,
					add,
					remove,
					status: "missing_group",
				});
				continue;
			}
			if (!add.length && !remove.length) {
				groupRoleChanges.push({
					path: change.path,
					add: [],
					remove: [],
					status: "ok",
				});
				continue;
			}
			if (!apply) {
				groupRoleChanges.push({
					path: change.path,
					add,
					remove,
					status: "would_update",
				});
				continue;
			}
			if (add.length) {
				await this.api(
					keycloakUrl,
					realm,
					token,
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
					keycloakUrl,
					realm,
					token,
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
				path: change.path,
				add,
				remove,
				status: "updated",
			});
		}

		if (userGroupChangesIn.length) {
			const usersByUsername = await this.loadUsersByUsername(
				keycloakUrl,
				realm,
				token,
			);
			byPath = await this.loadGroupsByPath(
				keycloakUrl,
				realm,
				token,
				userGroupChangesIn.flatMap((c) => [
					...c.addGroups,
					...c.removeGroups,
				]),
			);

			for (const change of userGroupChangesIn) {
				const username = change.username;
				const live = usersByUsername.get(username.toLowerCase());
				const join = [...(change.addGroups ?? [])];
				const leave = [...(change.removeGroups ?? [])];
				if (!live?.id) {
					userGroupChanges.push({
						username,
						join,
						leave,
						status: "missing_user",
					});
					continue;
				}
				if (!join.length && !leave.length) {
					userGroupChanges.push({
						username,
						join: [],
						leave: [],
						status: "ok",
					});
					continue;
				}
				if (!apply) {
					userGroupChanges.push({
						username,
						join,
						leave,
						status: "would_update",
					});
					continue;
				}
				for (const path of join) {
					const resolved =
						resolveV2KeycloakGroupPath(path, Object.keys(byPath)) ?? path;
					const g = byPath[resolved];
					if (!g?.id) {
						warnings.push(`${username}: нет группы ${path} для join`);
						continue;
					}
					await this.api(
						keycloakUrl,
						realm,
						token,
						"PUT",
						`/users/${live.id}/groups/${g.id}`,
					);
				}
				const currentGroups = await this.listUserGroups(
					keycloakUrl,
					realm,
					token,
					live.id,
				);
				for (const path of leave) {
					const g =
						currentGroups.find(
							(x) =>
								x.path === path ||
								resolveV2KeycloakGroupPath(path, [x.path]) === x.path,
						) ||
						byPath[
							resolveV2KeycloakGroupPath(path, Object.keys(byPath)) ?? path
						];
					if (!g?.id) continue;
					await this.api(
						keycloakUrl,
						realm,
						token,
						"DELETE",
						`/users/${live.id}/groups/${g.id}`,
					);
				}
				userGroupChanges.push({
					username,
					join,
					leave,
					status: "updated",
				});
			}
		}

		this.logger.log(
			`Keycloak matrix apply: realm=${realm} dryRun=${dryRun} groupRoleΔ=${groupRoleChanges.filter((c) => c.add.length || c.remove.length).length} userGroupΔ=${userGroupChanges.filter((c) => c.join.length || c.leave.length).length}`,
		);

		return {
			dryRun,
			keycloakUrl,
			realm,
			groupRoleChanges,
			userGroupChanges,
			warnings,
		};
	}

	private parseEtalonOverlay(raw: unknown): V2KeycloakEtalonOverlay {
		if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
			throw new BadRequestException("etalon overlay must be an object");
		}
		const rec = raw as Record<string, unknown>;
		const out: V2KeycloakEtalonOverlay = {};
		if (rec.groupRoleTarget != null) {
			if (
				typeof rec.groupRoleTarget !== "object" ||
				Array.isArray(rec.groupRoleTarget)
			) {
				throw new BadRequestException("groupRoleTarget must be an object");
			}
			const target: Record<string, string[]> = {};
			for (const [path, roles] of Object.entries(
				rec.groupRoleTarget as Record<string, unknown>,
			)) {
				if (!Array.isArray(roles)) {
					throw new BadRequestException(
						`groupRoleTarget[${path}] must be string[]`,
					);
				}
				target[path] = roles
					.map(String)
					.filter((n) => n.startsWith("anketa_"))
					.sort();
			}
			out.groupRoleTarget = target;
		}
		if (rec.testUsers != null) {
			if (!Array.isArray(rec.testUsers)) {
				throw new BadRequestException("testUsers must be an array");
			}
			out.testUsers = rec.testUsers.map((item, index) => {
				if (!item || typeof item !== "object") {
					throw new BadRequestException(`testUsers[${index}] invalid`);
				}
				const u = item as Record<string, unknown>;
				if (typeof u.username !== "string" || !u.username.trim()) {
					throw new BadRequestException(
						`testUsers[${index}].username required`,
					);
				}
				if (!Array.isArray(u.groups)) {
					throw new BadRequestException(
						`testUsers[${index}].groups must be string[]`,
					);
				}
				return {
					username: u.username.trim(),
					label:
						typeof u.label === "string" && u.label.trim()
							? u.label.trim()
							: u.username.trim(),
					groups: u.groups.map(String),
				};
			});
		}
		return out;
	}
}

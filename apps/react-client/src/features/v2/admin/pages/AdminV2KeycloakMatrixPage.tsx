import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { styled, useColorScheme } from "@mui/material/styles";
import { useQuery } from "@tanstack/react-query";
import type {
	ColDef,
	ICellRendererParams,
	IHeaderParams,
	ValueGetterParams,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { apiClient } from "@react-client/common/api/helpers/apiClient";
import { Card } from "@react-client/common/muiCustom/Card";
import { Header } from "@react-client/common/navigation/organisms/Header";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { AG_GRID_LOCALE_RU } from "@react-client/common/tableStuff/agGridLocale.ru";
import { registerAgGridTableModules } from "@react-client/common/tableStuff/agGridTableModules";
import { toast } from "@react-client/common/toasts";
import { inferAdStandPrefixFromUrl } from "@react-client/features/v2/admin/utils/inferAdStandPrefix";
import { commonRoutes } from "@react-client/routing/common/routes";
import { isV2KeycloakIgnoredOrgGroupPath } from "@smart-anketa/api-contract";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "@react-client/theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "@react-client/theme/ag-grid/agGridIconSet";

registerAgGridTableModules();

/** Колонки редактора эталона (совпадают с V2_KEYCLOAK_ROLES_TO_ENSURE). */
const ANKETA_ETALON_ROLES = [
	"anketa_view_all_calculations",
	"anketa_create_calculation",
	"anketa_edit_calculation",
	"anketa_delete_calculation",
	"anketa_export_reports",
	"anketa_workflow_approve",
	"anketa_complete_anketa",
	"anketa_hold",
	"anketa_audit_view",
] as const;

type SyncDefaults = {
	keycloakUrl: string;
	realm: string;
	adminRealm: string;
};

type InspectDto = {
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
	users: Array<{ username: string; groups: string[] }>;
};

type DiffStatus = "ok" | "missing" | "extra" | "warn";

type ResolvedEtalon = {
	standPrefix: string;
	source: "code" | "code+overlay";
	groupRoleTarget: Record<string, string[]>;
	testUsers: Array<{ username: string; label: string; groups: string[] }>;
};

function cloneEtalon(e: ResolvedEtalon): ResolvedEtalon {
	return {
		standPrefix: e.standPrefix,
		source: e.source,
		groupRoleTarget: Object.fromEntries(
			Object.entries(e.groupRoleTarget).map(([p, roles]) => [p, [...roles]]),
		),
		testUsers: e.testUsers.map((u) => ({
			username: u.username,
			label: u.label,
			groups: [...u.groups],
		})),
	};
}

function etalonSnapshot(e: ResolvedEtalon): string {
	const groupRoleTarget = Object.fromEntries(
		Object.entries(e.groupRoleTarget)
			.map(([p, roles]) => [p, [...roles].sort()] as const)
			.sort(([a], [b]) => a.localeCompare(b)),
	);
	const testUsers = [...e.testUsers]
		.map((u) => ({
			username: u.username,
			label: u.label,
			groups: [...u.groups].sort(),
		}))
		.sort((a, b) => a.username.localeCompare(b.username));
	return JSON.stringify({ groupRoleTarget, testUsers });
}

type EtalonGroupEditRow = {
	path: string;
	roleSet: Set<string>;
	roleCount: number;
};

type EtalonUserEditRow = {
	username: string;
	label: string;
	groupsText: string;
	groupCount: number;
};

type DiffDto = {
	standPrefix: string;
	etalonSource: "code" | "code+overlay";
	groupRoleDiffs: Array<{
		path: string;
		role: string;
		status: DiffStatus;
		expected: boolean;
		actual: boolean;
	}>;
	userGroupDiffs: Array<{
		username: string;
		group: string;
		status: DiffStatus;
		expected: boolean;
		actual: boolean;
		hint?: string;
	}>;
	summary: {
		groupRoleMissing: number;
		groupRoleExtra: number;
		userGroupMissing: number;
		userGroupExtra: number;
		userGroupWarn?: number;
	};
	etalon: {
		groupRoleTarget: Record<string, string[]>;
		testUsers: Array<{ username: string; label: string; groups: string[] }>;
	};
};

type GroupRoleChange = { path: string; add: string[]; remove: string[] };
type UserGroupChange = {
	username: string;
	addGroups: string[];
	removeGroups: string[];
};

type StagedPatch = {
	groupRoleChanges: GroupRoleChange[];
	userGroupChanges: UserGroupChange[];
};

type MatrixCell = {
	checked: boolean;
	status: DiffStatus | undefined;
	expected: boolean;
	actual: boolean;
	staged: boolean;
	rowKey: string;
	colKey: string;
	kind: "groupRole" | "userGroup";
	hint?: string;
};

type GroupRoleRow = {
	path: string;
	inFeature: boolean;
	cells: Record<string, MatrixCell>;
};
type UserGroupRow = {
	username: string;
	inFeature: boolean;
	cells: Record<string, MatrixCell>;
};

const emptyPatch = (): StagedPatch => ({
	groupRoleChanges: [],
	userGroupChanges: [],
});

/** Участники фичи Smart Anketa (F-05) сверху; остальные — внизу. */
function sortFeatureFirst(items: string[], feature: Set<string>): string[] {
	return [...items].sort((a, b) => {
		const af = feature.has(a) ? 0 : 1;
		const bf = feature.has(b) ? 0 : 1;
		if (af !== bf) return af - bf;
		return a.localeCompare(b);
	});
}

function connectionPayload(args: { keycloakUrl: string; realm: string }) {
	return {
		keycloakUrl: args.keycloakUrl.trim() || undefined,
		realm: args.realm.trim() || undefined,
	};
}

function statusLabel(status: DiffStatus | undefined): string {
	if (status === "missing") return "не хватает в Keycloak";
	if (status === "extra") return "лишнее в Keycloak (нет в эталоне)";
	if (status === "warn")
		return "предупреждение: предположительно не там лежит";
	if (status === "ok") return "совпадает с эталоном";
	return "вне эталона / не сверено";
}

function cellTitle(cell: MatrixCell): string {
	const subject =
		cell.kind === "groupRole"
			? `Группа ${cell.rowKey}\nРоль ${cell.colKey}`
			: `Пользователь ${cell.rowKey}\nГруппа ${cell.colKey}`;
	const lines = [
		subject,
		"",
		`Эталон: ${cell.expected ? "да" : "нет"}`,
		`Keycloak: ${cell.actual ? "да" : "нет"}`,
		`Статус: ${statusLabel(cell.status)}`,
	];
	if (cell.hint) lines.push(cell.hint);
	if (cell.staged) {
		lines.push(
			`В staged: будет ${cell.checked ? "добавлено" : "убрано"} при заливке`,
		);
	} else if (cell.status === "warn") {
		lines.push("Не добавляется в «Исправить все» — проверьте вручную");
	} else if (cell.status === "missing") {
		lines.push("Клик по чекбоксу → добавить в staged (включить)");
	} else if (cell.status === "extra") {
		lines.push("Клик по чекбоксу → добавить в staged (выключить)");
	} else {
		lines.push("Клик по чекбоксу → изменить и положить в staged");
	}
	return lines.join("\n");
}

function cellBackground(cell: MatrixCell | undefined): string | undefined {
	if (!cell) return undefined;
	if (cell.staged) return "rgba(25, 118, 210, 0.18)";
	if (cell.status === "missing") return "rgba(211, 47, 47, 0.22)";
	if (cell.status === "extra") return "rgba(237, 108, 2, 0.22)";
	if (cell.status === "warn") return "rgba(251, 192, 45, 0.28)";
	return undefined;
}

const GridWrap = styled(Box)`
	width: 100%;
	height: 72vh;
	min-height: 560px;
	flex-shrink: 0;
	& .ag-root-wrapper {
		height: 100%;
	}
	& .kk-matrix-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}
	& .kk-matrix-header {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
			monospace;
		font-size: 11px;
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		padding: 0 4px;
	}
	& .kk-matrix-dim {
		opacity: 0.38;
	}
	& .kk-matrix-dim .ag-cell,
	& .ag-header-cell.kk-matrix-dim {
		opacity: 0.38;
	}
`;

const ModalGridWrap = styled(GridWrap)`
	height: 52vh;
	min-height: 320px;
`;

function MatrixCheckboxCell(
	params: ICellRendererParams<GroupRoleRow | UserGroupRow, MatrixCell> & {
		onToggle: (rowKey: string, colKey: string) => void;
		dragUser?: string | null;
		onDropUser?: (username: string, group: string) => void;
	},
) {
	const cell = params.value;
	if (!cell) return null;
	return (
		<div
			className="kk-matrix-cell"
			title={cellTitle(cell)}
			onDragOver={(e) => {
				if (params.dragUser) e.preventDefault();
			}}
			onDrop={(e) => {
				e.preventDefault();
				if (!params.dragUser || !params.onDropUser) return;
				if (cell.kind !== "userGroup") return;
				if (params.dragUser !== cell.rowKey) return;
				if (!cell.checked) params.onDropUser(cell.rowKey, cell.colKey);
			}}
		>
			<Checkbox
				size="small"
				checked={cell.checked}
				onChange={() => params.onToggle(cell.rowKey, cell.colKey)}
				inputProps={{ "aria-label": cellTitle(cell) }}
			/>
		</div>
	);
}

function DroppableGroupHeader(
	params: IHeaderParams & {
		dragUser: string | null;
		onDropUser: (username: string, group: string) => void;
	},
) {
	const group = params.column.getColId();
	return (
		<div
			className="kk-matrix-header"
			title={
				params.dragUser
					? `Отпустите, чтобы добавить ${params.dragUser} → ${group}`
					: group
			}
			onDragOver={(e) => {
				if (params.dragUser) e.preventDefault();
			}}
			onDrop={(e) => {
				e.preventDefault();
				if (!params.dragUser) return;
				params.onDropUser(params.dragUser, group);
			}}
		>
			{params.displayName}
		</div>
	);
}

export function AdminV2KeycloakMatrixPage() {
	const { mode } = useColorScheme();
	const groupGridRef = useRef<AgGridReact<GroupRoleRow>>(null);
	const userGridRef = useRef<AgGridReact<UserGroupRow>>(null);

	const defaultsQuery = useQuery({
		queryKey: ["v2-keycloak-role-sync-defaults"],
		queryFn: () =>
			apiClient<SyncDefaults>({
				url: "/v2/admin/keycloak-role-sync/defaults",
				method: "GET",
			}),
		staleTime: 60_000,
	});

	const [tab, setTab] = useState(0);
	const [credsOpen, setCredsOpen] = useState(true);
	const [keycloakUrl, setKeycloakUrl] = useState("");
	const [realm, setRealm] = useState("cym");
	const [standPrefix, setStandPrefix] = useState<string>(() =>
		inferAdStandPrefixFromUrl(),
	);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [onlyDiffs, setOnlyDiffs] = useState(true);
	const [etalonScopeOnly, setEtalonScopeOnly] = useState(true);
	/** Блёклые + внизу: path/user/role вне F-05 фичи (пустой target, no-access). */
	const [dimNonFeature, setDimNonFeature] = useState(true);
	const [busy, setBusy] = useState(false);
	const [inspect, setInspect] = useState<InspectDto | null>(null);
	const [diff, setDiff] = useState<DiffDto | null>(null);
	const [staged, setStaged] = useState<StagedPatch>(emptyPatch);
	const [applyOpen, setApplyOpen] = useState(false);
	const [applyPreview, setApplyPreview] = useState("");
	const [etalonOpen, setEtalonOpen] = useState(false);
	const [etalonJson, setEtalonJson] = useState("{}");
	/** В модалке эталона: таблица по умолчанию; JSON — опционально. */
	const [etalonShowJson, setEtalonShowJson] = useState(false);
	const [dragUser, setDragUser] = useState<string | null>(null);
	const [userSearch, setUserSearch] = useState("");
	const [etalonHideAdAlias, setEtalonHideAdAlias] = useState(true);
	const [etalonViewPane, setEtalonViewPane] = useState<"groups" | "users">(
		"groups",
	);
	const [etalonDraft, setEtalonDraft] = useState<ResolvedEtalon | null>(null);
	const [etalonBaselineSnap, setEtalonBaselineSnap] = useState<string>("");
	const [newEtalonPath, setNewEtalonPath] = useState("");
	const [newEtalonUser, setNewEtalonUser] = useState("");

	const etalonQuery = useQuery({
		queryKey: ["v2-keycloak-etalon-resolve", standPrefix],
		queryFn: () =>
			apiClient<ResolvedEtalon>({
				url: "/v2/admin/keycloak-role-sync/etalon/resolve",
				method: "POST",
				data: { standPrefix: standPrefix.trim() || undefined },
			}),
		staleTime: 30_000,
	});

	const etalonDirty = Boolean(
		etalonDraft &&
			etalonBaselineSnap &&
			etalonSnapshot(etalonDraft) !== etalonBaselineSnap,
	);

	const reloadEtalonDraft = useCallback((src: ResolvedEtalon) => {
		const cloned = cloneEtalon(src);
		setEtalonDraft(cloned);
		setEtalonBaselineSnap(etalonSnapshot(cloned));
	}, []);

	useEffect(() => {
		if (!etalonQuery.data) return;
		if (etalonDirty) return;
		reloadEtalonDraft(etalonQuery.data);
	}, [etalonQuery.data, etalonDirty, reloadEtalonDraft]);

	useEffect(() => {
		const d = defaultsQuery.data;
		if (!d) return;
		setKeycloakUrl((prev) => {
			const next = prev || d.keycloakUrl || "";
			setStandPrefix(inferAdStandPrefixFromUrl(next || undefined));
			return next;
		});
		setRealm((prev) => (prev === "cym" && d.realm ? d.realm : prev));
	}, [defaultsQuery.data]);

	const creds = useMemo(
		() => ({
			adminUsername: username.trim(),
			adminPassword: password,
			...connectionPayload({ keycloakUrl, realm }),
			standPrefix: standPrefix.trim() || undefined,
		}),
		[username, password, keycloakUrl, realm, standPrefix],
	);

	const canCall = Boolean(creds.adminUsername && creds.adminPassword);

	const loadInspectAndDiff = useCallback(async () => {
		if (!canCall) {
			toast.error("Укажите admin username и password Keycloak");
			return;
		}
		setBusy(true);
		try {
			const snap = await apiClient<InspectDto>({
				url: "/v2/admin/keycloak-role-sync/inspect",
				method: "POST",
				data: { ...creds, etalonScopeOnly },
			});
			setInspect(snap);
			const d = await apiClient<DiffDto>({
				url: "/v2/admin/keycloak-role-sync/matrix/diff",
				method: "POST",
				data: { ...creds, inspect: snap },
			});
			setDiff(d);
			setCredsOpen(false);
			toast.success(
				`Загружено: групп ${snap.groups.length}, юзеров ${snap.users.length}`,
			);
		} catch (err) {
			toast.error("Не удалось загрузить матрицу", {
				description: apiErrorMessage(err),
			});
		} finally {
			setBusy(false);
		}
	}, [canCall, creds, etalonScopeOnly]);

	const groupRoleDiffMap = useMemo(() => {
		const map = new Map<
			string,
			{ status: DiffStatus; expected: boolean; actual: boolean }
		>();
		for (const d of diff?.groupRoleDiffs ?? []) {
			map.set(`${d.path}::${d.role}`, {
				status: d.status,
				expected: d.expected,
				actual: d.actual,
			});
		}
		return map;
	}, [diff]);

	const userGroupDiffMap = useMemo(() => {
		const map = new Map<
			string,
			{
				status: DiffStatus;
				expected: boolean;
				actual: boolean;
				hint?: string;
			}
		>();
		for (const d of diff?.userGroupDiffs ?? []) {
			map.set(`${d.username}::${d.group}`, {
				status: d.status,
				expected: d.expected,
				actual: d.actual,
				hint: d.hint,
			});
		}
		return map;
	}, [diff]);

	/** Path с ненулевым набором anketa_* в эталоне = участвует в фиче. */
	const featureGroupPaths = useMemo(() => {
		const set = new Set<string>();
		for (const [path, roles] of Object.entries(
			diff?.etalon.groupRoleTarget ?? {},
		)) {
			if (roles.length > 0) set.add(path);
		}
		return set;
	}, [diff]);

	const featureRoles = useMemo(() => {
		const set = new Set<string>();
		for (const roles of Object.values(diff?.etalon.groupRoleTarget ?? {})) {
			for (const r of roles) set.add(r);
		}
		return set;
	}, [diff]);

	const featureUsernames = useMemo(() => {
		const set = new Set<string>();
		for (const u of diff?.etalon.testUsers ?? []) {
			if (u.groups.some((g) => featureGroupPaths.has(g))) {
				set.add(u.username);
			}
		}
		return set;
	}, [diff, featureGroupPaths]);

	const etalonRoles = useMemo(() => {
		const set = new Set<string>();
		for (const roles of Object.values(diff?.etalon.groupRoleTarget ?? {})) {
			for (const r of roles) set.add(r);
		}
		for (const r of inspect?.anketaRoles ?? []) set.add(r);
		const all = [...set];
		return dimNonFeature ? sortFeatureFirst(all, featureRoles) : all.sort();
	}, [diff, inspect, dimNonFeature, featureRoles]);

	const etalonGroupPaths = useMemo(() => {
		const paths = new Set<string>(
			Object.keys(diff?.etalon.groupRoleTarget ?? {}),
		);
		for (const u of diff?.etalon.testUsers ?? []) {
			for (const g of u.groups) paths.add(g);
		}
		/** Колонки для warn/extra parent и nested lead, даже если path не в эталоне. */
		for (const d of diff?.userGroupDiffs ?? []) {
			if (
				d.status === "warn" ||
				d.status === "extra" ||
				d.status === "missing"
			) {
				paths.add(d.group);
			}
		}
		if (!etalonScopeOnly) {
			for (const g of inspect?.groups ?? []) paths.add(g.path);
		}
		const all = [...paths].filter((p) => !isV2KeycloakIgnoredOrgGroupPath(p));
		return dimNonFeature
			? sortFeatureFirst(all, featureGroupPaths)
			: all.sort();
	}, [diff, inspect, etalonScopeOnly, dimNonFeature, featureGroupPaths]);

	const etalonUsernames = useMemo(() => {
		const set = new Set<string>(
			(diff?.etalon.testUsers ?? []).map((u) => u.username),
		);
		for (const u of inspect?.users ?? []) set.add(u.username);
		const all = [...set];
		return dimNonFeature ? sortFeatureFirst(all, featureUsernames) : all.sort();
	}, [diff, inspect, dimNonFeature, featureUsernames]);

	const userLabels = useMemo(() => {
		const map = new Map<string, string>();
		for (const u of diff?.etalon.testUsers ?? []) {
			map.set(u.username, u.label);
		}
		return map;
	}, [diff]);

	const actualGroupRoles = useMemo(() => {
		const map = new Map<string, Set<string>>();
		for (const g of inspect?.groups ?? []) {
			map.set(g.path, new Set(g.anketaRoles));
		}
		return map;
	}, [inspect]);

	const actualUserGroups = useMemo(() => {
		const map = new Map<string, Set<string>>();
		for (const u of inspect?.users ?? []) {
			map.set(u.username, new Set(u.groups));
		}
		return map;
	}, [inspect]);

	const stagedGroupHas = useCallback(
		(path: string, role: string): boolean | null => {
			const change = staged.groupRoleChanges.find((c) => c.path === path);
			if (!change) return null;
			if (change.add.includes(role)) return true;
			if (change.remove.includes(role)) return false;
			return null;
		},
		[staged],
	);

	const stagedUserHas = useCallback(
		(uname: string, group: string): boolean | null => {
			const change = staged.userGroupChanges.find((c) => c.username === uname);
			if (!change) return null;
			if (change.addGroups.includes(group)) return true;
			if (change.removeGroups.includes(group)) return false;
			return null;
		},
		[staged],
	);

	const toggleGroupRole = useCallback(
		(path: string, role: string) => {
			setStaged((prev) => {
				const actual = actualGroupRoles.get(path)?.has(role) ?? false;
				const change = prev.groupRoleChanges.find((c) => c.path === path);
				let stagedVal: boolean | null = null;
				if (change?.add.includes(role)) stagedVal = true;
				else if (change?.remove.includes(role)) stagedVal = false;
				const current = stagedVal ?? actual;
				const nextWant = !current;

				const others = prev.groupRoleChanges.filter((c) => c.path !== path);
				const existing = change ?? {
					path,
					add: [] as string[],
					remove: [] as string[],
				};
				let add = existing.add.filter((r) => r !== role);
				let remove = existing.remove.filter((r) => r !== role);
				if (nextWant !== actual) {
					if (nextWant) add = [...add, role];
					else remove = [...remove, role];
				}
				return {
					...prev,
					groupRoleChanges:
						add.length || remove.length
							? [...others, { path, add, remove }]
							: others,
				};
			});
		},
		[actualGroupRoles],
	);

	const toggleUserGroup = useCallback(
		(uname: string, group: string) => {
			setStaged((prev) => {
				const actual = actualUserGroups.get(uname)?.has(group) ?? false;
				const change = prev.userGroupChanges.find((c) => c.username === uname);
				let stagedVal: boolean | null = null;
				if (change?.addGroups.includes(group)) stagedVal = true;
				else if (change?.removeGroups.includes(group)) stagedVal = false;
				const current = stagedVal ?? actual;
				const nextWant = !current;

				const others = prev.userGroupChanges.filter(
					(c) => c.username !== uname,
				);
				const existing = change ?? {
					username: uname,
					addGroups: [] as string[],
					removeGroups: [] as string[],
				};
				let addGroups = existing.addGroups.filter((g) => g !== group);
				let removeGroups = existing.removeGroups.filter((g) => g !== group);
				if (nextWant !== actual) {
					if (nextWant) addGroups = [...addGroups, group];
					else removeGroups = [...removeGroups, group];
				}
				return {
					...prev,
					userGroupChanges:
						addGroups.length || removeGroups.length
							? [...others, { username: uname, addGroups, removeGroups }]
							: others,
				};
			});
		},
		[actualUserGroups],
	);

	const ensureUserInGroup = useCallback(
		(uname: string, group: string) => {
			const actual = actualUserGroups.get(uname)?.has(group) ?? false;
			const stagedVal = stagedUserHas(uname, group);
			const current = stagedVal ?? actual;
			if (!current) toggleUserGroup(uname, group);
			setDragUser(null);
		},
		[actualUserGroups, stagedUserHas, toggleUserGroup],
	);

	const fixAllDiffs = () => {
		if (!diff) return;
		const groupMap = new Map<string, GroupRoleChange>();
		for (const d of diff.groupRoleDiffs) {
			if (d.status === "ok") continue;
			const cur = groupMap.get(d.path) ?? {
				path: d.path,
				add: [],
				remove: [],
			};
			if (d.status === "missing") cur.add.push(d.role);
			if (d.status === "extra") cur.remove.push(d.role);
			groupMap.set(d.path, cur);
		}
		const userMap = new Map<string, UserGroupChange>();
		for (const d of diff.userGroupDiffs) {
			if (d.status === "ok") continue;
			const cur = userMap.get(d.username) ?? {
				username: d.username,
				addGroups: [],
				removeGroups: [],
			};
			if (d.status === "missing") cur.addGroups.push(d.group);
			if (d.status === "extra") cur.removeGroups.push(d.group);
			userMap.set(d.username, cur);
		}
		setStaged({
			groupRoleChanges: [...groupMap.values()],
			userGroupChanges: [...userMap.values()],
		});
		setTab(2);
		toast.success("Расхождения добавлены в очередь заливки");
	};

	const openApply = async (dryRun: boolean) => {
		if (!canCall) {
			toast.error("Укажите креды Keycloak");
			return;
		}
		if (!staged.groupRoleChanges.length && !staged.userGroupChanges.length) {
			toast.error(
				"Очередь заливки пуста — сначала отметьте ячейки или «Исправить всё»",
			);
			return;
		}
		setBusy(true);
		try {
			type ApplyResult = {
				dryRun: boolean;
				groupRoleChanges: Array<{
					path: string;
					add: string[];
					remove: string[];
					status: string;
				}>;
				userGroupChanges: Array<{
					username: string;
					join: string[];
					leave: string[];
					status: string;
				}>;
				warnings: string[];
			};
			const result = await apiClient<ApplyResult>({
				url: "/v2/admin/keycloak-role-sync/matrix/apply",
				method: "POST",
				data: {
					...creds,
					dryRun,
					groupRoleChanges: staged.groupRoleChanges,
					userGroupChanges: staged.userGroupChanges,
				},
			});
			const lines = [
				`dryRun=${result.dryRun}`,
				...result.groupRoleChanges.map(
					(c) =>
						`[группа] ${c.status} ${c.path}\n  + ${c.add.join(", ") || "—"}\n  − ${c.remove.join(", ") || "—"}`,
				),
				...result.userGroupChanges.map(
					(c) =>
						`[user] ${c.status} ${c.username}\n  join ${c.join.join(", ") || "—"}\n  leave ${c.leave.join(", ") || "—"}`,
				),
				...(result.warnings ?? []).map((w) => `warn: ${w}`),
			];
			setApplyPreview(lines.join("\n\n"));
			if (dryRun) {
				setApplyOpen(true);
			} else {
				toast.success("Изменения применены в Keycloak");
				setStaged(emptyPatch());
				setApplyOpen(false);
				setPassword("");
				await loadInspectAndDiff();
			}
		} catch (err) {
			toast.error("Ошибка apply", { description: apiErrorMessage(err) });
		} finally {
			setBusy(false);
		}
	};

	const openEtalonEditor = async () => {
		setBusy(true);
		try {
			const refreshed = await etalonQuery.refetch();
			if (refreshed.data) reloadEtalonDraft(refreshed.data);
			const data = await apiClient<{
				overlay: Record<string, unknown> | null;
				resolved: unknown;
			}>({
				url: "/v2/admin/keycloak-role-sync/etalon",
				method: "GET",
			});
			setEtalonJson(
				JSON.stringify(
					data.overlay ?? {
						groupRoleTarget: {},
						testUsers: [],
					},
					null,
					2,
				),
			);
			setEtalonShowJson(false);
			setEtalonViewPane("groups");
			setEtalonOpen(true);
		} catch (err) {
			toast.error("Не удалось загрузить эталон", {
				description: apiErrorMessage(err),
			});
		} finally {
			setBusy(false);
		}
	};

	const saveEtalonOverlayPayload = async (payload: {
		groupRoleTarget: Record<string, string[]>;
		testUsers: Array<{ username: string; label?: string; groups: string[] }>;
	}) => {
		setBusy(true);
		try {
			await apiClient({
				url: "/v2/admin/keycloak-role-sync/etalon",
				method: "PUT",
				data: payload,
			});
			toast.success("Overlay эталона сохранён");
			setEtalonOpen(false);
			const refreshed = await etalonQuery.refetch();
			if (refreshed.data) reloadEtalonDraft(refreshed.data);
			if (inspect) await loadInspectAndDiff();
		} catch (err) {
			toast.error("Не удалось сохранить эталон", {
				description: apiErrorMessage(err),
			});
		} finally {
			setBusy(false);
		}
	};

	const saveEtalonFromJson = async () => {
		try {
			const parsed = JSON.parse(etalonJson) as {
				groupRoleTarget?: Record<string, string[]>;
				testUsers?: Array<{
					username: string;
					label?: string;
					groups: string[];
				}>;
			};
			await saveEtalonOverlayPayload({
				groupRoleTarget: parsed.groupRoleTarget ?? {},
				testUsers: parsed.testUsers ?? [],
			});
		} catch (err) {
			toast.error("Невалидный JSON", { description: apiErrorMessage(err) });
		}
	};

	const saveEtalonFromDraft = async () => {
		if (!etalonDraft) return;
		await saveEtalonOverlayPayload({
			groupRoleTarget: etalonDraft.groupRoleTarget,
			testUsers: etalonDraft.testUsers,
		});
	};

	const resetEtalon = async () => {
		setBusy(true);
		try {
			await apiClient({
				url: "/v2/admin/keycloak-role-sync/etalon",
				method: "DELETE",
			});
			toast.success("Overlay сброшен к code defaults");
			setEtalonOpen(false);
			const refreshed = await etalonQuery.refetch();
			if (refreshed.data) reloadEtalonDraft(refreshed.data);
			if (inspect) await loadInspectAndDiff();
		} catch (err) {
			toast.error("Не удалось сбросить эталон", {
				description: apiErrorMessage(err),
			});
		} finally {
			setBusy(false);
		}
	};

	const discardEtalonDraft = () => {
		if (etalonQuery.data) reloadEtalonDraft(etalonQuery.data);
	};

	const exportEtalon = () => {
		const payload = etalonDraft
			? {
					groupRoleTarget: etalonDraft.groupRoleTarget,
					testUsers: etalonDraft.testUsers,
				}
			: JSON.parse(etalonJson);
		const blob = new Blob([JSON.stringify(payload, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "keycloak-etalon-overlay.json";
		a.click();
		URL.revokeObjectURL(url);
	};

	const exportMatrixReport = () => {
		if (!diff && !inspect) {
			toast.error("Нет данных — сначала «Загрузить из KK + сверить»");
			return;
		}

		const groupRoleDiffs = diff?.groupRoleDiffs ?? [];
		const userGroupDiffs = diff?.userGroupDiffs ?? [];
		const groupRoleMissing = groupRoleDiffs.filter(
			(d) => d.status === "missing",
		);
		const groupRoleExtra = groupRoleDiffs.filter((d) => d.status === "extra");
		const userGroupMissing = userGroupDiffs.filter(
			(d) => d.status === "missing",
		);
		const userGroupExtra = userGroupDiffs.filter((d) => d.status === "extra");
		const userGroupWarn = userGroupDiffs.filter((d) => d.status === "warn");

		const groupRolesByPath: Record<
			string,
			{ missing: string[]; extra: string[] }
		> = {};
		for (const d of groupRoleDiffs) {
			const bucket = (groupRolesByPath[d.path] ??= {
				missing: [],
				extra: [],
			});
			if (d.status === "missing") bucket.missing.push(d.role);
			else if (d.status === "extra") bucket.extra.push(d.role);
		}

		const userGroupsByUser: Record<
			string,
			{ missing: string[]; extra: string[]; warn: string[] }
		> = {};
		for (const d of userGroupDiffs) {
			const bucket = (userGroupsByUser[d.username] ??= {
				missing: [],
				extra: [],
				warn: [],
			});
			if (d.status === "missing") bucket.missing.push(d.group);
			else if (d.status === "extra") bucket.extra.push(d.group);
			else if (d.status === "warn") bucket.warn.push(d.group);
		}

		const inspectGroupsByPath = Object.fromEntries(
			(inspect?.groups ?? []).map((g) => [
				g.path,
				{ anketaRoles: g.anketaRoles, memberUsernames: g.memberUsernames },
			]),
		);
		const inspectUsersByName = Object.fromEntries(
			(inspect?.users ?? []).map((u) => [u.username, { groups: u.groups }]),
		);

		const payload = {
			kind: "keycloak-matrix-report",
			exportedAt: new Date().toISOString(),
			connection: {
				keycloakUrl: inspect?.keycloakUrl ?? keycloakUrl,
				realm: inspect?.realm ?? realm,
				standPrefix: inspect?.standPrefix ?? standPrefix,
				inspectExportedAt: inspect?.exportedAt ?? null,
			},
			uiFilters: {
				onlyDiffs,
				etalonScopeOnly,
				dimNonFeature,
			},
			etalonSource: diff?.etalonSource ?? null,
			summary: diff?.summary ?? null,
			mismatchTotal:
				(diff?.summary.groupRoleMissing ?? 0) +
				(diff?.summary.groupRoleExtra ?? 0) +
				(diff?.summary.userGroupMissing ?? 0) +
				(diff?.summary.userGroupExtra ?? 0),
			placementWarnTotal: diff?.summary.userGroupWarn ?? 0,
			note:
				"org groups (/access_during_freeze, /departament…) ignored; " +
				"parent-vs-leaf / nested-lead → status=warn (not in Исправить все)",
			mismatches: {
				groupRoles: {
					missing: groupRoleMissing,
					extra: groupRoleExtra,
					byPath: groupRolesByPath,
				},
				userGroups: {
					missing: userGroupMissing,
					extra: userGroupExtra,
					warn: userGroupWarn,
					byUsername: userGroupsByUser,
				},
			},
			etalon: diff?.etalon ?? null,
			inspect: inspect
				? {
						exportedAt: inspect.exportedAt,
						anketaRoles: inspect.anketaRoles,
						groupCount: inspect.groups.length,
						userCount: inspect.users.length,
						groupsByPath: inspectGroupsByPath,
						usersByName: inspectUsersByName,
					}
				: null,
			staged,
			stagedLines,
		};

		const blob = new Blob([JSON.stringify(payload, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
		const prefix = (inspect?.standPrefix || standPrefix || "noprefix").replace(
			/_$/,
			"",
		);
		a.download = `keycloak-matrix-report-${prefix}-${stamp}.json`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success("Отчёт матрицы скачан");
	};

	const importEtalon = () => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "application/json,.json";
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;
			try {
				const text = await file.text();
				const parsed = JSON.parse(text) as {
					groupRoleTarget?: Record<string, string[]>;
					testUsers?: Array<{
						username: string;
						label?: string;
						groups: string[];
					}>;
					standPrefix?: string;
					source?: "code" | "code+overlay";
				};
				if (etalonDraft) {
					setEtalonDraft({
						...etalonDraft,
						source: "code+overlay",
						groupRoleTarget: parsed.groupRoleTarget ?? {},
						testUsers: (parsed.testUsers ?? []).map((u) => ({
							username: u.username,
							label: u.label || u.username,
							groups: u.groups ?? [],
						})),
					});
					toast.success("JSON загружен в draft — нажмите «Сохранить overlay»");
				} else {
					setEtalonJson(text);
					setEtalonOpen(true);
					toast.success("JSON импортирован в редактор");
				}
			} catch (err) {
				toast.error("Не удалось прочитать файл", {
					description: apiErrorMessage(err),
				});
			}
		};
		input.click();
	};

	const toggleEtalonGroupRole = (path: string, role: string) => {
		setEtalonDraft((prev) => {
			if (!prev) return prev;
			const current = new Set(prev.groupRoleTarget[path] ?? []);
			if (current.has(role)) current.delete(role);
			else current.add(role);
			return {
				...prev,
				source: "code+overlay",
				groupRoleTarget: {
					...prev.groupRoleTarget,
					[path]: [...current].sort(),
				},
			};
		});
	};

	const addEtalonGroupPath = () => {
		const path = newEtalonPath.trim().startsWith("/")
			? newEtalonPath.trim()
			: `/${newEtalonPath.trim()}`;
		if (path.length < 2) return;
		setEtalonDraft((prev) => {
			if (!prev) return prev;
			if (prev.groupRoleTarget[path]) return prev;
			return {
				...prev,
				source: "code+overlay",
				groupRoleTarget: { ...prev.groupRoleTarget, [path]: [] },
			};
		});
		setNewEtalonPath("");
	};

	const removeEtalonGroupPath = (path: string) => {
		setEtalonDraft((prev) => {
			if (!prev) return prev;
			const next = { ...prev.groupRoleTarget };
			delete next[path];
			return { ...prev, source: "code+overlay", groupRoleTarget: next };
		});
	};

	const addEtalonUser = () => {
		const username = newEtalonUser.trim();
		if (!username) return;
		setEtalonDraft((prev) => {
			if (!prev) return prev;
			if (prev.testUsers.some((u) => u.username === username)) return prev;
			return {
				...prev,
				source: "code+overlay",
				testUsers: [
					...prev.testUsers,
					{ username, label: username, groups: [] },
				],
			};
		});
		setNewEtalonUser("");
	};

	const removeEtalonUser = (username: string) => {
		setEtalonDraft((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				source: "code+overlay",
				testUsers: prev.testUsers.filter((u) => u.username !== username),
			};
		});
	};

	const updateEtalonUser = (
		username: string,
		patch: Partial<{ label: string; groups: string[] }>,
	) => {
		setEtalonDraft((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				source: "code+overlay",
				testUsers: prev.testUsers.map((u) =>
					u.username === username ? { ...u, ...patch } : u,
				),
			};
		});
	};

	const stagedCount =
		staged.groupRoleChanges.reduce(
			(n, c) => n + c.add.length + c.remove.length,
			0,
		) +
		staged.userGroupChanges.reduce(
			(n, c) => n + c.addGroups.length + c.removeGroups.length,
			0,
		);

	const mismatchTotal = diff
		? diff.summary.groupRoleMissing +
			diff.summary.groupRoleExtra +
			diff.summary.userGroupMissing +
			diff.summary.userGroupExtra
		: 0;
	const placementWarnTotal = diff?.summary.userGroupWarn ?? 0;

	const groupRoleRowData = useMemo((): GroupRoleRow[] => {
		const rows = etalonGroupPaths.map((path) => {
			const cells: Record<string, MatrixCell> = {};
			for (const role of etalonRoles) {
				const meta = groupRoleDiffMap.get(`${path}::${role}`);
				const actual = actualGroupRoles.get(path)?.has(role) ?? false;
				const stagedVal = stagedGroupHas(path, role);
				const expected = meta?.expected ?? false;
				cells[role] = {
					checked: stagedVal ?? actual,
					status: meta?.status,
					expected,
					actual,
					staged: stagedVal != null,
					rowKey: path,
					colKey: role,
					kind: "groupRole",
				};
			}
			return {
				path,
				inFeature: featureGroupPaths.has(path),
				cells,
			};
		});
		if (!onlyDiffs) return rows;
		return rows.filter((row) =>
			Object.values(row.cells).some(
				(c) => c.status === "missing" || c.status === "extra" || c.staged,
			),
		);
	}, [
		etalonGroupPaths,
		etalonRoles,
		groupRoleDiffMap,
		actualGroupRoles,
		stagedGroupHas,
		onlyDiffs,
		featureGroupPaths,
	]);

	const userGroupRowData = useMemo((): UserGroupRow[] => {
		const q = userSearch.trim().toLowerCase();
		const names = etalonUsernames.filter((u) => {
			if (!q) return true;
			const label = userLabels.get(u) ?? "";
			return u.toLowerCase().includes(q) || label.toLowerCase().includes(q);
		});
		const rows = names.map((uname) => {
			const cells: Record<string, MatrixCell> = {};
			for (const group of etalonGroupPaths) {
				const meta = userGroupDiffMap.get(`${uname}::${group}`);
				const actual = actualUserGroups.get(uname)?.has(group) ?? false;
				const stagedVal = stagedUserHas(uname, group);
				cells[group] = {
					checked: stagedVal ?? actual,
					status: meta?.status,
					expected: meta?.expected ?? false,
					actual,
					staged: stagedVal != null,
					rowKey: uname,
					colKey: group,
					kind: "userGroup",
					hint: meta?.hint,
				};
			}
			return {
				username: uname,
				inFeature: featureUsernames.has(uname),
				cells,
			};
		});
		if (!onlyDiffs) return rows;
		return rows.filter((row) =>
			Object.values(row.cells).some(
				(c) =>
					c.status === "missing" ||
					c.status === "extra" ||
					c.status === "warn" ||
					c.staged,
			),
		);
	}, [
		etalonUsernames,
		etalonGroupPaths,
		userGroupDiffMap,
		actualUserGroups,
		stagedUserHas,
		onlyDiffs,
		userSearch,
		userLabels,
		featureUsernames,
	]);

	const groupRoleColDefs = useMemo((): ColDef<GroupRoleRow>[] => {
		const cols: ColDef<GroupRoleRow>[] = [
			{
				colId: "path",
				field: "path",
				headerName: "Группа Keycloak",
				headerTooltip: "Путь группы в Keycloak (/ds, /architect/dev_sum_arch_…)",
				pinned: "left",
				width: 280,
				filter: "agTextColumnFilter",
				cellStyle: { fontFamily: "monospace", fontSize: 12 },
				cellClass: (p) =>
					dimNonFeature && p.data && !p.data.inFeature
						? "kk-matrix-dim"
						: undefined,
			},
		];
		for (const role of etalonRoles) {
			const short = role.replace(/^anketa_/, "");
			const roleInFeature = featureRoles.has(role);
			cols.push({
				colId: role,
				headerName: short,
				headerTooltip: roleInFeature
					? role
					: `${role}\n(не в эталоне F-05 / вне фичи)`,
				headerClass:
					dimNonFeature && !roleInFeature ? "kk-matrix-dim" : undefined,
				width: 88,
				sortable: false,
				filter: false,
				valueGetter: (p: ValueGetterParams<GroupRoleRow>) =>
					p.data?.cells[role],
				cellRenderer: MatrixCheckboxCell,
				cellRendererParams: {
					onToggle: toggleGroupRole,
				},
				cellStyle: (p) => {
					const bg = cellBackground(p.value as MatrixCell | undefined);
					return {
						padding: "0",
						...(bg ? { backgroundColor: bg } : {}),
					};
				},
				cellClass: () =>
					dimNonFeature && !roleInFeature ? "kk-matrix-dim" : undefined,
			});
		}
		return cols;
	}, [etalonRoles, toggleGroupRole, dimNonFeature, featureRoles]);

	const userGroupColDefs = useMemo((): ColDef<UserGroupRow>[] => {
		const cols: ColDef<UserGroupRow>[] = [
			{
				colId: "username",
				field: "username",
				headerName: "Пользователь",
				pinned: "left",
				width: 200,
				filter: "agTextColumnFilter",
				valueGetter: (p) => p.data?.username,
				cellClass: (p) =>
					dimNonFeature && p.data && !p.data.inFeature
						? "kk-matrix-dim"
						: undefined,
				cellRenderer: (p: ICellRendererParams<UserGroupRow, string>) => {
					const uname = p.value ?? "";
					const label = userLabels.get(uname);
					const inFeature = p.data?.inFeature ?? false;
					return (
						<div
							draggable
							onDragStart={() => setDragUser(uname)}
							onDragEnd={() => setDragUser(null)}
							title={[
								uname,
								label,
								inFeature
									? "Участник фичи Smart Anketa (F-05)"
									: "Вне фичи: нет доступа / пустой target / не из эталона",
								"Перетащите на колонку группы, чтобы добавить",
							]
								.filter(Boolean)
								.join("\n")}
							style={{
								cursor: "grab",
								fontFamily: "monospace",
								fontSize: 12,
								lineHeight: 1.25,
								padding: "2px 0",
							}}
						>
							<div>{uname}</div>
							{label ? (
								<div style={{ color: "#666", fontSize: 11 }}>{label}</div>
							) : null}
						</div>
					);
				},
			},
		];
		for (const group of etalonGroupPaths) {
			const groupInFeature = featureGroupPaths.has(group);
			cols.push({
				colId: group,
				headerName: group,
				headerTooltip: groupInFeature
					? group
					: `${group}\n(вне фичи: пустой target / no-access)`,
				headerClass:
					dimNonFeature && !groupInFeature ? "kk-matrix-dim" : undefined,
				width: 140,
				sortable: false,
				filter: false,
				headerComponent: DroppableGroupHeader,
				headerComponentParams: {
					dragUser,
					onDropUser: ensureUserInGroup,
				},
				valueGetter: (p: ValueGetterParams<UserGroupRow>) =>
					p.data?.cells[group],
				cellRenderer: MatrixCheckboxCell,
				cellRendererParams: {
					onToggle: toggleUserGroup,
					dragUser,
					onDropUser: ensureUserInGroup,
				},
				cellStyle: (p) => {
					const bg = cellBackground(p.value as MatrixCell | undefined);
					return {
						padding: "0",
						...(bg ? { backgroundColor: bg } : {}),
					};
				},
				cellClass: () =>
					dimNonFeature && !groupInFeature ? "kk-matrix-dim" : undefined,
			});
		}
		return cols;
	}, [
		etalonGroupPaths,
		toggleUserGroup,
		ensureUserInGroup,
		dragUser,
		userLabels,
		dimNonFeature,
		featureGroupPaths,
	]);

	const matrixGetRowClass = useCallback(
		(p: { data?: { inFeature?: boolean } }) =>
			dimNonFeature && p.data && !p.data.inFeature
				? "kk-matrix-dim"
				: undefined,
		[dimNonFeature],
	);

	const defaultColDef = useMemo<ColDef>(
		() => ({
			resizable: true,
			suppressHeaderMenuButton: true,
		}),
		[],
	);

	const gridTheme =
		mode === "dark" ? agGridCustomMUIThemeDark : agGridCustomMUITheme;

	const stagedLines = useMemo(() => {
		const lines: string[] = [];
		for (const c of staged.groupRoleChanges) {
			for (const r of c.add) lines.push(`+ роль ${r} → группа ${c.path}`);
			for (const r of c.remove) lines.push(`− роль ${r} ← группа ${c.path}`);
		}
		for (const c of staged.userGroupChanges) {
			for (const g of c.addGroups) lines.push(`+ ${c.username} → группа ${g}`);
			for (const g of c.removeGroups)
				lines.push(`− ${c.username} ← группа ${g}`);
		}
		return lines;
	}, [staged]);

		const problemItems = useMemo(() => {
		if (!diff) return [] as Array<{
			id: string;
			severity: "error" | "warning";
			kind: string;
			text: string;
		}>;
		const items: Array<{
			id: string;
			severity: "error" | "warning";
			kind: string;
			text: string;
		}> = [];
		for (const d of diff.groupRoleDiffs) {
			if (d.status === "missing") {
				items.push({
					id: `gr-miss-${d.path}-${d.role}`,
					severity: "error",
					kind: "роль",
					text: `нет в KK: ${d.role} на ${d.path}`,
				});
			} else if (d.status === "extra") {
				items.push({
					id: `gr-extra-${d.path}-${d.role}`,
					severity: "error",
					kind: "роль",
					text: `лишнее в KK: ${d.role} на ${d.path}`,
				});
			}
		}
		for (const d of diff.userGroupDiffs) {
			if (d.status === "missing") {
				items.push({
					id: `ug-miss-${d.username}-${d.group}`,
					severity: "error",
					kind: "membership",
					text: `нет в KK: ${d.username} → ${d.group}`,
				});
			} else if (d.status === "extra") {
				items.push({
					id: `ug-extra-${d.username}-${d.group}`,
					severity: "error",
					kind: "membership",
					text: `лишнее в KK: ${d.username} в ${d.group}`,
				});
			} else if (d.status === "warn") {
				items.push({
					id: `ug-warn-${d.username}-${d.group}`,
					severity: "warning",
					kind: "размещение",
					text:
						d.hint ??
						`предположительно не там: ${d.username} / ${d.group}`,
				});
			}
		}
		return items;
	}, [diff]);

	const viewedEtalon: ResolvedEtalon | null =
		etalonDraft ?? etalonQuery.data ?? null;

	const etalonEditRoles = useMemo(() => {
		const set = new Set<string>(ANKETA_ETALON_ROLES);
		for (const roles of Object.values(etalonDraft?.groupRoleTarget ?? {})) {
			for (const r of roles) set.add(r);
		}
		return [...set].sort();
	}, [etalonDraft]);

	const etalonGroupRows = useMemo((): EtalonGroupEditRow[] => {
		if (!etalonDraft) return [];
		const rows = Object.entries(etalonDraft.groupRoleTarget)
			.map(([path, roles]) => ({
				path,
				roleSet: new Set(roles),
				roleCount: roles.length,
			}))
			.sort((a, b) => a.path.localeCompare(b.path));
		if (!etalonHideAdAlias) return rows;
		return rows.filter((r) => !/(^|\/)(dev_|test_|prod_)?sum_/i.test(r.path));
	}, [etalonDraft, etalonHideAdAlias]);

	const etalonUserRows = useMemo((): EtalonUserEditRow[] => {
		if (!etalonDraft) return [];
		return etalonDraft.testUsers
			.map((u) => ({
				username: u.username,
				label: u.label,
				groupsText: u.groups.join(", "),
				groupCount: u.groups.length,
			}))
			.sort((a, b) => a.username.localeCompare(b.username));
	}, [etalonDraft]);

	const etalonGroupColDefs = useMemo((): ColDef<EtalonGroupEditRow>[] => {
		const cols: ColDef<EtalonGroupEditRow>[] = [
			{
				field: "path",
				headerName: "Группа Keycloak",
				headerTooltip:
					"Путь группы в Keycloak, напр. /ds или /architect/dev_sum_arch_kmbkcb",
				pinned: "left",
				width: 240,
				filter: "agTextColumnFilter",
				cellStyle: { fontFamily: "monospace", fontSize: 12 },
			},
			{
				colId: "roleCount",
				field: "roleCount",
				headerName: "N",
				width: 56,
			},
			{
				colId: "remove",
				headerName: "",
				width: 72,
				sortable: false,
				filter: false,
				cellRenderer: (p: ICellRendererParams<EtalonGroupEditRow>) => {
					const path = p.data?.path;
					return (
						<Button
							size="small"
							color="inherit"
							onClick={() => path && removeEtalonGroupPath(path)}
							title={
								path
									? `Убрать группу ${path} из эталона (всю строку с ролями)`
									: "Убрать группу из эталона"
							}
							aria-label={
								path ? `Убрать группу ${path} из эталона` : "Убрать группу"
							}
						>
							✕
						</Button>
					);
				},
			},
		];
		for (const role of etalonEditRoles) {
			const short = role.replace(/^anketa_/, "");
			cols.push({
				colId: role,
				headerName: short,
				headerTooltip: role,
				width: 88,
				sortable: false,
				filter: false,
				valueGetter: (p) => p.data?.roleSet.has(role) ?? false,
				cellRenderer: (p: ICellRendererParams<EtalonGroupEditRow, boolean>) => (
					<div className="kk-matrix-cell">
						<Checkbox
							size="small"
							checked={Boolean(p.value)}
							onChange={() =>
								p.data && toggleEtalonGroupRole(p.data.path, role)
							}
						/>
					</div>
				),
				cellStyle: { padding: "0" },
			});
		}
		return cols;
	}, [etalonEditRoles]);

	const etalonUserColDefs = useMemo(
		(): ColDef<EtalonUserEditRow>[] => [
			{
				field: "username",
				headerName: "Логин",
				width: 180,
				editable: false,
				filter: "agTextColumnFilter",
				cellStyle: { fontFamily: "monospace", fontSize: 12 },
			},
			{
				field: "label",
				headerName: "Описание",
				width: 220,
				editable: true,
				filter: "agTextColumnFilter",
			},
			{
				field: "groupsText",
				headerName: "Группы (через запятую)",
				flex: 1,
				minWidth: 280,
				editable: true,
				filter: "agTextColumnFilter",
				cellStyle: { fontFamily: "monospace", fontSize: 11 },
			},
			{
				field: "groupCount",
				headerName: "N",
				width: 56,
				editable: false,
			},
			{
				colId: "remove",
				headerName: "",
				width: 72,
				sortable: false,
				filter: false,
				cellRenderer: (p: ICellRendererParams<EtalonUserEditRow>) => (
					<Button
						size="small"
						color="inherit"
						onClick={() => p.data && removeEtalonUser(p.data.username)}
						title="Удалить пользователя из эталона"
					>
						✕
					</Button>
				),
			},
		],
		[],
	);

	return (
		<Flex
			flexDirection="column"
			flexGrow={1}
			minHeight="0"
			height="100%"
			sx={{ overflow: "hidden" }}
		>
			<Header fixed title={commonRoutes.adminV2KeycloakMatrix.name} />
			<Spacer space={8} />
			<Box
				sx={{
					flex: 1,
					minHeight: 0,
					overflowY: "auto",
					overflowX: "hidden",
					pb: 3,
				}}
			>
			<Card padding="16px" overflow="visible" maxHeight="none">
				<Flex flexDirection="column" gap={10}>
					<Flex
						gap={8}
						alignItems="center"
						justifyContent="space-between"
						wrap="wrap"
					>
						<Typography variant="body2" color="text.secondary">
							Сверка live Keycloak с эталоном (F-05 + test-users). Пишем только
							роли <code>anketa_*</code> на группах и membership пользователей.
						</Typography>
						<Flex gap={6} wrap="wrap">
							<Chip
								size="small"
								variant="outlined"
								label="красное — нет в KK"
								sx={{ bgcolor: "rgba(211, 47, 47, 0.18)" }}
							/>
							<Chip
								size="small"
								variant="outlined"
								label="оранжевое — лишнее в KK"
								sx={{ bgcolor: "rgba(237, 108, 2, 0.18)" }}
							/>
							<Chip
								size="small"
								variant="outlined"
								label="жёлтое — не там (parent/nested)"
								title="Пользователь в parent или nested lead вместо AD-leaf / top-level. Орг-группы (/departament, access_during_freeze) игнорируются."
								sx={{ bgcolor: "rgba(251, 192, 45, 0.28)" }}
							/>
							<Chip
								size="small"
								variant="outlined"
								label="синее — в очереди заливки"
								sx={{ bgcolor: "rgba(25, 118, 210, 0.16)" }}
							/>
						</Flex>
					</Flex>

					<Card padding="12px" variant="outlined">
						<Flex
							alignItems="center"
							justifyContent="space-between"
							gap={8}
							wrap="wrap"
						>
							<Typography variant="subtitle2">
								1. Подключение к Keycloak
								{inspect
									? ` · ${inspect.realm} · ${inspect.standPrefix || "без prefix"} · ${new Date(inspect.exportedAt).toLocaleString()}`
									: ""}
							</Typography>
							<Button size="small" onClick={() => setCredsOpen((v) => !v)}>
								{credsOpen ? "Свернуть" : "Изменить креды"}
							</Button>
						</Flex>
						{credsOpen ? (
							<>
								<Spacer space={8} />
								<Flex gap={8} wrap="wrap" alignItems="flex-start">
									<TextField
										size="small"
										label="Keycloak URL"
										value={keycloakUrl}
										onChange={(e) => {
											const next = e.target.value;
											setKeycloakUrl(next);
											setStandPrefix(inferAdStandPrefixFromUrl(next));
										}}
										sx={{ minWidth: 280, flexGrow: 1 }}
									/>
									<TextField
										size="small"
										label="Realm"
										value={realm}
										onChange={(e) => setRealm(e.target.value)}
										sx={{ width: 120 }}
									/>
									<TextField
										size="small"
										select
										label="standPrefix"
										value={standPrefix}
										onChange={(e) => setStandPrefix(e.target.value)}
										sx={{ width: 120 }}
										helperText="Авто по hostname: vtb→test_, иначе dev_"
									>
										<MenuItem value="dev_">dev_</MenuItem>
										<MenuItem value="test_">test_</MenuItem>
										<MenuItem value="prod_">prod_</MenuItem>
										<MenuItem value="">(пусто)</MenuItem>
									</TextField>
									<TextField
										size="small"
										label="Admin username"
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										sx={{ width: 160 }}
										autoComplete="username"
									/>
									<TextField
										size="small"
										type="password"
										label="Admin password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										sx={{ width: 160 }}
										autoComplete="current-password"
									/>
								</Flex>
							</>
						) : null}
					</Card>

					<Flex gap={8} wrap="wrap" alignItems="center">
						<Typography variant="subtitle2" sx={{ mr: 1 }}>
							2. Действия
						</Typography>
						<Button
							variant="contained"
							disabled={busy || !canCall}
							onClick={() => void loadInspectAndDiff()}
						>
							Загрузить из KK + сверить
						</Button>
						<Button
							variant="outlined"
							disabled={!diff || mismatchTotal === 0}
							onClick={fixAllDiffs}
							title="Положить все missing/extra в очередь заливки (только эталонный scope)"
						>
							Исправить все ({mismatchTotal})
						</Button>
						<Button
							variant="contained"
							color="warning"
							disabled={busy || stagedCount === 0}
							onClick={() => void openApply(true)}
							title="Сначала dry-run preview, потом подтверждение"
						>
							Залить в KK ({stagedCount})
						</Button>
						<Button
							variant="outlined"
							disabled={busy}
							onClick={() => void openEtalonEditor()}
						>
							Эталон…
						</Button>
						<Button
							variant="outlined"
							disabled={!diff && !inspect}
							onClick={exportMatrixReport}
							title="JSON: summary, все missing/extra (byPath / byUsername), эталон, snapshot KK, очередь"
						>
							Выгрузить отчёт JSON
						</Button>
						<Button
							variant="text"
							disabled={stagedCount === 0}
							onClick={() => setStaged(emptyPatch())}
						>
							Очистить очередь
						</Button>
						<FormControlLabel
							control={
								<Switch
									checked={onlyDiffs}
									onChange={(_, v) => setOnlyDiffs(v)}
									size="small"
								/>
							}
							label="Только расхождения"
							title="Скрыть строки без missing/extra/warn/staged"
						/>
						<FormControlLabel
							control={
								<Switch
									checked={etalonScopeOnly}
									onChange={(_, v) => setEtalonScopeOnly(v)}
									size="small"
								/>
							}
							label="Не грузить чужие группы KK"
							title={
								"Вкл (рекомендуется): из Keycloak забираем только группы из нашего эталона F-05 " +
								"(/ds, /de, /sacfg, test_sum_* …) — матрица остаётся обозримой.\n" +
								"Выкл: тянем все группы realm (сотни bc_*, SUMRM и т.п.) — медленно и шумно, " +
								"нужно только для поиска «что ещё висит в KK»."
							}
						/>
						<FormControlLabel
							control={
								<Switch
									checked={dimNonFeature}
									onChange={(_, v) => setDimNonFeature(v)}
									size="small"
								/>
							}
							label="Вне фичи — блёклые снизу"
							title="Пустой target (business_customer, prjtoffice, admin_it…), юзеры без anketa-ролей и лишние anketa_* — вниз и полупрозрачные"
						/>
						{diff ? (
							<>
								<Chip
									size="small"
									color={mismatchTotal ? "warning" : "success"}
									label={`эталон: ${diff.etalonSource} · расхождений ${mismatchTotal}`}
								/>
								{placementWarnTotal > 0 ? (
									<Chip
										size="small"
										variant="outlined"
										label={`размещение ≈ ${placementWarnTotal}`}
										title="Parent вместо AD-leaf или nested lead вместо top-level — не в «Исправить все»"
										sx={{ bgcolor: "rgba(251, 192, 45, 0.28)" }}
									/>
								) : null}
							</>
						) : null}
					</Flex>

					<Flex gap={12} width="100%" alignItems="stretch">
						<Flex flexDirection="column" flexGrow={1} minWidth="0" gap={8}>
							<Tabs value={tab} onChange={(_, v) => setTab(v)}>
								<Tab
									label={
										inspect
											? `Группы × роли (${groupRoleRowData.length}×${etalonRoles.length})`
											: "Группы × роли"
									}
								/>
								<Tab
									label={
										inspect
											? `Пользователи × группы (${userGroupRowData.length})`
											: "Пользователи × группы"
									}
								/>
								<Tab label={`Очередь заливки (${stagedCount})`} />
								<Tab
									label={`Эталон (${etalonGroupRows.length}/${etalonUserRows.length})`}
								/>
							</Tabs>

							{tab < 3 && !inspect ? (
								<Alert severity="info">
									Шаг 1: креды admin Keycloak → шаг 2: «Загрузить из KK +
									сверить». Вкладка «Эталон» доступна без KK — это code ⊕
									overlay.
								</Alert>
							) : null}

							{tab === 0 && inspect ? (
								<>
									<Typography variant="caption" color="text.secondary">
										Строки — группы Keycloak, колонки — realm-роли{" "}
										<code>anketa_*</code>. Наведите на ячейку: эталон vs
										Keycloak. Клик по чекбоксу → в очередь.
									</Typography>
									<GridWrap>
										<AgGridReact<GroupRoleRow>
											ref={groupGridRef}
											theme={gridTheme}
											icons={agGridIconSet}
											localeText={AG_GRID_LOCALE_RU}
											rowData={groupRoleRowData}
											columnDefs={groupRoleColDefs}
											defaultColDef={defaultColDef}
											getRowId={(p) => p.data.path}
											getRowClass={matrixGetRowClass}
											rowHeight={36}
											headerHeight={40}
											animateRows={false}
											suppressCellFocus
										/>
									</GridWrap>
								</>
							) : null}

							{tab === 1 && inspect ? (
								<>
									<Flex gap={8} alignItems="center" wrap="wrap">
										<Typography
											variant="caption"
											color="text.secondary"
											sx={{ flexGrow: 1 }}
										>
											Строки — пользователи, колонки — группы. Перетащите логин
											на заголовок колонки или ячейку, либо кликните чекбокс.
											{dragUser ? ` Перетаскивается: ${dragUser}` : ""}
										</Typography>
										<TextField
											size="small"
											label="Поиск user"
											value={userSearch}
											onChange={(e) => setUserSearch(e.target.value)}
											sx={{ width: 180 }}
										/>
									</Flex>
									<GridWrap>
										<AgGridReact<UserGroupRow>
											ref={userGridRef}
											theme={gridTheme}
											icons={agGridIconSet}
											localeText={AG_GRID_LOCALE_RU}
											rowData={userGroupRowData}
											columnDefs={userGroupColDefs}
											defaultColDef={defaultColDef}
											getRowId={(p) => p.data.username}
											getRowClass={matrixGetRowClass}
											rowHeight={44}
											headerHeight={44}
											animateRows={false}
											suppressCellFocus
										/>
									</GridWrap>
								</>
							) : null}

							{tab === 2 ? (
								<Card padding="12px" variant="outlined">
									{stagedLines.length === 0 ? (
										<Alert severity="info">
											Очередь пуста. Отметьте ячейки в матрице или нажмите
											«Исправить все».
										</Alert>
									) : (
										<>
											<Typography variant="subtitle2" gutterBottom>
												Будет отправлено в Keycloak после подтверждения
											</Typography>
											<ul
												style={{
													margin: 0,
													paddingLeft: 18,
													fontFamily: "monospace",
													fontSize: 12,
												}}
											>
												{stagedLines.map((line) => (
													<li key={line}>{line}</li>
												))}
											</ul>
											<Spacer space={8} />
											<pre
												style={{
													margin: 0,
													fontSize: 11,
													opacity: 0.7,
													whiteSpace: "pre-wrap",
												}}
											>
												{JSON.stringify(staged, null, 2)}
											</pre>
										</>
									)}
								</Card>
							) : null}

							{tab === 3 ? (
								<>
									<Flex gap={8} alignItems="center" wrap="wrap">
										<Typography
											variant="caption"
											color="text.secondary"
											sx={{ flexGrow: 1 }}
										>
											Живой редактор эталона (текущий code ⊕ overlay). Чекбоксы
											ролей / правка ячеек users → «Сохранить overlay». Креды KK
											не нужны.
										</Typography>
										{viewedEtalon ? (
											<Chip
												size="small"
												color={etalonDirty ? "warning" : "default"}
												label={`${viewedEtalon.source} · stand ${viewedEtalon.standPrefix || "(пусто)"}${etalonDirty ? " · не сохранено" : ""}`}
											/>
										) : null}
										<Button
											size="small"
											variant="contained"
											disabled={busy || !etalonDirty || !etalonDraft}
											onClick={() => void saveEtalonFromDraft()}
										>
											Сохранить overlay
										</Button>
										<Button
											size="small"
											disabled={!etalonDirty || busy}
											onClick={discardEtalonDraft}
										>
											Отменить правки
										</Button>
										<Button
											size="small"
											disabled={busy}
											onClick={() => void resetEtalon()}
											title="Удалить overlay из БД → вернуться к code defaults"
										>
											Сбросить к коду
										</Button>
										<Button
											size="small"
											disabled={etalonQuery.isFetching || etalonDirty}
											onClick={() => void etalonQuery.refetch()}
										>
											Обновить
										</Button>
										<Button size="small" onClick={importEtalon}>
											Импорт JSON
										</Button>
										<Button size="small" onClick={exportEtalon}>
											Экспорт JSON
										</Button>
										<Button
											size="small"
											onClick={() => void openEtalonEditor()}
										>
											JSON…
										</Button>
										<FormControlLabel
											control={
												<Switch
													checked={etalonHideAdAlias}
													onChange={(_, v) => setEtalonHideAdAlias(v)}
													size="small"
												/>
											}
											label="Скрыть AD-alias path"
											title="Оставить канон /ds, /de_lead… без /de/test_sum_de_*"
										/>
										<Tabs
											value={etalonViewPane === "groups" ? 0 : 1}
											onChange={(_, v) =>
												setEtalonViewPane(v === 0 ? "groups" : "users")
											}
										>
											<Tab
												label={`Группы → роли (${etalonGroupRows.length})`}
											/>
											<Tab
												label={`Users → groups (${etalonUserRows.length})`}
											/>
										</Tabs>
									</Flex>
									{etalonQuery.isError ? (
										<Alert severity="error">
											Не удалось загрузить эталон:{" "}
											{apiErrorMessage(etalonQuery.error)}
										</Alert>
									) : null}
									{etalonViewPane === "groups" ? (
										<>
											<Flex gap={8} alignItems="center" wrap="wrap">
												<TextField
													size="small"
													label="Путь группы KK"
													value={newEtalonPath}
													onChange={(e) => setNewEtalonPath(e.target.value)}
													placeholder="/ds/dev_sum_ds_kmbkcb"
													helperText="Как в Keycloak: /роль или /роль/AD-leaf"
													sx={{ width: 280 }}
												/>
												<Button
													size="small"
													variant="outlined"
													onClick={addEtalonGroupPath}
													disabled={!newEtalonPath.trim()}
												>
													Добавить группу
												</Button>
												<Typography variant="caption" color="text.secondary">
													Строка = группа; ✕ убирает группу из эталона;
													чекбокс — роль anketa_* на этой группе
												</Typography>
											</Flex>
											<GridWrap>
												<AgGridReact<EtalonGroupEditRow>
													theme={gridTheme}
													icons={agGridIconSet}
													localeText={AG_GRID_LOCALE_RU}
													rowData={etalonGroupRows}
													columnDefs={etalonGroupColDefs}
													defaultColDef={defaultColDef}
													getRowId={(p) => p.data.path}
													rowHeight={34}
													headerHeight={36}
													animateRows={false}
													suppressCellFocus
												/>
											</GridWrap>
										</>
									) : (
										<>
											<Flex gap={8} alignItems="center" wrap="wrap">
												<TextField
													size="small"
													label="Новый username"
													value={newEtalonUser}
													onChange={(e) => setNewEtalonUser(e.target.value)}
													placeholder="test_custom"
													sx={{ width: 200 }}
												/>
												<Button
													size="small"
													variant="outlined"
													onClick={addEtalonUser}
													disabled={!newEtalonUser.trim()}
												>
													Добавить user
												</Button>
												<Typography variant="caption" color="text.secondary">
													Двойной клик по «Описание» / «Группы» — правка
												</Typography>
											</Flex>
											<GridWrap>
												<AgGridReact<EtalonUserEditRow>
													theme={gridTheme}
													icons={agGridIconSet}
													localeText={AG_GRID_LOCALE_RU}
													rowData={etalonUserRows}
													columnDefs={etalonUserColDefs}
													defaultColDef={defaultColDef}
													getRowId={(p) => p.data.username}
													rowHeight={36}
													headerHeight={36}
													animateRows={false}
													stopEditingWhenCellsLoseFocus
													onCellValueChanged={(e) => {
														const row = e.data;
														if (!row) return;
														if (e.colDef.field === "label") {
															updateEtalonUser(row.username, {
																label: String(e.newValue ?? ""),
															});
														}
														if (e.colDef.field === "groupsText") {
															const groups = String(e.newValue ?? "")
																.split(/[,;\n]+/)
																.map((g) => g.trim())
																.filter(Boolean);
															updateEtalonUser(row.username, { groups });
														}
													}}
												/>
											</GridWrap>
										</>
									)}
								</>
							) : null}
						</Flex>

						{tab < 3 ? (
							<Flex width="360px" flexShrink={0}>
								<Card
									padding="12px"
									variant="outlined"
									width="100%"
									overflow="auto"
								>
									<Typography variant="subtitle2" gutterBottom>
										3. Проблемы
										{diff ? ` (${problemItems.length})` : ""}
									</Typography>
									{diff ? (
										<Flex flexDirection="column" gap={8}>
											<Typography variant="caption" color="text.secondary">
												Эталон: {diff.etalonSource}. Роли: нет{" "}
												{diff.summary.groupRoleMissing} / лишние{" "}
												{diff.summary.groupRoleExtra}. Membership: нет{" "}
												{diff.summary.userGroupMissing} / лишние{" "}
												{diff.summary.userGroupExtra} / размещение{" "}
												{diff.summary.userGroupWarn ?? 0}. Орг-группы игнор.;
												размещение — не в «Исправить все».
											</Typography>
											{problemItems.length === 0 ? (
												<Typography variant="body2" color="success.main">
													Проблем нет — сверка чистая.
												</Typography>
											) : (
												<ul
													style={{
														margin: 0,
														paddingLeft: 16,
														fontSize: 11,
														fontFamily:
															"ui-monospace, SFMono-Regular, Menlo, monospace",
														lineHeight: 1.45,
													}}
												>
													{problemItems.map((p) => (
														<li
															key={p.id}
															title={p.text}
															style={{
																marginBottom: 4,
																color:
																	p.severity === "warning"
																		? "#8a6d00"
																		: undefined,
															}}
														>
															<span style={{ opacity: 0.65, marginRight: 4 }}>
																[{p.kind}]
															</span>
															{p.text}
														</li>
													))}
												</ul>
											)}
											<Button
												size="small"
												variant="outlined"
												onClick={exportMatrixReport}
												title="Полный JSON для разбора расхождений"
											>
												Выгрузить отчёт JSON
											</Button>
										</Flex>
									) : (
										<Typography variant="body2" color="text.secondary">
											Нет данных сверки — откройте «Эталон» или загрузите KK.
										</Typography>
									)}
									<Spacer space={12} />
									<Typography variant="subtitle2" gutterBottom>
										Очередь ({stagedCount})
									</Typography>
									{stagedLines.length === 0 ? (
										<Typography variant="caption" color="text.secondary">
											Пока пусто.
										</Typography>
									) : (
										<ul
											style={{
												margin: 0,
												paddingLeft: 16,
												fontSize: 11,
												fontFamily: "monospace",
											}}
										>
											{stagedLines.slice(0, 40).map((line) => (
												<li key={line} title={line}>
													{line}
												</li>
											))}
											{stagedLines.length > 40 ? (
												<li>… ещё {stagedLines.length - 40}</li>
											) : null}
										</ul>
									)}
								</Card>
							</Flex>
						) : null}
					</Flex>
				</Flex>
			</Card>
			</Box>

			<Dialog
				open={applyOpen}
				onClose={() => setApplyOpen(false)}
				maxWidth="md"
				fullWidth
			>
				<DialogTitle>Заливка в Keycloak (dry-run)</DialogTitle>
				<DialogContent>
					<Alert severity="warning" sx={{ mb: 1 }}>
						Проверьте список. «Применить» выполнит те же операции без dry-run.
					</Alert>
					<pre style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>
						{applyPreview}
					</pre>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setApplyOpen(false)}>Отмена</Button>
					<Button
						variant="contained"
						color="warning"
						disabled={busy}
						onClick={() => void openApply(false)}
					>
						Применить
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog
				open={etalonOpen}
				onClose={() => setEtalonOpen(false)}
				maxWidth="xl"
				fullWidth
				PaperProps={{ sx: { height: "90vh", maxHeight: "90vh" } }}
			>
				<DialogTitle>
					<Flex
						alignItems="center"
						justifyContent="space-between"
						gap={8}
						wrap="wrap"
					>
						<span>Кастомный эталон (overlay)</span>
						{viewedEtalon ? (
							<Chip
								size="small"
								color={etalonDirty ? "warning" : "default"}
								label={`${viewedEtalon.source} · stand ${viewedEtalon.standPrefix || "(пусто)"}${etalonDirty ? " · не сохранено" : ""}`}
							/>
						) : null}
					</Flex>
				</DialogTitle>
				<DialogContent
					dividers
					sx={{
						display: "flex",
						flexDirection: "column",
						gap: 1,
						minHeight: 0,
						overflow: "hidden",
					}}
				>
					<Typography variant="body2" color="text.secondary">
						Таблица задаёт эталон (code ⊕ overlay): чекбоксы ролей на группах и
						membership test-users. Diff всегда считает этот снимок. JSON — только
						импорт/экспорт.
					</Typography>
					<Flex gap={8} alignItems="center" wrap="wrap">
						<Tabs
							value={etalonViewPane === "groups" ? 0 : 1}
							onChange={(_, v) =>
								setEtalonViewPane(v === 0 ? "groups" : "users")
							}
						>
							<Tab label={`Группы → роли (${etalonGroupRows.length})`} />
							<Tab label={`Users → groups (${etalonUserRows.length})`} />
						</Tabs>
						<FormControlLabel
							control={
								<Switch
									checked={etalonHideAdAlias}
									onChange={(_, v) => setEtalonHideAdAlias(v)}
									size="small"
								/>
							}
							label="Скрыть AD-alias path"
						/>
						<Button
							size="small"
							variant={etalonShowJson ? "contained" : "outlined"}
							onClick={() => setEtalonShowJson((v) => !v)}
						>
							{etalonShowJson ? "Таблица" : "JSON…"}
						</Button>
						<Button size="small" onClick={importEtalon}>
							Импорт JSON
						</Button>
						<Button size="small" onClick={exportEtalon}>
							Экспорт JSON
						</Button>
						<Button
							size="small"
							disabled={!etalonDirty || busy}
							onClick={discardEtalonDraft}
						>
							Отменить правки
						</Button>
					</Flex>

					{etalonShowJson ? (
						<TextField
							multiline
							fullWidth
							value={etalonJson}
							onChange={(e) => setEtalonJson(e.target.value)}
							sx={{ flex: 1, minHeight: 0 }}
							inputProps={{
								style: {
									fontFamily: "monospace",
									fontSize: 12,
									height: "48vh",
									overflow: "auto",
								},
							}}
							helperText="Overlay JSON (delta поверх code). «Сохранить» в режиме JSON пишет этот текст."
						/>
					) : (
						<Flex
							flexDirection="column"
							gap={8}
							sx={{ flex: 1, minHeight: 0 }}
						>
							{etalonViewPane === "groups" ? (
								<>
									<Flex gap={8} alignItems="center" wrap="wrap">
										<TextField
											size="small"
											label="Путь группы KK"
											value={newEtalonPath}
											onChange={(e) => setNewEtalonPath(e.target.value)}
											placeholder="/ds/dev_sum_ds_kmbkcb"
											helperText="Как в Keycloak: /роль или /роль/AD-leaf"
											sx={{ width: 280 }}
										/>
										<Button
											size="small"
											variant="outlined"
											onClick={addEtalonGroupPath}
											disabled={!newEtalonPath.trim()}
										>
											Добавить группу
										</Button>
										<Typography variant="caption" color="text.secondary">
											Строка = группа; ✕ убирает группу из эталона; чекбокс —
											роль anketa_* на этой группе
										</Typography>
									</Flex>
									<ModalGridWrap>
										<AgGridReact<EtalonGroupEditRow>
											theme={gridTheme}
											icons={agGridIconSet}
											localeText={AG_GRID_LOCALE_RU}
											rowData={etalonGroupRows}
											columnDefs={etalonGroupColDefs}
											defaultColDef={defaultColDef}
											getRowId={(p) => p.data.path}
											rowHeight={34}
											headerHeight={36}
											animateRows={false}
											suppressCellFocus
										/>
									</ModalGridWrap>
								</>
							) : (
								<>
									<Flex gap={8} alignItems="center" wrap="wrap">
										<TextField
											size="small"
											label="Новый username"
											value={newEtalonUser}
											onChange={(e) => setNewEtalonUser(e.target.value)}
											placeholder="test_custom"
											sx={{ width: 200 }}
										/>
										<Button
											size="small"
											variant="outlined"
											onClick={addEtalonUser}
											disabled={!newEtalonUser.trim()}
										>
											Добавить user
										</Button>
										<Typography variant="caption" color="text.secondary">
											Двойной клик по «Описание» / «Группы» — правка
										</Typography>
									</Flex>
									<ModalGridWrap>
										<AgGridReact<EtalonUserEditRow>
											theme={gridTheme}
											icons={agGridIconSet}
											localeText={AG_GRID_LOCALE_RU}
											rowData={etalonUserRows}
											columnDefs={etalonUserColDefs}
											defaultColDef={defaultColDef}
											getRowId={(p) => p.data.username}
											rowHeight={36}
											headerHeight={36}
											animateRows={false}
											stopEditingWhenCellsLoseFocus
											onCellValueChanged={(e) => {
												const row = e.data;
												if (!row) return;
												if (e.colDef.field === "label") {
													updateEtalonUser(row.username, {
														label: String(e.newValue ?? ""),
													});
												}
												if (e.colDef.field === "groupsText") {
													const groups = String(e.newValue ?? "")
														.split(/[,;\n]+/)
														.map((g) => g.trim())
														.filter(Boolean);
													updateEtalonUser(row.username, { groups });
												}
											}}
										/>
									</ModalGridWrap>
								</>
							)}
						</Flex>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => void resetEtalon()} disabled={busy}>
						Сбросить к коду
					</Button>
					<Button onClick={() => setEtalonOpen(false)}>Отмена</Button>
					<Button
						variant="contained"
						disabled={
							busy ||
							(etalonShowJson ? false : !etalonDirty || !etalonDraft)
						}
						onClick={() =>
							void (etalonShowJson
								? saveEtalonFromJson()
								: saveEtalonFromDraft())
						}
					>
						Сохранить overlay
					</Button>
				</DialogActions>
			</Dialog>
		</Flex>
	);
}

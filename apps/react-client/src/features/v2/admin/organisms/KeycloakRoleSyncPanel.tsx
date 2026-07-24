import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { apiClient } from "@react-client/common/api/helpers/apiClient";
import { downloadBlob } from "@react-client/common/api/queries/kanban-board";
import { Flex } from "@react-client/common/primitives/Flex";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { toast } from "@react-client/common/toasts";
import { useEffect, useRef, useState } from "react";

type StandPrefixOption = { value: string; label: string };

const STAND_PREFIX_OPTIONS: StandPrefixOption[] = [
	{ value: "test_", label: "test_" },
	{ value: "dev_", label: "dev_" },
	{ value: "prod_", label: "prod_" },
	{ value: "", label: "(без префикса → /sum_*)" },
];

type BackupInclude = {
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

const DEFAULT_BACKUP_INCLUDE: BackupInclude = {
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

/** Секции, которые реально пишет restore (не всё из бекапа). */
const DEFAULT_RESTORE_INCLUDE: BackupInclude = {
	realmRoles: true,
	groups: true,
	groupAttributes: false,
	groupRealmRoles: true,
	groupMembers: false,
	users: true,
	userProfile: false,
	userAttributes: false,
	userGroups: true,
	userRealmRoles: true,
};

type SyncDefaults = {
	keycloakUrl: string;
	realm: string;
};

type SyncResult = {
	dryRun: boolean;
	keycloakUrl: string;
	realm: string;
	rolesCreated: string[];
	groupsCreated: string[];
	groupRoleChanges: Array<{
		path: string;
		add: string[];
		remove: string[];
		status: string;
	}>;
};

type BackupResult = {
	exportedAt: string;
	keycloakUrl: string;
	realm: string;
	counts: {
		realmRoles: number;
		anketaRoles: number;
		groups: number;
		users: number;
	};
};

type RestoreResult = {
	dryRun: boolean;
	keycloakUrl: string;
	realm: string;
	backupExportedAt: string | null;
	rolesCreated: string[];
	groupsCreated: string[];
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
	userRoleChanges: Array<{
		username: string;
		add: string[];
		remove: string[];
		status: string;
	}>;
	warnings: string[];
};

type ModalMode = "sync" | "backup" | "restore";

function downloadBackupJson(data: unknown, realm: string) {
	const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
	const blob = new Blob([JSON.stringify(data, null, 2)], {
		type: "application/json",
	});
	downloadBlob(blob, `keycloak-${realm}-backup-${stamp}.json`);
}

function connectionPayload(fields: {
	keycloakUrl: string;
	realm: string;
}) {
	return {
		keycloakUrl: fields.keycloakUrl.trim() || undefined,
		realm: fields.realm.trim() || undefined,
	};
}

function summarizeRestore(data: RestoreResult): string {
	const groupΔ = data.groupRoleChanges.filter(
		(c) => c.add.length || c.remove.length || c.status === "missing_group",
	).length;
	const userGΔ = data.userGroupChanges.filter(
		(c) => c.join.length || c.leave.length || c.status === "missing_user",
	).length;
	const userRΔ = data.userRoleChanges.filter(
		(c) => c.add.length || c.remove.length || c.status === "missing_user",
	).length;
	return `roles+${data.rolesCreated.length}, groups+${data.groupsCreated.length}, groupRolesΔ${groupΔ}, userGroupsΔ${userGΔ}, userRolesΔ${userRΔ}`;
}

export function KeycloakRoleSyncPanel() {
	const defaultsQuery = useQuery({
		queryKey: ["v2-keycloak-role-sync-defaults"],
		queryFn: () =>
			apiClient<SyncDefaults>({
				url: "/v2/admin/keycloak-role-sync/defaults",
				method: "GET",
			}),
		staleTime: 60_000,
	});

	const fileInputRef = useRef<HTMLInputElement>(null);
	const [open, setOpen] = useState(false);
	const [mode, setMode] = useState<ModalMode>("sync");
	const [keycloakUrl, setKeycloakUrl] = useState("");
	const [realm, setRealm] = useState("cym");
	const [standPrefix, setStandPrefix] = useState("test_");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [backupInclude, setBackupInclude] = useState<BackupInclude>(
		DEFAULT_BACKUP_INCLUDE,
	);
	const [restoreInclude, setRestoreInclude] = useState<BackupInclude>(
		DEFAULT_RESTORE_INCLUDE,
	);
	const [backupFileName, setBackupFileName] = useState<string | null>(null);
	const [backupPayload, setBackupPayload] = useState<Record<
		string,
		unknown
	> | null>(null);
	const [lastResult, setLastResult] = useState<SyncResult | null>(null);
	const [lastBackup, setLastBackup] = useState<BackupResult | null>(null);
	const [lastRestore, setLastRestore] = useState<RestoreResult | null>(null);
	const [backupDoneInSession, setBackupDoneInSession] = useState(false);

	useEffect(() => {
		const d = defaultsQuery.data;
		if (!d) return;
		setKeycloakUrl((prev) => prev || d.keycloakUrl || "");
		setRealm((prev) => (prev === "cym" && d.realm ? d.realm : prev));
	}, [defaultsQuery.data]);

	const connection = connectionPayload({ keycloakUrl, realm });

	const setInclude = (
		target: "backup" | "restore",
		key: keyof BackupInclude,
		value: boolean,
	) => {
		const setter = target === "backup" ? setBackupInclude : setRestoreInclude;
		setter((prev) => {
			const next = { ...prev, [key]: value };
			if (key === "groups" && !value) {
				next.groupAttributes = false;
				next.groupRealmRoles = false;
				next.groupMembers = false;
			}
			if (key === "groups" && value) {
				if (target === "backup") {
					next.groupAttributes = true;
					next.groupRealmRoles = true;
					next.groupMembers = true;
				} else {
					next.groupRealmRoles = true;
				}
			}
			if (key === "users" && !value) {
				next.userProfile = false;
				next.userAttributes = false;
				next.userGroups = false;
				next.userRealmRoles = false;
			}
			if (key === "users" && value) {
				if (target === "backup") {
					next.userProfile = true;
					next.userAttributes = true;
					next.userGroups = true;
					next.userRealmRoles = true;
				} else {
					next.userGroups = true;
					next.userRealmRoles = true;
				}
			}
			return next;
		});
	};

	const onBackupFile = async (file: File | null) => {
		if (!file) {
			setBackupFileName(null);
			setBackupPayload(null);
			return;
		}
		try {
			const text = await file.text();
			const parsed = JSON.parse(text) as unknown;
			if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
				throw new Error("Ожидается JSON-объект бекапа");
			}
			const obj = parsed as Record<string, unknown>;
			setBackupPayload(obj);
			setBackupFileName(file.name);
			if (typeof obj.realm === "string" && obj.realm.trim()) {
				setRealm(obj.realm.trim());
			}
			if (typeof obj.keycloakUrl === "string" && obj.keycloakUrl.trim()) {
				const fromBackup = obj.keycloakUrl.trim();
				setKeycloakUrl((prev) => prev || fromBackup);
			}
			if (obj.include && typeof obj.include === "object") {
				setRestoreInclude((prev) => ({
					...prev,
					...(obj.include as Partial<BackupInclude>),
					groupMembers: false,
					userProfile: false,
					userAttributes: false,
				}));
			}
			toast.success(`Файл бекапа загружен: ${file.name}`);
		} catch (err) {
			setBackupFileName(null);
			setBackupPayload(null);
			toast.error("Не удалось прочитать JSON бекапа", {
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	const backupMutation = useMutation({
		mutationFn: () =>
			apiClient<BackupResult & Record<string, unknown>>({
				url: "/v2/admin/keycloak-role-sync/backup",
				method: "POST",
				data: {
					adminUsername: username,
					adminPassword: password,
					...connection,
					include: backupInclude,
				},
			}),
		onSuccess: (data) => {
			downloadBackupJson(data, data.realm || "realm");
			setLastBackup({
				exportedAt: data.exportedAt,
				keycloakUrl: data.keycloakUrl,
				realm: data.realm,
				counts: data.counts,
			});
			setBackupDoneInSession(true);
			toast.success(
				`Бекап скачан: ${data.counts.users} users, ${data.counts.groups} groups`,
			);
			setPassword("");
			setOpen(false);
		},
		onError: (err) => {
			toast.error("Не удалось создать бекап Keycloak", {
				description: apiErrorMessage(err),
			});
		},
	});

	const syncMutation = useMutation({
		mutationFn: (dryRun: boolean) =>
			apiClient<SyncResult>({
				url: "/v2/admin/keycloak-role-sync",
				method: "POST",
				data: {
					adminUsername: username,
					adminPassword: password,
					dryRun,
					applyRemap: true,
					...connection,
					standPrefix: standPrefix.trim() || undefined,
				},
			}),
		onSuccess: (data, dryRun) => {
			setLastResult(data);
			toast.success(
				dryRun
					? "Dry-run: план синхронизации Keycloak готов"
					: "Keycloak обновлён по матрице F-05",
			);
			if (!dryRun) {
				setPassword("");
				setOpen(false);
			}
		},
		onError: (err) => {
			toast.error("Синхронизация Keycloak не удалась", {
				description: apiErrorMessage(err),
			});
		},
	});

	const restoreMutation = useMutation({
		mutationFn: (dryRun: boolean) =>
			apiClient<RestoreResult>({
				url: "/v2/admin/keycloak-role-sync/restore",
				method: "POST",
				data: {
					adminUsername: username,
					adminPassword: password,
					dryRun,
					...connection,
					backup: backupPayload,
					include: {
						realmRoles: restoreInclude.realmRoles,
						groups: restoreInclude.groups,
						groupAttributes: restoreInclude.groupAttributes,
						groupRealmRoles: restoreInclude.groupRealmRoles,
						users: restoreInclude.users,
						userGroups: restoreInclude.userGroups,
						userRealmRoles: restoreInclude.userRealmRoles,
					},
				},
			}),
		onSuccess: (data, dryRun) => {
			setLastRestore(data);
			toast.success(
				dryRun
					? `Dry-run restore: ${summarizeRestore(data)}`
					: `Restore применён: ${summarizeRestore(data)}`,
			);
			if (!dryRun) {
				setPassword("");
				setOpen(false);
			}
		},
		onError: (err) => {
			toast.error("Восстановление Keycloak не удалось", {
				description: apiErrorMessage(err),
			});
		},
	});

	const pending =
		backupMutation.isPending ||
		syncMutation.isPending ||
		restoreMutation.isPending;
	const hasBackupSection =
		backupInclude.realmRoles || backupInclude.groups || backupInclude.users;
	const hasRestoreSection =
		restoreInclude.realmRoles ||
		restoreInclude.groups ||
		restoreInclude.users;
	const canSubmit = Boolean(
		username &&
			password &&
			keycloakUrl.trim() &&
			realm.trim() &&
			(mode !== "backup" || hasBackupSection) &&
			(mode !== "restore" || (hasRestoreSection && backupPayload)),
	);

	const changed =
		lastResult?.groupRoleChanges.filter(
			(c) => c.add.length || c.remove.length || c.status === "missing_group",
		) ?? [];

	const restoreChanged =
		lastRestore == null
			? []
			: [
					...lastRestore.groupRoleChanges.filter(
						(c) =>
							c.add.length || c.remove.length || c.status === "missing_group",
					),
					...lastRestore.userGroupChanges.filter(
						(c) =>
							c.join.length || c.leave.length || c.status === "missing_user",
					),
					...lastRestore.userRoleChanges.filter(
						(c) =>
							c.add.length || c.remove.length || c.status === "missing_user",
					),
				];

	const openModal = (next: ModalMode) => {
		setMode(next);
		if (next === "restore") {
			setRestoreInclude(DEFAULT_RESTORE_INCLUDE);
		}
		setOpen(true);
	};

	const envUrl = defaultsQuery.data?.keycloakUrl || "—";

	const dialogTitle =
		mode === "backup"
			? "Бекап Keycloak (скачать JSON)"
			: mode === "restore"
				? "Восстановление Keycloak из бекапа"
				: "Синхронизация ролей Keycloak";

	return (
		<>
			<Flex flexDirection="column" gap={8}>
				<Typography variant="h6">Keycloak · роли F-05</Typography>
				<Typography variant="body2" color="text.secondary">
					Сначала скачайте бекап, затем dry-run / apply. При откате — загрузка
					того же JSON. Выставляет realm roles канонических групп по матрице
					F-05. Latin-дубли (/DE vs /de) не трогаем. Креды admin только в
					модалке. Доступно ролям appadmin / sacfg.
				</Typography>
				<Alert severity="info">
					URL из env Nest: <code>{envUrl}</code>
					{defaultsQuery.isError ? " (не удалось загрузить defaults)" : null}. В
					модалке sync можно переопределить URL и{" "}
					<strong>префикс стенда</strong> (<code>test_</code> /{" "}
					<code>dev_</code> / <code>prod_</code>
					): AD-имя всегда с <code>sum_</code>.
				</Alert>
				<Alert severity="warning">
					После apply / restore — re-login пользователей. Restore правит только
					<code> anketa_*</code> на группах и (опционально) membership /
					direct-роли юзеров. Пароли, clients, IdP не входят в бекап.
				</Alert>
				<Flex gap={12} wrap="wrap">
					<Button variant="contained" onClick={() => openModal("backup")}>
						Создать бекап Keycloak…
					</Button>
					<Button variant="outlined" onClick={() => openModal("sync")}>
						Синхронизировать роли…
					</Button>
					<Button
						variant="outlined"
						color="warning"
						onClick={() => openModal("restore")}
					>
						Восстановить из бекапа…
					</Button>
				</Flex>
				{lastBackup ? (
					<Typography variant="body2" color="text.secondary" component="div">
						Последний бекап: {lastBackup.exportedAt} · {lastBackup.realm} ·{" "}
						{lastBackup.counts.users} users / {lastBackup.counts.groups} groups
						/ {lastBackup.counts.anketaRoles} anketa roles
						<br />
						URL: {lastBackup.keycloakUrl}
					</Typography>
				) : null}
				{lastResult ? (
					<Typography variant="body2" color="text.secondary" component="div">
						Последний sync ({lastResult.dryRun ? "dry-run" : "apply"}):{" "}
						{lastResult.realm} @ {lastResult.keycloakUrl}
						<br />
						role changes: {changed.length}, roles created:{" "}
						{lastResult.rolesCreated.join(", ") || "—"}, groups created:{" "}
						{lastResult.groupsCreated?.join(", ") || "—"}
					</Typography>
				) : null}
				{lastRestore ? (
					<Typography variant="body2" color="text.secondary" component="div">
						Последний restore ({lastRestore.dryRun ? "dry-run" : "apply"}):{" "}
						{lastRestore.realm} @ {lastRestore.keycloakUrl}
						<br />
						{summarizeRestore(lastRestore)}
						{lastRestore.backupExportedAt
							? ` · backup ${lastRestore.backupExportedAt}`
							: ""}
						{lastRestore.warnings?.length
							? ` · warnings: ${lastRestore.warnings.length}`
							: ""}
					</Typography>
				) : null}
			</Flex>

			<input
				ref={fileInputRef}
				type="file"
				accept="application/json,.json"
				hidden
				onChange={(e) => {
					const file = e.target.files?.[0] ?? null;
					void onBackupFile(file);
					e.target.value = "";
				}}
			/>

			<Dialog
				open={open}
				onClose={() => !pending && setOpen(false)}
				fullWidth
				maxWidth="sm"
			>
				<DialogTitle>{dialogTitle}</DialogTitle>
				<DialogContent>
					<Spacer space={8} />
					<Typography variant="body2" color="text.secondary">
						Учётка Keycloak Admin API (логин admin). Пароль не сохраняется. Base
						URL — без trailing slash, часто с <code>/auth</code>. Токен берётся
						из realm <code>master</code> на сервере.
					</Typography>
					{mode === "sync" && !backupDoneInSession ? (
						<>
							<Spacer space={12} />
							<Alert severity="warning">
								Рекомендуется сначала «Создать бекап». Apply без бекапа можно,
								но откат будет сложнее.
							</Alert>
						</>
					) : null}
					{mode === "restore" ? (
						<>
							<Spacer space={12} />
							<Alert severity="warning">
								Загрузите JSON, скачанный кнопкой «Создать бекап». Restore
								выравнивает <code>anketa_*</code> и membership по снимку; юзеров
								не создаёт и пароли не трогает.
							</Alert>
						</>
					) : null}
					<Spacer space={16} />
					<Flex flexDirection="column" gap={12}>
						<TextField
							label="Keycloak URL"
							value={keycloakUrl}
							onChange={(e) => setKeycloakUrl(e.target.value)}
							placeholder="https://keycloak…/auth"
							helperText={
								defaultsQuery.data?.keycloakUrl
									? `Env: ${defaultsQuery.data.keycloakUrl}`
									: "Из KEYCLOAK_URL Nest или свой reachable URL"
							}
							fullWidth
							disabled={pending}
						/>
						<TextField
							label="Realm (анкета)"
							value={realm}
							onChange={(e) => setRealm(e.target.value)}
							fullWidth
							disabled={pending}
						/>
						{mode === "sync" ? (
							<Autocomplete
								freeSolo
								selectOnFocus
								clearOnBlur={false}
								handleHomeEndKeys
								options={STAND_PREFIX_OPTIONS}
								value={
									STAND_PREFIX_OPTIONS.find((o) => o.value === standPrefix) ??
									standPrefix
								}
								onChange={(_, next) => {
									if (next == null) {
										setStandPrefix("");
										return;
									}
									setStandPrefix(
										typeof next === "string" ? next : next.value,
									);
								}}
								onInputChange={(_, next, reason) => {
									if (reason === "input" || reason === "clear") {
										setStandPrefix(next);
									}
								}}
								getOptionLabel={(opt) =>
									typeof opt === "string" ? opt : opt.label
								}
								isOptionEqualToValue={(a, b) => {
									const av = typeof a === "string" ? a : a.value;
									const bv = typeof b === "string" ? b : b.value;
									return av === bv;
								}}
								renderInput={(params) => (
									<TextField
										{...params}
										label="Префикс стенда (AD)"
										placeholder="test_ | dev_ | prod_ | пусто"
										helperText="Выбор или ручной ввод. ИФТ: test_ → /admin_it/test_sum_appadmin. Пусто → /admin_it/sum_appadmin."
									/>
								)}
								fullWidth
								disabled={pending}
							/>
						) : null}
						{mode === "restore" ? (
							<Flex flexDirection="column" gap={8}>
								<Flex gap={8} alignItems="center" wrap="wrap">
									<Button
										variant="outlined"
										disabled={pending}
										onClick={() => fileInputRef.current?.click()}
									>
										Выбрать JSON…
									</Button>
									<Typography variant="body2" color="text.secondary">
										{backupFileName || "файл не выбран"}
									</Typography>
								</Flex>
								{backupPayload ? (
									<Typography variant="caption" color="text.secondary">
										{(backupPayload.exportedAt as string) || "—"} · groups{" "}
										{Array.isArray(backupPayload.groups)
											? backupPayload.groups.length
											: 0}{" "}
										· users{" "}
										{Array.isArray(backupPayload.users)
											? backupPayload.users.length
											: 0}{" "}
										· realmRoles{" "}
										{Array.isArray(backupPayload.realmRoles)
											? backupPayload.realmRoles.length
											: 0}
									</Typography>
								) : null}
								<Typography variant="subtitle2">Секции restore</Typography>
								<FormControlLabel
									control={
										<Checkbox
											checked={restoreInclude.realmRoles}
											onChange={(e) =>
												setInclude("restore", "realmRoles", e.target.checked)
											}
											disabled={pending}
										/>
									}
									label="Создать недостающие realm roles"
								/>
								<FormControlLabel
									control={
										<Checkbox
											checked={restoreInclude.groups}
											onChange={(e) =>
												setInclude("restore", "groups", e.target.checked)
											}
											disabled={pending}
										/>
									}
									label="Groups (path + anketa_* roles)"
								/>
								<Flex
									flexDirection="column"
									gap={0}
									style={{ marginLeft: 24 }}
								>
									<FormControlLabel
										control={
											<Checkbox
												size="small"
												checked={restoreInclude.groupRealmRoles}
												onChange={(e) =>
													setInclude(
														"restore",
														"groupRealmRoles",
														e.target.checked,
													)
												}
												disabled={pending || !restoreInclude.groups}
											/>
										}
										label="выровнять anketa_* на группах"
									/>
									<FormControlLabel
										control={
											<Checkbox
												size="small"
												checked={restoreInclude.groupAttributes}
												onChange={(e) =>
													setInclude(
														"restore",
														"groupAttributes",
														e.target.checked,
													)
												}
												disabled={pending || !restoreInclude.groups}
											/>
										}
										label="атрибуты групп (осторожно)"
									/>
								</Flex>
								<FormControlLabel
									control={
										<Checkbox
											checked={restoreInclude.users}
											onChange={(e) =>
												setInclude("restore", "users", e.target.checked)
											}
											disabled={pending}
										/>
									}
									label="Users (membership / direct anketa_*)"
								/>
								<Flex
									flexDirection="column"
									gap={0}
									style={{ marginLeft: 24 }}
								>
									<FormControlLabel
										control={
											<Checkbox
												size="small"
												checked={restoreInclude.userGroups}
												onChange={(e) =>
													setInclude("restore", "userGroups", e.target.checked)
												}
												disabled={pending || !restoreInclude.users}
											/>
										}
										label="группы юзеров (join/leave по снимку)"
									/>
									<FormControlLabel
										control={
											<Checkbox
												size="small"
												checked={restoreInclude.userRealmRoles}
												onChange={(e) =>
													setInclude(
														"restore",
														"userRealmRoles",
														e.target.checked,
													)
												}
												disabled={pending || !restoreInclude.users}
											/>
										}
										label="direct anketa_* юзеров"
									/>
								</Flex>
								{!hasRestoreSection ? (
									<Typography variant="caption" color="error">
										Выберите хотя бы одну секцию
									</Typography>
								) : null}
								{!backupPayload ? (
									<Typography variant="caption" color="error">
										Загрузите JSON бекапа
									</Typography>
								) : null}
							</Flex>
						) : null}
						{mode === "backup" ? (
							<Flex flexDirection="column" gap={4}>
								<Typography variant="subtitle2">Секции бекапа</Typography>
								<Typography variant="caption" color="text.secondary">
									«Realm roles» — справочник ролей realm. «Roles групп /
									юзеров» — кому эти роли назначены.
								</Typography>
								<FormControlLabel
									control={
										<Checkbox
											checked={backupInclude.realmRoles}
											onChange={(e) =>
												setInclude("backup", "realmRoles", e.target.checked)
											}
											disabled={pending}
										/>
									}
									label={
										<span>
											Realm roles — справочник
											<Typography
												component="span"
												variant="caption"
												color="text.secondary"
												display="block"
											>
												какие роли существуют в realm (имя, description,
												composite), не назначения
											</Typography>
										</span>
									}
								/>
								<FormControlLabel
									control={
										<Checkbox
											checked={backupInclude.groups}
											onChange={(e) =>
												setInclude("backup", "groups", e.target.checked)
											}
											disabled={pending}
										/>
									}
									label="Groups (path / name)"
								/>
								<Flex flexDirection="column" gap={0} style={{ marginLeft: 24 }}>
									<FormControlLabel
										control={
											<Checkbox
												size="small"
												checked={backupInclude.groupAttributes}
												onChange={(e) =>
													setInclude(
														"backup",
														"groupAttributes",
														e.target.checked,
													)
												}
												disabled={pending || !backupInclude.groups}
											/>
										}
										label="атрибуты групп"
									/>
									<FormControlLabel
										control={
											<Checkbox
												size="small"
												checked={backupInclude.groupRealmRoles}
												onChange={(e) =>
													setInclude(
														"backup",
														"groupRealmRoles",
														e.target.checked,
													)
												}
												disabled={pending || !backupInclude.groups}
											/>
										}
										label={
											<span>
												realm roles групп
												<Typography
													component="span"
													variant="caption"
													color="text.secondary"
													display="block"
												>
													роли, повешенные на группу (юзеры наследуют через
													membership)
												</Typography>
											</span>
										}
									/>
									<FormControlLabel
										control={
											<Checkbox
												size="small"
												checked={backupInclude.groupMembers}
												onChange={(e) =>
													setInclude("backup", "groupMembers", e.target.checked)
												}
												disabled={pending || !backupInclude.groups}
											/>
										}
										label="участники групп"
									/>
								</Flex>
								<FormControlLabel
									control={
										<Checkbox
											checked={backupInclude.users}
											onChange={(e) =>
												setInclude("backup", "users", e.target.checked)
											}
											disabled={pending}
										/>
									}
									label="Users"
								/>
								<Flex flexDirection="column" gap={0} style={{ marginLeft: 24 }}>
									<FormControlLabel
										control={
											<Checkbox
												size="small"
												checked={backupInclude.userProfile}
												onChange={(e) =>
													setInclude("backup", "userProfile", e.target.checked)
												}
												disabled={pending || !backupInclude.users}
											/>
										}
										label="профиль (имя, email, federation…)"
									/>
									<FormControlLabel
										control={
											<Checkbox
												size="small"
												checked={backupInclude.userAttributes}
												onChange={(e) =>
													setInclude(
														"backup",
														"userAttributes",
														e.target.checked,
													)
												}
												disabled={pending || !backupInclude.users}
											/>
										}
										label="атрибуты юзеров"
									/>
									<FormControlLabel
										control={
											<Checkbox
												size="small"
												checked={backupInclude.userGroups}
												onChange={(e) =>
													setInclude("backup", "userGroups", e.target.checked)
												}
												disabled={pending || !backupInclude.users}
											/>
										}
										label="группы юзеров"
									/>
									<FormControlLabel
										control={
											<Checkbox
												size="small"
												checked={backupInclude.userRealmRoles}
												onChange={(e) =>
													setInclude(
														"backup",
														"userRealmRoles",
														e.target.checked,
													)
												}
												disabled={pending || !backupInclude.users}
											/>
										}
										label={
											<span>
												realm roles юзеров
												<Typography
													component="span"
													variant="caption"
													color="text.secondary"
													display="block"
												>
													какие роли назначены юзеру (direct + effective через
													группы)
												</Typography>
											</span>
										}
									/>
								</Flex>
								{!hasBackupSection ? (
									<Typography variant="caption" color="error">
										Выберите хотя бы одну секцию
									</Typography>
								) : null}
							</Flex>
						) : null}
						<TextField
							label="Admin username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							autoComplete="username"
							fullWidth
							disabled={pending}
						/>
						<TextField
							label="Admin password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoComplete="current-password"
							fullWidth
							disabled={pending}
						/>
					</Flex>
					{mode === "sync" && lastResult?.dryRun ? (
						<>
							<Spacer space={16} />
							<Alert severity="info">
								Dry-run: изменений ролей {changed.length}. Если ок — Apply.
							</Alert>
						</>
					) : null}
					{mode === "restore" && lastRestore?.dryRun ? (
						<>
							<Spacer space={16} />
							<Alert severity="info">
								Dry-run restore: изменений {restoreChanged.length}.{" "}
								{summarizeRestore(lastRestore)}. Если ок — Apply.
							</Alert>
						</>
					) : null}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)} disabled={pending}>
						Отмена
					</Button>
					{mode === "backup" ? (
						<Button
							variant="contained"
							disabled={pending || !canSubmit}
							onClick={() => backupMutation.mutate()}
						>
							Скачать бекап
						</Button>
					) : mode === "restore" ? (
						<>
							<Button
								variant="outlined"
								disabled={pending || !canSubmit}
								onClick={() => restoreMutation.mutate(true)}
							>
								Dry-run
							</Button>
							<Button
								variant="contained"
								color="warning"
								disabled={pending || !canSubmit}
								onClick={() => restoreMutation.mutate(false)}
							>
								Apply restore
							</Button>
						</>
					) : (
						<>
							<Button
								variant="outlined"
								disabled={pending || !canSubmit}
								onClick={() => syncMutation.mutate(true)}
							>
								Dry-run
							</Button>
							<Button
								variant="contained"
								color="warning"
								disabled={pending || !canSubmit}
								onClick={() => syncMutation.mutate(false)}
							>
								Apply
							</Button>
						</>
					)}
				</DialogActions>
			</Dialog>
		</>
	);
}

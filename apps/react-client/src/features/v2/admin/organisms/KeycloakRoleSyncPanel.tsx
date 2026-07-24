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
import { useEffect, useState } from "react";

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

type ModalMode = "sync" | "backup";

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
	const [lastResult, setLastResult] = useState<SyncResult | null>(null);
	const [lastBackup, setLastBackup] = useState<BackupResult | null>(null);
	const [backupDoneInSession, setBackupDoneInSession] = useState(false);

	useEffect(() => {
		const d = defaultsQuery.data;
		if (!d) return;
		setKeycloakUrl((prev) => prev || d.keycloakUrl || "");
		setRealm((prev) => (prev === "cym" && d.realm ? d.realm : prev));
	}, [defaultsQuery.data]);

	const connection = connectionPayload({ keycloakUrl, realm });

	const setInclude = (key: keyof BackupInclude, value: boolean) => {
		setBackupInclude((prev) => {
			const next = { ...prev, [key]: value };
			if (key === "groups" && !value) {
				next.groupAttributes = false;
				next.groupRealmRoles = false;
				next.groupMembers = false;
			}
			if (key === "groups" && value) {
				next.groupAttributes = true;
				next.groupRealmRoles = true;
				next.groupMembers = true;
			}
			if (key === "users" && !value) {
				next.userProfile = false;
				next.userAttributes = false;
				next.userGroups = false;
				next.userRealmRoles = false;
			}
			if (key === "users" && value) {
				next.userProfile = true;
				next.userAttributes = true;
				next.userGroups = true;
				next.userRealmRoles = true;
			}
			return next;
		});
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

	const pending = backupMutation.isPending || syncMutation.isPending;
	const hasBackupSection =
		backupInclude.realmRoles || backupInclude.groups || backupInclude.users;
	const canSubmit = Boolean(
		username &&
			password &&
			keycloakUrl.trim() &&
			realm.trim() &&
			(mode !== "backup" || hasBackupSection),
	);

	const changed =
		lastResult?.groupRoleChanges.filter(
			(c) => c.add.length || c.remove.length || c.status === "missing_group",
		) ?? [];

	const openModal = (next: ModalMode) => {
		setMode(next);
		setOpen(true);
	};

	const envUrl = defaultsQuery.data?.keycloakUrl || "—";

	return (
		<>
			<Flex flexDirection="column" gap={8}>
				<Typography variant="h6">Keycloak · роли F-05</Typography>
				<Typography variant="body2" color="text.secondary">
					Сначала скачайте бекап, затем dry-run / apply. Выставляет realm roles
					канонических групп по матрице F-05. Latin-дубли с другим регистром
					(/DE vs /de) не трогаем. Креды admin только в модалке. Доступно ролям
					appadmin / sacfg.
				</Typography>
				<Alert severity="info">
					URL из env Nest: <code>{envUrl}</code>
					{defaultsQuery.isError ? " (не удалось загрузить defaults)" : null}. В
					модалке можно переопределить URL и <strong>префикс стенда</strong> (
					<code>test_</code> / <code>dev_</code> / <code>prod_</code>
					): AD-имя всегда с <code>sum_</code> — например{" "}
					<code>/admin_it/test_sum_appadmin</code>,{" "}
					<code>/sarep/test_sum_sarep_dadm</code> (+ канон{" "}
					<code>/appadmin</code>).
				</Alert>
				<Alert severity="warning">
					После apply — re-login пользователей. Кириллические{" "}
					<code>/departament/*</code> и case-дубли групп не трогаются.
					Бекап — снимок F-05 (секции выбираются чекбоксами), не полный export
					realm (пароли, clients, mappers, IdP не входят).
				</Alert>
				<Flex gap={12} wrap="wrap">
					<Button variant="contained" onClick={() => openModal("backup")}>
						Создать бекап Keycloak…
					</Button>
					<Button variant="outlined" onClick={() => openModal("sync")}>
						Синхронизировать роли…
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
			</Flex>

			<Dialog
				open={open}
				onClose={() => !pending && setOpen(false)}
				fullWidth
				maxWidth="sm"
			>
				<DialogTitle>
					{mode === "backup"
						? "Бекап Keycloak (скачать JSON)"
						: "Синхронизация ролей Keycloak"}
				</DialogTitle>
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
												setInclude("realmRoles", e.target.checked)
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
											onChange={(e) => setInclude("groups", e.target.checked)}
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
													setInclude("groupAttributes", e.target.checked)
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
													setInclude("groupRealmRoles", e.target.checked)
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
													setInclude("groupMembers", e.target.checked)
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
											onChange={(e) => setInclude("users", e.target.checked)}
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
													setInclude("userProfile", e.target.checked)
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
													setInclude("userAttributes", e.target.checked)
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
													setInclude("userGroups", e.target.checked)
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
													setInclude("userRealmRoles", e.target.checked)
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

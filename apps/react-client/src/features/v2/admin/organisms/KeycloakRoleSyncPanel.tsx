import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
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

type SyncDefaults = {
	keycloakUrl: string;
	realm: string;
	adminRealm: string;
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
	adminRealm: string;
}) {
	return {
		keycloakUrl: fields.keycloakUrl.trim() || undefined,
		realm: fields.realm.trim() || undefined,
		adminRealm: fields.adminRealm.trim() || undefined,
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
	const [adminRealm, setAdminRealm] = useState("master");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [lastResult, setLastResult] = useState<SyncResult | null>(null);
	const [lastBackup, setLastBackup] = useState<BackupResult | null>(null);
	const [backupDoneInSession, setBackupDoneInSession] = useState(false);

	useEffect(() => {
		const d = defaultsQuery.data;
		if (!d) return;
		setKeycloakUrl((prev) => prev || d.keycloakUrl || "");
		setRealm((prev) => (prev === "cym" && d.realm ? d.realm : prev));
		setAdminRealm((prev) =>
			prev === "master" && d.adminRealm ? d.adminRealm : prev,
		);
	}, [defaultsQuery.data]);

	const connection = connectionPayload({ keycloakUrl, realm, adminRealm });

	const backupMutation = useMutation({
		mutationFn: () =>
			apiClient<BackupResult & Record<string, unknown>>({
				url: "/v2/admin/keycloak-role-sync/backup",
				method: "POST",
				data: {
					adminUsername: username,
					adminPassword: password,
					...connection,
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
	const canSubmit = Boolean(
		username && password && keycloakUrl.trim() && realm.trim() && adminRealm.trim(),
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
					(/DE vs /de) не трогаем. Креды admin только в модалке. Доступно
					ролям appadmin / sacfg.
				</Typography>
				<Alert severity="info">
					URL из env Nest: <code>{envUrl}</code>
					{defaultsQuery.isError
						? " (не удалось загрузить defaults)"
						: null}
					. В модалке можно переопределить, если из пода API DNS/сеть до
					Keycloak другая.
				</Alert>
				<Alert severity="warning">
					После apply — re-login пользователей. Кириллические{" "}
					<code>/departament/*</code> и case-дубли групп не трогаются.
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
						Учётка Admin API (обычно realm master / admin-cli). Пароль не
						сохраняется. Base URL — без trailing slash, часто с{" "}
						<code>/auth</code>.
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
						<TextField
							label="Admin realm (token)"
							value={adminRealm}
							onChange={(e) => setAdminRealm(e.target.value)}
							helperText="Обычно master — для admin-cli password grant"
							fullWidth
							disabled={pending}
						/>
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

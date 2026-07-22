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
import { useState } from "react";

type SyncStatus = { enabled: boolean };

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

export function KeycloakRoleSyncPanel() {
	const statusQuery = useQuery({
		queryKey: ["v2-keycloak-role-sync-status"],
		queryFn: () =>
			apiClient<SyncStatus>({
				url: "/v2/admin/keycloak-role-sync/status",
				method: "GET",
			}),
		staleTime: 60_000,
	});

	const [open, setOpen] = useState(false);
	const [mode, setMode] = useState<ModalMode>("sync");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [lastResult, setLastResult] = useState<SyncResult | null>(null);
	const [lastBackup, setLastBackup] = useState<BackupResult | null>(null);
	const [backupDoneInSession, setBackupDoneInSession] = useState(false);

	const backupMutation = useMutation({
		mutationFn: () =>
			apiClient<BackupResult & Record<string, unknown>>({
				url: "/v2/admin/keycloak-role-sync/backup",
				method: "POST",
				data: {
					adminUsername: username,
					adminPassword: password,
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

	if (statusQuery.isLoading) return null;
	if (!statusQuery.data?.enabled) return null;

	const changed =
		lastResult?.groupRoleChanges.filter(
			(c) => c.add.length || c.remove.length || c.status === "missing_group",
		) ?? [];

	const openModal = (next: ModalMode) => {
		setMode(next);
		setOpen(true);
	};

	return (
		<>
			<Flex flexDirection="column" gap={8}>
				<Typography variant="h6">Keycloak · роли F-05 (ИФТ)</Typography>
				<Typography variant="body2" color="text.secondary">
					Сначала скачайте бекап, затем dry-run / apply. Выставляет realm roles
					канонических групп по матрице F-05. Latin-дубли с другим регистром
					(/DE vs /de) не трогаем. Креды admin только в модалке. Нужен{" "}
					<code>KEYCLOAK_ADMIN_SYNC_ENABLED=true</code>.
				</Typography>
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

			<Dialog open={open} onClose={() => !pending && setOpen(false)} fullWidth maxWidth="sm">
				<DialogTitle>
					{mode === "backup"
						? "Бекап Keycloak (скачать JSON)"
						: "Синхронизация ролей Keycloak"}
				</DialogTitle>
				<DialogContent>
					<Spacer space={8} />
					<Typography variant="body2" color="text.secondary">
						Учётка Admin API (обычно realm master / admin-cli). Пароль не
						сохраняется.
					</Typography>
					{mode === "sync" && !backupDoneInSession ? (
						<>
							<Spacer space={12} />
							<Alert severity="warning">
								Рекомендуется сначала «Создать бекап». Apply без бекапа можно,
								но откат на ИФТ будет сложнее.
							</Alert>
						</>
					) : null}
					<Spacer space={16} />
					<Flex flexDirection="column" gap={12}>
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
							disabled={!username.trim() || !password || pending}
							onClick={() => backupMutation.mutate()}
						>
							{backupMutation.isPending ? "Выгрузка…" : "Скачать бекап"}
						</Button>
					) : (
						<>
							<Button
								variant="outlined"
								disabled={!username.trim() || !password || pending}
								onClick={() => syncMutation.mutate(true)}
							>
								{syncMutation.isPending ? "…" : "Dry-run"}
							</Button>
							<Button
								variant="contained"
								color="warning"
								disabled={!username.trim() || !password || pending}
								onClick={() => syncMutation.mutate(false)}
								title={
									backupDoneInSession
										? undefined
										: "Сначала лучше скачать бекап"
								}
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

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import {
	useResetV2RoleCompatSetting,
	useUpdateV2RoleCompatSetting,
	useV2RoleCompatSetting,
} from "@react-client/common/api/queries/v2-runtime-settings";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { Flex } from "@react-client/common/primitives/Flex";
import { toast } from "@react-client/common/toasts";

export function RoleCompatSettingsPanel() {
	const { data, isLoading, isError } = useV2RoleCompatSetting();
	const update = useUpdateV2RoleCompatSetting();
	const reset = useResetV2RoleCompatSetting();
	const pending = update.isPending || reset.isPending;

	const adminIt = data?.adminItAsAppadmin ?? true;
	const nestedLeads = data?.allowNestedLeadGroups ?? true;
	const hasOverride =
		data?.adminItAsAppadminOverride != null ||
		data?.allowNestedLeadGroupsOverride != null;

	return (
		<Flex flexDirection="column" gap={8}>
			<Typography variant="h6">Совместимость ролей (п-прод)</Typography>
			<Typography variant="body2" color="text.secondary">
				Тогглы для всего бэкенда: доменные роли из Keycloak groups и эталон
				sync матрицы. После включения nested-лидов прогоните sync ролей
				Keycloak, чтобы навесить approve/complete/delete на{" "}
				<code>/de/de_lead</code> и <code>/modelops/modelops_lead</code>.
			</Typography>
			{isError ? (
				<Alert severity="error">Не удалось загрузить настройку</Alert>
			) : null}
			<FormControlLabel
				control={
					<Switch
						checked={adminIt}
						disabled={isLoading || pending || isError}
						onChange={(_, checked) =>
							update.mutate(
								{ adminItAsAppadmin: checked },
								{
									onSuccess: () =>
										toast.success(
											checked
												? "Учёт /admin_it как appadmin включён"
												: "Учёт /admin_it как appadmin выключен",
										),
									onError: (err) =>
										toast.error("Не удалось сохранить", {
											description: apiErrorMessage(err),
										}),
								},
							)
						}
						inputProps={{
							"aria-label": "Смотреть /admin_it как appadmin",
						}}
					/>
				}
				label="Смотреть /admin_it как прикладного админа (п-прод)"
			/>
			<Typography variant="body2" color="text.secondary">
				Env <code>ADMIN_IT_AS_APPADMIN</code>={" "}
				{(data?.adminItAsAppadminEnvDefault ?? true) ? "true" : "false"}{" "}
				(default ON). Leaf <code>/admin_it/{"{stand}"}sum_appadmin</code> и
				сама папка <code>/admin_it</code> дают доменную роль{" "}
				<code>appadmin</code>. Sync при включении держит{" "}
				<code>/admin_it</code> без лишних anketa-ролей (create/edit/export).
			</Typography>
			<FormControlLabel
				control={
					<Switch
						checked={nestedLeads}
						disabled={isLoading || pending || isError}
						onChange={(_, checked) =>
							update.mutate(
								{ allowNestedLeadGroups: checked },
								{
									onSuccess: () =>
										toast.success(
											checked
												? "Nested lead-группы включены"
												: "Только top-level lead-группы",
										),
									onError: (err) =>
										toast.error("Не удалось сохранить", {
											description: apiErrorMessage(err),
										}),
								},
							)
						}
						inputProps={{
							"aria-label": "Разрешить nested lead-группы",
						}}
					/>
				}
				label="Смотреть не только top-level лидов (/de/de_lead, …)"
			/>
			<Typography variant="body2" color="text.secondary">
				Env <code>ALLOW_NESTED_LEAD_GROUPS</code>={" "}
				{(data?.allowNestedLeadGroupsEnvDefault ?? true) ? "true" : "false"}{" "}
				(default ON). UI дополнительно подразумевает realm-permissions лида
				по доменной роли (approve/complete/delete), даже если nested-группа в
				KK ещё без них.
			</Typography>
			<Button
				variant="outlined"
				size="small"
				disabled={!hasOverride || pending}
				onClick={() =>
					reset.mutate(undefined, {
						onSuccess: () =>
							toast.success("Override сброшен — снова используется env"),
						onError: (err) =>
							toast.error("Не удалось сбросить override", {
								description: apiErrorMessage(err),
							}),
					})
				}
			>
				Сбросить к env default
			</Button>
		</Flex>
	);
}

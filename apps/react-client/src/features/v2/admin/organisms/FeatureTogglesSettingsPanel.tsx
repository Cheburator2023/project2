import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import {
	useResetV2DadmProgramManagerSetting,
	useResetV2EditLockHardDisableSetting,
	useUpdateV2DadmProgramManagerSetting,
	useUpdateV2EditLockHardDisableSetting,
	useV2DadmProgramManagerSetting,
	useV2EditLockHardDisableSetting,
} from "@react-client/common/api/queries/v2-runtime-settings";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { Flex } from "@react-client/common/primitives/Flex";
import { toast } from "@react-client/common/toasts";

export function FeatureTogglesSettingsPanel() {
	const dadm = useV2DadmProgramManagerSetting();
	const updateDadm = useUpdateV2DadmProgramManagerSetting();
	const resetDadm = useResetV2DadmProgramManagerSetting();
	const dadmPending = updateDadm.isPending || resetDadm.isPending;

	const dadmEnabled = dadm.data?.enabled ?? true;
	const dadmEnvDefault = dadm.data?.envDefaultEnabled ?? true;
	const dadmHasOverride = dadm.data?.override != null;

	const hardDisable = useV2EditLockHardDisableSetting();
	const updateHardDisable = useUpdateV2EditLockHardDisableSetting();
	const resetHardDisable = useResetV2EditLockHardDisableSetting();
	const hardDisablePending =
		updateHardDisable.isPending || resetHardDisable.isPending;

	const hardDisableEnabled = hardDisable.data?.enabled ?? false;
	const hardDisableEnvDefault = hardDisable.data?.envDefaultEnabled ?? false;
	const hardDisableHasOverride = hardDisable.data?.override != null;

	return (
		<Flex flexDirection="column" gap={16}>
			<Flex flexDirection="column" gap={8}>
				<Typography variant="h6">Менеджер программ ДАДМ</Typography>
				<Typography variant="body2" color="text.secondary">
					Утверждение оценки («Утверждена»), режимы реестра «Актуальные» /
					«Утверждённые», деактивация утверждённых при удалении и исторические
					срезы версий. По умолчанию включено.
				</Typography>
				{dadm.isError ? (
					<Alert severity="error">Не удалось загрузить настройку</Alert>
				) : null}
				<FormControlLabel
					control={
						<Switch
							checked={dadmEnabled}
							disabled={dadm.isLoading || dadmPending || dadm.isError}
							onChange={(_, checked) =>
								updateDadm.mutate(checked, {
									onSuccess: () =>
										toast.success(
											checked
												? "Функционал менеджера программ ДАДМ включён"
												: "Функционал менеджера программ ДАДМ выключен",
										),
									onError: (err) =>
										toast.error("Не удалось сохранить", {
											description: apiErrorMessage(err),
										}),
								})
							}
							inputProps={{
								"aria-label": "Функционал менеджера программ ДАДМ",
							}}
						/>
					}
					label="Включить функционал менеджера программ ДАДМ"
				/>
				<Typography variant="body2" color="text.secondary">
					Default из env Nest:{" "}
					<code>
						DADM_PROGRAM_MANAGER_ENABLED=
						{dadmEnvDefault ? "true" : "false"}
					</code>{" "}
					→ фича {dadmEnvDefault ? "включена" : "выключена"}
					{dadmHasOverride ? " · сейчас задан override из админки" : ""}.
				</Typography>
				<Button
					variant="outlined"
					size="small"
					disabled={!dadmHasOverride || dadmPending}
					onClick={() =>
						resetDadm.mutate(undefined, {
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

			<Divider />

			<Flex flexDirection="column" gap={8}>
				<Typography variant="h6">
					Блокировка открытия из реестра при чужом редактировании
				</Typography>
				<Typography variant="body2" color="text.secondary">
					Форма анкеты при чужом lock всегда открывается только для чтения.
					Этот переключатель дополнительно запрещает открытие из реестра
					(двойной клик / контекстное меню), пока lock не снимется (idle 3 мин /
					закрытие вкладки).
				</Typography>
				{hardDisable.isError ? (
					<Alert severity="error">Не удалось загрузить настройку</Alert>
				) : null}
				<FormControlLabel
					control={
						<Switch
							checked={hardDisableEnabled}
							disabled={
								hardDisable.isLoading ||
								hardDisablePending ||
								hardDisable.isError
							}
							onChange={(_, checked) =>
								updateHardDisable.mutate(checked, {
									onSuccess: () =>
										toast.success(
											checked
												? "Запрет открытия из реестра при чужом lock включён"
												: "Открытие из реестра разрешено — анкета откроется только для чтения",
										),
									onError: (err) =>
										toast.error("Не удалось сохранить", {
											description: apiErrorMessage(err),
										}),
								})
							}
							inputProps={{
								"aria-label":
									"Запретить открытие из реестра при чужом редактировании",
							}}
						/>
					}
					label="Запретить открытие из реестра, пока анкету редактирует другой"
				/>
				<Typography variant="body2" color="text.secondary">
					Default из env Nest:{" "}
					<code>
						EDIT_LOCK_HARD_DISABLE_ENABLED=
						{hardDisableEnvDefault ? "true" : "false"}
					</code>{" "}
					→ {hardDisableEnvDefault ? "включено" : "выключено"}
					{hardDisableHasOverride
						? " · сейчас задан override из админки"
						: ""}
					.
				</Typography>
				<Button
					variant="outlined"
					size="small"
					disabled={!hardDisableHasOverride || hardDisablePending}
					onClick={() =>
						resetHardDisable.mutate(undefined, {
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
		</Flex>
	);
}

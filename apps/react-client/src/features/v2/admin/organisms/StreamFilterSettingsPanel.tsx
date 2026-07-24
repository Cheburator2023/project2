import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import {
	useResetV2StreamFilterSetting,
	useUpdateV2StreamFilterSetting,
	useV2StreamFilterSetting,
} from "@react-client/common/api/queries/v2-runtime-settings";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { Flex } from "@react-client/common/primitives/Flex";
import { toast } from "@react-client/common/toasts";

export function StreamFilterSettingsPanel() {
	const { data, isLoading, isError } = useV2StreamFilterSetting();
	const update = useUpdateV2StreamFilterSetting();
	const reset = useResetV2StreamFilterSetting();
	const pending = update.isPending || reset.isPending;

	const enabled = data?.enabled ?? true;
	const envDefault = data?.envDefaultEnabled ?? true;
	const hasOverride = data?.override != null;

	return (
		<Flex flexDirection="column" gap={8}>
			<Typography variant="h6">Фильтр реестра по стриму</Typography>
			<Typography variant="body2" color="text.secondary">
				Для DS / DE / ModelOps (Level A) реестр на UI режется по
				департаменту/стриму из Keycloak groups. Лид-роли видят весь список.
			</Typography>
			{isError ? (
				<Alert severity="error">Не удалось загрузить настройку</Alert>
			) : null}
			<FormControlLabel
				control={
					<Switch
						checked={enabled}
						disabled={isLoading || pending || isError}
						onChange={(_, checked) =>
							update.mutate(checked, {
								onSuccess: () =>
									toast.success(
										checked
											? "Фильтр по стриму включён"
											: "Фильтр по стриму выключен",
									),
								onError: (err) =>
									toast.error("Не удалось сохранить", {
										description: apiErrorMessage(err),
									}),
							})
						}
						inputProps={{
							"aria-label": "Фильтр реестра анкет по стриму",
						}}
					/>
				}
				label="Фильтровать реестр анкет по стриму пользователя"
			/>
			<Typography variant="body2" color="text.secondary">
				Default из env Nest:{" "}
				<code>
					STREAM_FILTER_DISABLED=
					{envDefault ? "false" : "true"}
				</code>{" "}
				→ фильтр {envDefault ? "включён" : "выключен"}
				{hasOverride ? " · сейчас задан override из админки" : ""}.
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

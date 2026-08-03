import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import {
	useResetV2StreamFilterSetting,
	useResetV2WorkEstimatesStreamFilterSetting,
	useUpdateV2StreamFilterSetting,
	useUpdateV2WorkEstimatesStreamFilterSetting,
	useV2StreamFilterSetting,
	useV2WorkEstimatesStreamFilterSetting,
} from "@react-client/common/api/queries/v2-runtime-settings";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { Flex } from "@react-client/common/primitives/Flex";
import { toast } from "@react-client/common/toasts";
import { commonRoutes } from "@react-client/routing/common/routes";
import { Link as RouterLink } from "react-router";
import Divider from "@mui/material/Divider";

export function StreamFilterSettingsPanel() {
	const { data, isLoading, isError } = useV2StreamFilterSetting();
	const update = useUpdateV2StreamFilterSetting();
	const reset = useResetV2StreamFilterSetting();
	const pending = update.isPending || reset.isPending;

	const worksFilter = useV2WorkEstimatesStreamFilterSetting();
	const updateWorks = useUpdateV2WorkEstimatesStreamFilterSetting();
	const resetWorks = useResetV2WorkEstimatesStreamFilterSetting();
	const worksPending = updateWorks.isPending || resetWorks.isPending;

	const enabled = data?.enabled ?? true;
	const envDefault = data?.envDefaultEnabled ?? true;
	const hasOverride = data?.override != null;

	const worksEnabled = worksFilter.data?.enabled ?? true;
	const worksEnvDefault = worksFilter.data?.envDefaultEnabled ?? true;
	const worksHasOverride = worksFilter.data?.override != null;

	return (
		<Flex flexDirection="column" gap={8}>
			<Typography variant="h6">Фильтр реестра по стриму</Typography>
			<Typography variant="body2" color="text.secondary">
				Для DS (Level A) реестр на UI режется по департаменту/стриму из Keycloak
				groups. DE / ModelOps / их лиды по умолчанию видят все стримы (
				<code>DE_MODELOPS_VIEW_ALL_STREAMS</code>). Роль{" "}
				<code>stream_view_all</code> также отключает разделение.
			</Typography>
			<Button
				component={RouterLink}
				to={commonRoutes.adminV2Streams.rootPath}
				size="small"
				variant="text"
				sx={{ alignSelf: "flex-start", px: 0 }}
			>
				Реестр стримов
			</Button>
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
			<Typography variant="body2" color="text.secondary">
				<code>DE_MODELOPS_VIEW_ALL_STREAMS</code>={" "}
				{(data?.deModelopsViewAllStreams ?? true) ? "true" : "false"} (default
				ON) — DE / DE lead / ModelOps / ModelOps lead без разделения по стримам.
				Выкл.: <code>DE_MODELOPS_VIEW_ALL_STREAMS=false</code>. Bypass-роль:{" "}
				<code>/stream_view_all</code>.
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

			<Divider />

			<Typography variant="h6">Фильтр оценок работ по стриму</Typography>
			<Typography variant="body2" color="text.secondary">
				Для DS / DE / ModelOps и их лидов: скрывать оценки типовых/нетиповых
				работ в чужих стримах. Роли{" "}
				<code>sarep</code> / <code>architect</code> / <code>da</code> /{" "}
				<code>mntranlst</code> маскируются всегда (готовая логика). Пока
				исполнители и лиды видят все оценки — маскирование для них включится
				после снятия временного флага в коде.
			</Typography>
			{worksFilter.isError ? (
				<Alert severity="error">
					Не удалось загрузить настройку фильтра оценок работ
				</Alert>
			) : null}
			<FormControlLabel
				control={
					<Switch
						checked={worksEnabled}
						disabled={
							worksFilter.isLoading || worksPending || worksFilter.isError
						}
						onChange={(_, checked) =>
							updateWorks.mutate(checked, {
								onSuccess: () =>
									toast.success(
										checked
											? "Фильтр оценок работ по стриму включён"
											: "Фильтр оценок работ по стриму выключен",
									),
								onError: (err) =>
									toast.error("Не удалось сохранить", {
										description: apiErrorMessage(err),
									}),
							})
						}
						inputProps={{
							"aria-label": "Фильтр оценок работ по стриму",
						}}
					/>
				}
				label="Фильтровать оценки работ по стриму пользователя"
			/>
			<Typography variant="body2" color="text.secondary">
				Default из env Nest:{" "}
				<code>
					WORK_ESTIMATES_STREAM_FILTER_ENABLED=
					{worksEnvDefault ? "true" : "false"}
				</code>{" "}
				→ фильтр {worksEnvDefault ? "включён" : "выключен"}
				{worksHasOverride ? " · сейчас задан override из админки" : ""}.
			</Typography>
			<Button
				variant="outlined"
				size="small"
				disabled={!worksHasOverride || worksPending}
				onClick={() =>
					resetWorks.mutate(undefined, {
						onSuccess: () =>
							toast.success(
								"Override фильтра оценок сброшен — снова используется env",
							),
						onError: (err) =>
							toast.error("Не удалось сбросить override", {
								description: apiErrorMessage(err),
							}),
					})
				}
			>
				Сбросить фильтр оценок к env default
			</Button>
		</Flex>
	);
}

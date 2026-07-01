import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import Typography from "@mui/material/Typography";
import { useBackfillV2TypicalWorkCalculationLogic } from "@react-client/common/api/queries/v2-works";
import { isDevLikeEnvironment } from "@react-client/common/constants/dev";
import { toast } from "@react-client/common/toasts";
import { commonRoutes as routes } from "@react-client/routing/common/routes";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
	LOGIC_EXECUTOR_STREAMS,
	LOGIC_STREAM_GROUPS,
	type LogicWorksScope,
	type LogicWorksViewMode,
	scopeLabel,
} from "./typicalWorksAreas";
import { SegmentBar } from "@react-client/common/muiCustom/SegmentBar";

type LogicWorksToolbarProps = {
	viewMode: LogicWorksViewMode;
	scope: LogicWorksScope;
	onViewModeChange: (mode: LogicWorksViewMode) => void;
	onScopeChange: (scope: LogicWorksScope) => void;
	onCreateWork: () => void;
};

const VIEW_SEGMENTS: Array<{ id: LogicWorksViewMode; label: string }> = [
	{ id: "streams", label: "По стримам" },
	{ id: "matrix", label: "Матрица" },
	{ id: "catalog", label: "Справочник работ" },
];

export function LogicWorksToolbar({
	viewMode,
	scope,
	onViewModeChange,
	onScopeChange,
	onCreateWork,
}: LogicWorksToolbarProps) {
	const navigate = useNavigate();
	const anchorRef = useRef<HTMLButtonElement>(null);
	const [pickerOpen, setPickerOpen] = useState(false);
	const backfillMutation = useBackfillV2TypicalWorkCalculationLogic();
	const showBackfill = isDevLikeEnvironment();

	return (
		<Box
			sx={{
				flexShrink: 0,
				display: "flex",
				alignItems: "center",
				gap: 1.5,
				flexWrap: "wrap",
				px: 2.25,
				py: 1.4,
				borderBottom: "1px solid #e6e8ee",
				bgcolor: "#fff",
			}}
		>
			<SegmentBar
				segments={VIEW_SEGMENTS}
				value={viewMode}
				onChange={onViewModeChange}
			/>

			{viewMode === "streams" ? (
				<>
					<Button
						ref={anchorRef}
						onClick={() => setPickerOpen((v) => !v)}
						sx={{
							textTransform: "none",
							height: 36,
							minWidth: 240,
							px: 1.5,
							border: "1px solid #dfe2ea",
							borderRadius: "9px",
							bgcolor: "#fff",
							color: "#1d2435",
							justifyContent: "flex-start",
							gap: 1,
						}}
					>
						<Typography component="span" sx={{ fontSize: 11, color: "#8a93a3" }}>
							Область:
						</Typography>
						<Typography
							component="span"
							sx={{
								flex: 1,
								fontSize: 13,
								fontWeight: 600,
								textAlign: "left",
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
							}}
						>
							{scopeLabel(scope)}
						</Typography>
						<Typography component="span" sx={{ fontSize: 11, color: "#aab1c0" }}>
							▾
						</Typography>
					</Button>
					<Popper
						open={pickerOpen}
						anchorEl={anchorRef.current}
						placement="bottom-start"
						sx={{ zIndex: 40 }}
					>
						<ClickAwayListener onClickAway={() => setPickerOpen(false)}>
							<Paper
								elevation={8}
								sx={{
									mt: 0.75,
									width: 320,
									maxHeight: 380,
									overflow: "auto",
									borderRadius: "11px",
									border: "1px solid #e1e5ec",
									p: 0.9,
								}}
							>
								<Typography
									sx={{
										fontSize: 10,
										fontWeight: 700,
										letterSpacing: "0.04em",
										textTransform: "uppercase",
										color: "#aab1c0",
										px: 1.1,
										py: 0.75,
									}}
								>
									Группы стримов (ролёвка)
								</Typography>
								<MenuList dense disablePadding>
									{LOGIC_STREAM_GROUPS.map((group) => {
										const selected =
											scope.kind === "group" && scope.groupId === group.id;
										return (
											<MenuItem
												key={group.id}
												selected={selected}
												onClick={() => {
													onScopeChange({ kind: "group", groupId: group.id });
													setPickerOpen(false);
												}}
												sx={{ borderRadius: 1, py: 1 }}
											>
												<Box sx={{ flex: 1, minWidth: 0 }}>
													<Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
														{group.name}
													</Typography>
													<Typography sx={{ fontSize: 10.5, color: "#aab1c0" }}>
														{group.streams.length} стрима
													</Typography>
												</Box>
												{selected ? (
													<Typography sx={{ color: "#2f6bd8", fontSize: 14 }}>
														✓
													</Typography>
												) : null}
											</MenuItem>
										);
									})}
								</MenuList>
								<Typography
									sx={{
										fontSize: 10,
										fontWeight: 700,
										letterSpacing: "0.04em",
										textTransform: "uppercase",
										color: "#aab1c0",
										px: 1.1,
										py: 0.75,
										mt: 0.5,
										borderTop: "1px solid #f0f1f5",
									}}
								>
									Отдельные стримы
								</Typography>
								<MenuList dense disablePadding>
									{LOGIC_EXECUTOR_STREAMS.map((stream) => {
										const selected =
											scope.kind === "stream" && scope.stream === stream;
										return (
											<MenuItem
												key={stream}
												selected={selected}
												onClick={() => {
													onScopeChange({ kind: "stream", stream });
													setPickerOpen(false);
												}}
												sx={{ borderRadius: 1, py: 0.9 }}
											>
												<Box
													sx={{
														width: 8,
														height: 8,
														borderRadius: "2px",
														bgcolor: stream.includes("Источник")
															? "#1f8a4d"
															: stream.includes("Контроль")
																? "#7c5cd6"
																: "#2f6bd8",
														mr: 1,
													}}
												/>
												<Typography sx={{ flex: 1, fontSize: 12.5 }}>
													{stream}
												</Typography>
												{selected ? (
													<Typography sx={{ color: "#2f6bd8", fontSize: 13 }}>
														✓
													</Typography>
												) : null}
											</MenuItem>
										);
									})}
								</MenuList>
							</Paper>
						</ClickAwayListener>
					</Popper>
				</>
			) : null}

			<Box sx={{ flexGrow: 1 }} />

			{showBackfill ? (
				<Button
					disabled={backfillMutation.isPending}
					title="Скомпилировать JsonLogic result для всех version_config без пересохранения карточек"
					onClick={() => {
						backfillMutation.mutate(undefined, {
							onSuccess: ({ updated, skipped }) => {
								toast.success(
									`JsonLogic: обновлено ${updated}, пропущено ${skipped}`,
								);
							},
							onError: (error) => {
								toast.error(error.message || "Не удалось выполнить backfill");
							},
						});
					}}
					sx={{
						textTransform: "none",
						height: 36,
						px: 1.25,
						border: "1px solid #dfe2ea",
						borderRadius: "9px",
						bgcolor: "#fff",
						color: "#5b6577",
						fontSize: "12px",
						fontWeight: 600,
					}}
				>
					{backfillMutation.isPending ? "Backfill…" : "Backfill JsonLogic"}
				</Button>
			) : null}

			<Button
				onClick={() => navigate(routes.adminV2TypicalWorks.rootPath)}
				title="Создание, удаление и параметры трудоёмкости — в разделе администрирования"
				sx={{
					textTransform: "none",
					height: 36,
					px: 1.25,
					border: "1px solid #dfe2ea",
					borderRadius: "9px",
					bgcolor: "#fff",
					color: "#5b6577",
					fontSize: "12px",
					fontWeight: 600,
				}}
			>
				Администрирование
			</Button>

			<Button
				onClick={onCreateWork}
				sx={{
					textTransform: "none",
					height: 36,
					px: 1.75,
					border: "1px solid #dfe2ea",
					borderRadius: "9px",
					bgcolor: "#fff",
					color: "#384152",
					fontSize: "12.5px",
					fontWeight: 600,
				}}
			>
				+ Работа в справочник
			</Button>
		</Box>
	);
}

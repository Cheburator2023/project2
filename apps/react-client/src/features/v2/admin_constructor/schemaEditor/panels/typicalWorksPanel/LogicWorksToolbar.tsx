import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Divider from "@mui/material/Divider";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";
import {
	ALL_LOGIC_WORKS_SCOPE,
	LOGIC_EXECUTOR_STREAMS,
	LOGIC_STREAM_BLOCK_ROLES,
	type LogicWorksScope,
	isAllLogicWorksScope,
	isRoleSelectedInScope,
	isStreamSelectedInScope,
	roleDisplayLabel,
	scopeLabel,
	scopeStreamsPresentInSchema,
	scopeSubtitle,
	streamColor,
	streamDisplayLabel,
	toggleRoleInScope,
	toggleStreamInScope,
} from "./typicalWorksAreas";
import { useSchemaEditor } from "../../SchemaEditorContext";
import { isExecutorStreamPresentInSchema } from "@smart-anketa/api-contract";
import { ExecutorStreamMenuRow } from "./ExecutorStreamPresenceLabel";
import { TypicalWorkSaveStatusBar } from "./TypicalWorkSaveStatusBar";

type LogicWorksToolbarProps = {
	scope: LogicWorksScope;
	onScopeChange: (scope: LogicWorksScope) => void;
};

export function LogicWorksToolbar({
	scope,
	onScopeChange,
}: LogicWorksToolbarProps) {
	const { uiSchema, typicalWorkSaveDisplay } = useSchemaEditor();
	const anchorRef = useRef<HTMLButtonElement>(null);
	const [pickerOpen, setPickerOpen] = useState(false);
	const scopePresence = scopeStreamsPresentInSchema(
		uiSchema,
		scope,
		(stream) => isExecutorStreamPresentInSchema(uiSchema, stream),
	);

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
			<Typography
				component="span"
				title={scopeSubtitle(scope)}
				sx={{
					fontSize: 11,
					color: isAllLogicWorksScope(scope)
						? "#8a93a3"
						: scopePresence.all
							? "#1f8a4d"
							: scopePresence.any
								? "#e07b16"
								: "#c62828",
					fontWeight: 600,
				}}
			>
				{isAllLogicWorksScope(scope)
					? "все назначенные работы"
					: scopePresence.all
						? "стримы в схеме"
						: scopePresence.any
							? "не все стримы в схеме"
							: "стримы не в схеме"}
			</Typography>
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
							maxHeight: 480,
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
							Стрим-исполнитель
						</Typography>
						<MenuList dense disablePadding>
							<MenuItem
								selected={isAllLogicWorksScope(scope)}
								onClick={() => {
									onScopeChange(ALL_LOGIC_WORKS_SCOPE);
									setPickerOpen(false);
								}}
								sx={{ borderRadius: 1, py: 0.9 }}
							>
								<Typography
									sx={{
										fontSize: 13,
										fontWeight: isAllLogicWorksScope(scope) ? 700 : 600,
										color: "#1d2435",
									}}
								>
									Все области
								</Typography>
							</MenuItem>
							<Divider sx={{ my: 0.5 }} />
							{LOGIC_EXECUTOR_STREAMS.map((stream) => {
								const selected = isStreamSelectedInScope(scope, stream);
								const present = isExecutorStreamPresentInSchema(
									uiSchema,
									stream,
								);
								return (
									<MenuItem
										key={stream}
										selected={selected}
										onClick={() => {
											onScopeChange(toggleStreamInScope(scope, stream));
										}}
										sx={{ borderRadius: 1, py: 0.9 }}
									>
										<Checkbox
											checked={selected}
											size="small"
											sx={{ p: 0.5, mr: 0.5 }}
											tabIndex={-1}
										/>
										<ListItemText
											primary={
												<ExecutorStreamMenuRow
													stream={streamDisplayLabel(stream)}
													color={streamColor(stream)}
													present={present}
													selected={selected}
												/>
											}
										/>
									</MenuItem>
								);
							})}
							<Divider sx={{ my: 0.5 }} />
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
								Роли
							</Typography>
							{LOGIC_STREAM_BLOCK_ROLES.map((role) => {
								const selected = isRoleSelectedInScope(scope, role);
								return (
									<MenuItem
										key={role}
										selected={selected}
										onClick={() => {
											onScopeChange(toggleRoleInScope(scope, role));
										}}
										sx={{ borderRadius: 1, py: 0.9 }}
									>
										<Checkbox
											checked={selected}
											size="small"
											sx={{ p: 0.5, mr: 0.5 }}
											tabIndex={-1}
										/>
										<ListItemText
											primary={roleDisplayLabel(role)}
											primaryTypographyProps={{
												fontSize: 13,
												fontWeight: selected ? 700 : 500,
											}}
										/>
									</MenuItem>
								);
							})}
						</MenuList>
					</Paper>
				</ClickAwayListener>
			</Popper>

			<Box sx={{ flexGrow: 1 }} />

			{typicalWorkSaveDisplay ? (
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						flexShrink: 0,
						px: 1.5,
						py: 0.75,
						border: "1px solid #e6e8ee",
						borderRadius: "9px",
						bgcolor: "#fafbfc",
						maxWidth: 360,
					}}
				>
					<TypicalWorkSaveStatusBar
						compact
						status={typicalWorkSaveDisplay.status}
						workName={typicalWorkSaveDisplay.workName}
						errorMessage={typicalWorkSaveDisplay.errorMessage}
						onRetry={typicalWorkSaveDisplay.onRetry}
					/>
				</Box>
			) : null}
		</Box>
	);
}

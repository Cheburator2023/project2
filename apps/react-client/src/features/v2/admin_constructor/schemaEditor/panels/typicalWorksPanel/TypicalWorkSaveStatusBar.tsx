import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { Flex } from "@react-client/common/primitives/Flex";
import type { SaveStatus } from "./useDebouncedTypicalWorkSave";

type Props = {
	status: SaveStatus;
	workName?: string | null;
	errorMessage?: string | null;
	onRetry?: () => void;
	compact?: boolean;
};

function saveStatusMeta(status: SaveStatus) {
	switch (status) {
		case "saving":
			return {
				label: "Сохранение…",
				color: "#9a6118",
				bgcolor: "#fff8eb",
				borderColor: "#f0dfbf",
				dot: "#b5791f",
				showSpinner: true,
			};
		case "saved":
			return {
				label: "Сохранено",
				color: "#1f8a4d",
				bgcolor: "#edf8f1",
				borderColor: "#cce8d6",
				dot: "#1f8a4d",
				showSpinner: false,
			};
		case "error":
			return {
				label: "Ошибка сохранения",
				color: "#c62828",
				bgcolor: "#fdecec",
				borderColor: "#f5c6c6",
				dot: "#c62828",
				showSpinner: false,
			};
		case "dirty":
			return {
				label: "Есть несохранённые изменения…",
				color: "#9a6118",
				bgcolor: "#fff8eb",
				borderColor: "#f0dfbf",
				dot: "#b5791f",
				showSpinner: false,
			};
		default:
			return {
				label: "Готово к редактированию",
				color: "#5b6577",
				bgcolor: "#f4f6f9",
				borderColor: "#e6e8ee",
				dot: "#94a3b8",
				showSpinner: false,
			};
	}
}

export function TypicalWorkSaveStatusBar({
	status,
	workName,
	errorMessage,
	onRetry,
	compact = false,
}: Props) {
	const meta = saveStatusMeta(status);

	return (
		<Flex
			alignItems={compact ? "center" : "flex-start"}
			gap={compact ? 8 : 10}
			flexWrap="wrap"
			flexShrink={0}
			px={compact ? 0 : 14}
			py={compact ? 0 : 10}
			sx={{
				borderBottom: compact ? "none" : "1px solid #e6e8ee",
				bgcolor: compact ? "transparent" : meta.bgcolor,
				borderTop: compact ? "none" : `1px solid ${meta.borderColor}`,
				borderLeft: compact ? "none" : `1px solid ${meta.borderColor}`,
				borderRight: compact ? "none" : `1px solid ${meta.borderColor}`,
				borderRadius: compact ? 0 : "0 0 10px 10px",
				minHeight: compact ? 28 : 44,
			}}
			data-test-id="typical-work-save-status"
		>
			<Flex alignItems="center" gap={8} minWidth={0} flexGrow={1}>
				{meta.showSpinner ? (
					<CircularProgress size={14} sx={{ color: meta.dot }} />
				) : (
					<Flex
						width={8}
						height={8}
						borderRadius="50%"
						flexShrink={0}
						sx={{ bgcolor: meta.dot }}
					/>
				)}
				<Flex flexDirection="column" gap={2} minWidth={0}>
					<Typography
						sx={{
							fontSize: compact ? 11 : 12.5,
							fontWeight: 700,
							color: meta.color,
							lineHeight: 1.2,
						}}
					>
						{meta.label}
					</Typography>
					{!compact && workName ? (
						<Typography
							noWrap
							sx={{ fontSize: 11, color: "#5b6577", maxWidth: "100%" }}
						>
							{workName}
						</Typography>
					) : null}
					{!compact && status === "error" && errorMessage ? (
						<Typography sx={{ fontSize: 11, color: "#c62828" }}>
							{errorMessage}
						</Typography>
					) : null}
				</Flex>
			</Flex>
			{status === "error" && onRetry ? (
				<Button
					size="small"
					variant="outlined"
					onClick={onRetry}
					sx={{ textTransform: "none", flexShrink: 0 }}
				>
					Повторить
				</Button>
			) : null}
		</Flex>
	);
}

export function typicalWorkSaveStatusLabel(status: SaveStatus): string {
	return saveStatusMeta(status).label;
}

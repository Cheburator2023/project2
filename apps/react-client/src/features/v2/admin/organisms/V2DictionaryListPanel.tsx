import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Card } from "@react-client/common/muiCustom/Card";
import type { V2DictionaryDto } from "@smart-anketa/api-contract";

type V2DictionaryListPanelProps = {
	items: V2DictionaryDto[];
	selectedId: string | null;
	quickFilter: string;
	onQuickFilterChange: (value: string) => void;
	onSelect: (id: string) => void;
	onCreate?: () => void;
	showCreateButton?: boolean;
};

function dictStatusBadge(row: V2DictionaryDto): {
	label: string;
	bg: string;
	color: string;
	border: string;
} {
	if (row.isDefault) {
		return {
			label: "Заводской",
			bg: "#eef4ff",
			color: "#2f6bd8",
			border: "#cfe0f8",
		};
	}
	if (row.isInUse) {
		return {
			label: "В схемах",
			bg: "#fdf3e0",
			color: "#b5791f",
			border: "#f0e3c8",
		};
	}
	return {
		label: "Свободный",
		bg: "#eef1f6",
		color: "#8a93a3",
		border: "#e1e4ea",
	};
}

export function V2DictionaryListPanel({
	items,
	selectedId,
	quickFilter,
	onQuickFilterChange,
	onSelect,
	onCreate,
	showCreateButton = true,
}: V2DictionaryListPanelProps) {
	const q = quickFilter.trim().toLowerCase();
	const filtered = items.filter((row) => {
		if (!q) return true;
		return (
			row.code.toLowerCase().includes(q) ||
			row.name.toLowerCase().includes(q) ||
			(row.category ?? "").toLowerCase().includes(q)
		);
	});

	return (
		<Card padding="0" overflow="hidden" height="100%" width="430px">
			<Box
				sx={{
					p: "14px 16px",
					borderBottom: "1px solid #eef0f4",
					display: "flex",
					gap: 1.1,
					alignItems: "center",
				}}
			>
				<TextField
					size="small"
					fullWidth
					placeholder="Поиск по коду, названию…"
					value={quickFilter}
					onChange={(e) => onQuickFilterChange(e.target.value)}
					sx={{
						"& .MuiInputBase-root": {
							height: 34,
							fontSize: 12.5,
							borderRadius: "8px",
						},
					}}
				/>
				{showCreateButton && onCreate ? (
					<Button
						onClick={onCreate}
						sx={{
							flexShrink: 0,
							textTransform: "none",
							height: 34,
							px: 1.6,
							borderRadius: "8px",
							bgcolor: "#1c2333",
							color: "#fff",
							fontSize: 12.5,
							fontWeight: 600,
						}}
					>
						Создать
					</Button>
				) : null}
			</Box>
			<Typography
				sx={{
					px: 2,
					py: 1.1,
					fontSize: 12,
					color: "#8a93a3",
					borderBottom: "1px solid #f3f4f8",
				}}
			>
				<b style={{ color: "#1d2435" }}>{items.length}</b> справочников
			</Typography>
			<Box sx={{ flex: 1, overflowY: "auto" }}>
				{filtered.map((row) => {
					const selected = row.id === selectedId;
					const status = dictStatusBadge(row);
					return (
						<Box
							key={row.id}
							onClick={() => onSelect(row.id)}
							sx={{
								p: "10px 16px",
								borderBottom: "1px solid #f3f4f8",
								cursor: "pointer",
								bgcolor: selected ? "#eef4ff" : "#fff",
								"&:hover": { bgcolor: selected ? "#eef4ff" : "#fafbfc" },
							}}
						>
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 1,
									mb: 0.4,
								}}
							>
								<Typography
									sx={{
										flex: 1,
										fontFamily: "monospace",
										fontSize: 11.5,
										color: "#2f6bd8",
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
									}}
								>
									{row.code}
								</Typography>
								<Box
									sx={{
										display: "inline-flex",
										alignItems: "center",
										height: 18,
										px: 0.9,
										borderRadius: "5px",
										bgcolor: status.bg,
										color: status.color,
										border: `1px solid ${status.border}`,
										fontSize: 10,
										fontWeight: 600,
										flexShrink: 0,
									}}
								>
									{status.label}
								</Box>
							</Box>
							<Typography sx={{ fontSize: 13, color: "#28303f" }}>
								{row.name}
							</Typography>
						</Box>
					);
				})}
			</Box>
		</Card>
	);
}

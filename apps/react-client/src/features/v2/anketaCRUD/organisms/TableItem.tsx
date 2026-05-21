import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Box, Chip, IconButton, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type TableItemProps = {
	name: string;
	workType: string;
	channels: string[];
	pilotRequired: boolean;
	modelClass: string;
	controls: string[];
};

function FieldBlock({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<Box sx={{ minWidth: 0 }}>
			<Typography
				variant="caption"
				sx={{ color: "#9CA3AF", fontWeight: 500, mb: 0.5, display: "block" }}
			>
				{label}
			</Typography>
			{children}
		</Box>
	);
}

export const TableItem = ({
	name,
	workType,
	channels,
	pilotRequired,
	modelClass,
	controls,
}: TableItemProps) => {
	return (
		<Box
			sx={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
				alignItems: "start",
				gap: 2,
				width: "100%",
				maxWidth: "100%",
				minWidth: 0,
			}}
		>
			<FieldBlock label="Название">
				<Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
					<Typography variant="body2" fontWeight={600} noWrap title={name}>
						{name}
					</Typography>
					<OpenInNewIcon sx={{ fontSize: 16, color: "#6B7280", flexShrink: 0 }} />
				</Stack>
			</FieldBlock>

			<FieldBlock label="Тип работ">
				<Typography variant="body2" fontWeight={500}>
					{workType}
				</Typography>
			</FieldBlock>

			<FieldBlock label="Канал внедрения">
				<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
					{channels.map((channel) => (
						<Chip
							key={channel}
							label={channel}
							size="small"
							sx={{
								backgroundColor: "#F3F4F6",
								color: "#374151",
								borderRadius: "8px",
								fontWeight: 500,
								maxWidth: "100%",
							}}
						/>
					))}
				</Stack>
			</FieldBlock>

			<FieldBlock label="Требуется пилот">
				<Typography
					variant="body2"
					fontWeight={600}
					sx={{ color: pilotRequired ? "#059669" : "#DC2626" }}
				>
					{pilotRequired ? "Да" : "Нет"}
				</Typography>
			</FieldBlock>

			<FieldBlock label="Класс моделей">
				<Typography variant="body2" fontWeight={500}>
					{modelClass}
				</Typography>
			</FieldBlock>

			<FieldBlock label="Вид контроля">
				<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
					{controls.map((control) => (
						<Chip
							key={control}
							label={control}
							size="small"
							sx={{
								backgroundColor: "#EEF2FF",
								color: "#4338CA",
								borderRadius: "8px",
								fontWeight: 500,
							}}
						/>
					))}
				</Stack>
			</FieldBlock>

			<Box sx={{ display: "flex", justifyContent: { xs: "flex-start", sm: "flex-end" } }}>
				<IconButton
					size="small"
					sx={{
						border: "1px solid #E5E7EB",
						borderRadius: "10px",
						width: 36,
						height: 36,
					}}
				>
					<EditOutlinedIcon fontSize="small" />
				</IconButton>
			</Box>
		</Box>
	);
};

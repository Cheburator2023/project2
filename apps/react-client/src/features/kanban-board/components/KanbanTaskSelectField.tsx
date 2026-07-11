import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";

export type KanbanTaskChipOption = {
	value: string;
	label: string;
	color?: string;
};

type KanbanTaskFieldChipProps = {
	label: string;
	color?: string;
	outlined?: boolean;
};

export function KanbanTaskFieldChip({
	label,
	color = "#64748b",
	outlined = false,
}: KanbanTaskFieldChipProps) {
	return (
		<Chip
			size="small"
			label={label}
			sx={{
				maxWidth: "100%",
				bgcolor: outlined ? "transparent" : alpha(color, 0.14),
				color,
				border: `1px solid ${alpha(color, 0.35)}`,
			}}
		/>
	);
}

type KanbanTaskSelectFieldProps = {
	label: string;
	value: string;
	options: KanbanTaskChipOption[];
	onChange: (value: string) => void;
	emptyLabel?: string;
	emptyColor?: string;
} & Pick<TextFieldProps, "fullWidth" | "required" | "disabled">;

export function KanbanTaskSelectField({
	label,
	value,
	options,
	onChange,
	emptyLabel = "—",
	emptyColor = "#94a3b8",
	fullWidth,
	required,
	disabled,
}: KanbanTaskSelectFieldProps) {
	const renderChip = (selectedValue: string): ReactNode => {
		if (!selectedValue) {
			return (
				<KanbanTaskFieldChip label={emptyLabel} color={emptyColor} outlined />
			);
		}
		const option = options.find((item) => item.value === selectedValue);
		return (
			<KanbanTaskFieldChip
				label={option?.label ?? selectedValue}
				color={option?.color ?? "#64748b"}
			/>
		);
	};

	return (
		<TextField
			select
			label={label}
			value={value}
			onChange={(event) => onChange(event.target.value)}
			fullWidth={fullWidth}
			required={required}
			disabled={disabled}
			SelectProps={{ renderValue: (selected) => renderChip(String(selected)) }}
		>
			<MenuItem value="">
				<KanbanTaskFieldChip label={emptyLabel} color={emptyColor} outlined />
			</MenuItem>
			{options.map((option) => (
				<MenuItem key={option.value} value={option.value}>
					<KanbanTaskFieldChip
						label={option.label}
						color={option.color ?? "#64748b"}
					/>
				</MenuItem>
			))}
		</TextField>
	);
}

type KanbanTaskMultiSelectFieldProps = {
	label: string;
	value: string[];
	options: KanbanTaskChipOption[];
	onChange: (value: string[]) => void;
	emptyLabel?: string;
	emptyColor?: string;
} & Pick<TextFieldProps, "fullWidth" | "required" | "disabled">;

export function KanbanTaskMultiSelectField({
	label,
	value,
	options,
	onChange,
	emptyLabel = "—",
	emptyColor = "#94a3b8",
	fullWidth,
	required,
	disabled,
}: KanbanTaskMultiSelectFieldProps) {
	return (
		<TextField
			select
			label={label}
			value={value}
			onChange={(event) => {
				const nextValue = event.target.value;
				onChange(
					Array.isArray(nextValue) ? nextValue : String(nextValue).split(","),
				);
			}}
			fullWidth={fullWidth}
			required={required}
			disabled={disabled}
			SelectProps={{
				multiple: true,
				renderValue: (selected) => {
					const selectedValues = selected as string[];
					if (!selectedValues.length) {
						return (
							<KanbanTaskFieldChip
								label={emptyLabel}
								color={emptyColor}
								outlined
							/>
						);
					}
					return (
						<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
							{selectedValues.map((selectedValue) => {
								const option = options.find((item) => item.value === selectedValue);
								return (
									<KanbanTaskFieldChip
										key={selectedValue}
										label={option?.label ?? selectedValue}
										color={option?.color ?? "#64748b"}
									/>
								);
							})}
						</Box>
					);
				},
			}}
		>
			{options.map((option) => (
				<MenuItem key={option.value} value={option.value}>
					<KanbanTaskFieldChip
						label={option.label}
						color={option.color ?? "#64748b"}
					/>
				</MenuItem>
			))}
		</TextField>
	);
}

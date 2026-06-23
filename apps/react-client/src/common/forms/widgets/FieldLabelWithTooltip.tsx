import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import { InputLabel, type InputLabelProps } from "@mui/material";
import { Flex } from "@react-client/common/primitives/Flex";
import type { ReactNode } from "react";

const TOOLTIP_ICON_SX = {
	scale: 0.8,
	color: "#88888877",
	position: "absolute",
	top: "-4px",
	right: "0",
} as const;

/** Слот `inputLabel` для MUI TextField с иконкой ℹ (`ui:options.tooltip`). */
export function FieldLabelWithTooltip({
	tooltip,
	...labelProps
}: InputLabelProps & { tooltip?: string }) {
	const text = tooltip?.trim();
	if (!text) {
		return <InputLabel {...labelProps} />;
	}

	return (
		<Flex gap={6} position="relative">
			<InputLabel {...labelProps} title="" />
			<div title={text}>
				<InfoOutlineIcon sx={TOOLTIP_ICON_SX} />
			</div>
		</Flex>
	);
}

/** Подпись с иконкой для Checkbox / FormControlLabel. */
export function InlineLabelWithTooltip({
	label,
	tooltip,
}: {
	label: ReactNode;
	tooltip?: string;
}) {
	const text = tooltip?.trim();
	if (!text) return <>{label}</>;

	return (
		<Flex gap={0.5} alignItems="center" as="span">
			<span>{label}</span>
			<div title={text}>
				<InfoOutlineIcon sx={{ fontSize: 16, color: "#88888877" }} />
			</div>
		</Flex>
	);
}

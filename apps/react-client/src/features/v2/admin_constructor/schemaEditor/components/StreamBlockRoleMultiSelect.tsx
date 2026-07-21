import Checkbox from "@mui/material/Checkbox";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import {
	resolveStreamBlockRolesLabel,
	serializeStreamBlockRoles,
	V2_STREAM_BLOCK_ROLE_CODES,
	V2_STREAM_BLOCK_ROLE_LABELS,
	type V2StreamBlockRoleCode,
} from "@smart-anketa/api-contract";

type StreamBlockRoleMultiSelectProps = {
	value: V2StreamBlockRoleCode[];
	onChange: (value: V2StreamBlockRoleCode[]) => void;
	label?: string;
	helperText?: string;
	allowEmpty?: boolean;
	size?: "small" | "medium";
	fullWidth?: boolean;
};

export function StreamBlockRoleMultiSelect({
	value,
	onChange,
	label = "Роли",
	helperText,
	allowEmpty = true,
	size = "small",
	fullWidth = true,
}: StreamBlockRoleMultiSelectProps) {
	return (
		<TextField
			select
			fullWidth={fullWidth}
			size={size}
			label={label}
			value={value}
			helperText={helperText}
			SelectProps={{
				multiple: true,
				renderValue: (selected) =>
					resolveStreamBlockRolesLabel(selected as string[]),
			}}
			onChange={(event) => {
				const raw = event.target.value;
				const next =
					typeof raw === "string"
						? (raw.split(",") as V2StreamBlockRoleCode[])
						: (raw as V2StreamBlockRoleCode[]);
				if (!allowEmpty && next.length === 0) return;
				onChange(next);
			}}
		>
			{V2_STREAM_BLOCK_ROLE_CODES.map((code) => (
				<MenuItem key={code} value={code}>
					<Checkbox checked={value.includes(code)} size="small" sx={{ p: 0.5 }} />
					<ListItemText
						primary={V2_STREAM_BLOCK_ROLE_LABELS[code]}
						primaryTypographyProps={{ fontSize: 13 }}
					/>
				</MenuItem>
			))}
		</TextField>
	);
}

export function streamBlockRolesToUiValue(
	roles: readonly V2StreamBlockRoleCode[],
) {
	return serializeStreamBlockRoles(roles);
}

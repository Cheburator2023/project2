import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { Operator } from "../operators.ts";

interface Props {
	value: string;
	options: Operator[];
	onChange: (value: string) => void;
}

export function SelectOperator({ value, options, onChange }: Props) {
	return (
		<TextField
			select
			size="small"
			value={value}
			onChange={(e) => onChange(e.target.value)}
			slotProps={{
				input: {
					"data-rjl-operator-trigger": "",
				},
			}}
			sx={{
				"& .MuiSelect-icon": {
					"right": 0
				}
			}}
			SelectProps={{
				MenuProps: {
					slotProps: {
						paper: {
							"data-rjl-operator-popup": "",
						},
					},
				},
			}}
		>
			{options.map((op) => (
				<MenuItem key={op.signature} value={op.signature}>
					{op.label}
				</MenuItem>
			))}
		</TextField>
	);
}

export default SelectOperator;

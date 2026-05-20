import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { dataSlotProps } from "../muiDataSlot";
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
				input: dataSlotProps({ "data-rjl-operator-trigger": "" }),
			}}
			sx={{
				"& .MuiSelect-icon": {
					"right": 0
				}
			}}
			SelectProps={{
				MenuProps: {
					slotProps: {
						paper: dataSlotProps({ "data-rjl-operator-popup": "" }),
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

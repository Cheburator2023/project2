import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useMemo } from "react";
import { dataSlotProps } from "../muiDataSlot";

const INPUT_TYPES = [
	{ value: "text", label: "текст" },
	{ value: "number", label: "число" },
] as const;
type InputType = (typeof INPUT_TYPES)[number]["value"];

interface Props {
	name?: string;
	value?: string | number;
	/** Initial type fallback if `value` is a string. Ignored if `value` is a number. */
	type?: InputType;
	/**
	 * Called with the next value. Note: when the input type is `"number"` and
	 * the user types something unparseable (rare — the browser usually filters
	 * non-numeric input), the raw string is emitted unchanged rather than
	 * `NaN`. Consumers that store the result into a numeric field should
	 * coerce or validate at the boundary.
	 */
	onChange: (value: string | number) => void;
}

const isNumeric = (value: unknown): value is number => typeof value === "number";

const getType = (value: unknown, fallback: InputType): InputType =>
	isNumeric(value) ? "number" : fallback;

export function Input({ name = "", value = "", type: typeProp = "text", onChange }: Props) {
	const type = useMemo<InputType>(() => getType(value, typeProp), [value, typeProp]);

	const onTypeChange = (next: InputType) => {
		if (next === "number") {
			const n = parseFloat(String(value));
			onChange(Number.isFinite(n) ? n : 0);
		} else {
			onChange(String(value));
		}
	};

	const onValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value;
		if (type !== "number") {
			onChange(raw);
			return;
		}
		if (raw === "") {
			onChange("");
			return;
		}
		const n = parseFloat(raw);
		onChange(Number.isFinite(n) ? n : raw);
	};

	return (
		<span data-rjl-input>
			<TextField
				select
				size="small"
				value={type}
				onChange={(e) => onTypeChange(e.target.value as InputType)}
				slotProps={{
					input: dataSlotProps({ "data-rjl-input-type-trigger": "" }),
				}}
				sx={{
					"& .MuiSelect-icon": {
						"right": 0
					}
				}}
				SelectProps={{
					MenuProps: {
						slotProps: {
							paper: dataSlotProps({ "data-rjl-input-type-popup": "" }),
						},
					},
				}}
			>
				{INPUT_TYPES.map(({ value: typeValue, label }) => (
					<MenuItem key={typeValue} value={typeValue}>
						{label}
					</MenuItem>
				))}
			</TextField>

			<input
				name={name}
				value={String(value)}
				type={type}
				onChange={onValueChange}
				data-rjl-input-value
			/>
		</span>
	);
}

export default Input;

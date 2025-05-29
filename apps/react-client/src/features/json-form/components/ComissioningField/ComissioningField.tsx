import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import Grid from "@mui/material/Grid";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import { FieldProps } from "@rjsf/utils";
import { useEffect, useState } from "react";
import NumericInput from "../NumericInput/NumericInput";

import { COMISSIONING_LABELS } from "../../utils/constants";
import { TFieldTypeNumber, TInputChangeEvent } from "../../utils/interfaces";

const CommissioningField = (props: FieldProps) => {
	const { schema, name, onChange, formData, rawErrors, required, idSchema } =
		props;
	const { title } = schema;
	const [checked, setChecked] = useState<string>("");
	const [inputValue, setInputValue] = useState<TFieldTypeNumber>(formData);
	const isError = Boolean(rawErrors?.length);
	const currentYear = Number(new Date().getFullYear());

	const handed = COMISSIONING_LABELS[0];
	const thisYear = COMISSIONING_LABELS[1];
	const planing = COMISSIONING_LABELS[2];
	const yearLabel = "Enter year";

	const handleInputChange = (value: TFieldTypeNumber) => {
		const newValue = !value ? value : Number(value);

		setInputValue(newValue);
		onChange(newValue);
	};

	const handleRadioChange: TInputChangeEvent = (e) => {
		const { value } = e.target;
		setChecked(value);
	};

	useEffect(() => {
		if (typeof inputValue === "number") {
			if (inputValue > currentYear) {
				setChecked(planing);
				return;
			}
			if (inputValue === currentYear) {
				setChecked(thisYear);
				return;
			}
			setChecked(handed);
			return;
		}
		setChecked(handed);
	}, [inputValue]);

	return (
		<FormControl>
			<FormLabel>{title}</FormLabel>
			<Grid container columns={2} alignItems="flex-end" columnGap={2}>
				<Grid>
					<RadioGroup
						name="comissioning-radio-button-group"
						value={checked}
						onChange={handleRadioChange}
					>
						{COMISSIONING_LABELS.map((item: string, index: number) => {
							const key = `${name}-${index}-item`;
							return (
								<FormControlLabel
									key={key}
									value={item}
									control={<Radio />}
									label={item}
								/>
							);
						})}
					</RadioGroup>
				</Grid>
				<Grid>
					<NumericInput
						id={idSchema.$id}
						value={inputValue}
						length={4}
						name={name}
						label={yearLabel}
						onChange={handleInputChange}
						error={isError}
						required={required}
						helperText={rawErrors?.join(", ")}
					/>
				</Grid>
			</Grid>
		</FormControl>
	);
};

export default CommissioningField;

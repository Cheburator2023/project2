import { TextFieldProps } from "@mui/material/TextField";
import React from "react";

export type TFieldTypeNumber = number | string;
export type TInputChangeEvent = (
	event: React.ChangeEvent<HTMLInputElement>,
) => void;

export interface NumericInputProps
	extends Omit<TextFieldProps, "value" | "onChange"> {
	value: TFieldTypeNumber;
	onChange: (value: TFieldTypeNumber) => void;
	length?: number;
}

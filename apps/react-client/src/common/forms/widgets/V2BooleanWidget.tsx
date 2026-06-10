import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import type { WidgetProps } from "@rjsf/utils";
import { InlineLabelWithTooltip } from "./FieldLabelWithTooltip";

/** Да/нет с иконкой подсказки у подписи. */
export function V2BooleanWidget(props: WidgetProps) {
	const {
		id,
		label,
		value,
		onChange,
		disabled,
		readonly,
		required,
		schema,
		options,
		rawErrors,
	} = props;

	const isDisabled = Boolean(disabled || readonly);
	const title =
		typeof label === "string" && label.trim()
			? label
			: typeof schema?.title === "string"
				? schema.title
				: "";
	const tooltip =
		typeof options?.tooltip === "string" ? options.tooltip : undefined;

	return (
		<FormControl error={Boolean(rawErrors?.length)} required={required}>
			<FormControlLabel
				control={
					<Checkbox
						id={id}
						checked={Boolean(value)}
						disabled={isDisabled}
						onChange={(event) => onChange(event.target.checked)}
					/>
				}
				label={
					<InlineLabelWithTooltip label={title || " "} tooltip={tooltip} />
				}
			/>
			{rawErrors?.[0] ? (
				<FormHelperText>{rawErrors[0]}</FormHelperText>
			) : null}
		</FormControl>
	);
}

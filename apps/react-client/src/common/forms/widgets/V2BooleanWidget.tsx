import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import type { WidgetProps } from "@rjsf/utils";
import { InlineLabelWithTooltip } from "./FieldLabelWithTooltip";

/** Да/нет с иконкой подсказки у подписи и текстом описания под полем. */
export function V2BooleanWidget(props: WidgetProps) {
	const {
		id,
		label,
		value,
		onChange,
		disabled,
		readonly,
		schema,
		options,
	} = props;

	const isDisabled = Boolean(disabled || readonly);
	const checked = typeof value === "boolean" ? value : false;
	const title =
		typeof label === "string" && label.trim()
			? label
			: typeof schema?.title === "string"
				? schema.title
				: "";
	const tooltip =
		typeof options?.tooltip === "string" ? options.tooltip : undefined;
	const description =
		typeof schema?.description === "string" ? schema.description.trim() : "";

	return (
		<>
			<FormControlLabel
				control={
					<Checkbox
						id={id}
						checked={checked}
						disabled={isDisabled}
						onChange={(event) => onChange(event.target.checked)}
					/>
				}
				label={
					<InlineLabelWithTooltip label={title || " "} tooltip={tooltip} />
				}
			/>
			{description ? (
				<Typography
					variant="body2"
					color="text.secondary"
					sx={{ mt: -0.5, ml: 4.25 }}
				>
					{description}
				</Typography>
			) : null}
		</>
	);
}

import { TextFieldCustom } from "@react-client/common/muiCustom/TextFieldCustom";
import { WidgetProps } from "@rjsf/utils";

export const TextFieldCustomWidget = (props: WidgetProps) => {
	const {
		id,
		required,
		readonly,
		disabled,
		label,
		value,
		onChange,
		onBlur,
		onFocus,
		autofocus,
		options,
		schema,
		mask,
		rawErrors,
	} = props;
	console.log("asss", props);
	const _onChange = (value: string) =>
		onChange(value === "" ? options.emptyValue : value);
	console.log("🚀 ~ TextFieldCustomWidget ~ options:", options);

	const _onBlur = ({ target: { value } }: React.FocusEvent<HTMLInputElement>) =>
		onBlur(id, value);

	const _onFocus = ({
		target: { value },
	}: React.FocusEvent<HTMLInputElement>) => onFocus(id, value);

	return (
		<TextFieldCustom
			id={id}
			label={label || schema.title}
			value={value || ""}
			required={required}
			disabled={disabled || readonly}
			autoFocus={autofocus}
			error={rawErrors && rawErrors.length > 0}
			helperText={rawErrors?.join(" ")}
			onChange={(event) => _onChange(event.target.value)}
			onBlur={_onBlur}
			onFocus={_onFocus}
			mask={options.mask}
			replacement={options.replacement}
			prefix={options.prefix}
			{...options}
		/>
	);
};

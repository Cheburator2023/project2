import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import { InputLabel } from "@mui/material";
import { TextFieldCustom } from "@react-client/common/muiCustom/TextFieldCustom";
import { Flex } from "@react-client/common/primitives/Flex";
import { WidgetProps } from "@rjsf/utils";
import React from "react";
import NumberInputWidget from "./NumberInputWidget";

interface DisabledDependencyHandlerProps {
	value: any;
	valueToSet: any;
	onChange: (value: any) => void;
}

const DisabledDependencyHandler: React.FC<DisabledDependencyHandlerProps> = ({
	value,
	valueToSet,
	onChange,
}) => {
	React.useEffect(() => {
		if (value !== valueToSet) {
			onChange(valueToSet);
		}
	}, [valueToSet, value, onChange]); // Dependencies for this specific effect
	return null; // This component doesn't render any UI
};

interface GlobalDisabledHandlerProps {
	value: any;
	disabledValue: any;
	onChange: (value: any) => void;
}

const GlobalDisabledHandler: React.FC<GlobalDisabledHandlerProps> = ({
	value,
	disabledValue,
	onChange,
}) => {
	React.useEffect(() => {
		if (value !== disabledValue) {
			onChange(disabledValue);
		}
	}, [disabledValue, value, onChange]); // Dependencies for this specific effect
	return null; // This component doesn't render any UI
};

const widgetMap: Record<string, any> = {
	NumberInputWidget,
	TextFieldCustom,
	// Add more widgets as needed
};

export const UniversalDependencyWidget = (props: WidgetProps) => {
	const { formContext, uiSchema, value, onChange, registry, schema, ...rest } =
		props;
	const tooltip = props?.options?.tooltip;
	const label = props.label;

	const inputLabelSlot = (props: any) =>
		tooltip ? (
			<Flex gap={6}>
				<InputLabel {...props} />
				<div title={tooltip}>
					<InfoOutlineIcon
						sx={{
							scale: 0.8,
							color: "#88888877",
							position: "absolute",
							top: "-4px",
							right: "0",
						}}
					/>
				</div>
			</Flex>
		) : (
			<InputLabel {...props} />
		);

	const options = uiSchema?.["ui:options"] as
		| {
				dependencies: {
					field?: string;
					disabledWhen?: any;
					valueToSet?: any;
					widget?: string;
					condition?: string;
					disabled?: boolean;
				}[];
				defaultWidget?: string;
				disabled?: boolean;
				disabledValue?: any;
		  }
		| undefined;

	// Find the first matching dependency
	let matchedDep = undefined;
	let enabledByDependency = false;
	if (options?.dependencies && options.dependencies.length > 0) {
		matchedDep = options.dependencies.find((dep) => {
			if (dep.condition) {
				try {
					// eslint-disable-next-line no-new-func
					const func = new Function(
						"formData",
						`with (formData) { return (${dep.condition}); }`,
					);
					return func(formContext?.formData);
				} catch (e) {
					console.error(
						"Error evaluating dependency condition:",
						dep.condition,
						e,
					);
					return false;
				}
			}
			if (dep.field && dep.disabledWhen !== undefined) {
				const depValue = formContext?.formData?.[dep.field];
				return depValue === dep.disabledWhen;
			}
			return false;
		});
		// If any dependency explicitly enables the field, track it
		enabledByDependency = !!matchedDep && matchedDep.disabled === false;
	}

	// If a dependency matched and enables the field, render as editable
	if (enabledByDependency) {
		let DefaultWidget: any = null;
		if (options?.defaultWidget) {
			DefaultWidget =
				widgetMap[options.defaultWidget] ||
				registry.widgets[options.defaultWidget];
		}
		if (!DefaultWidget) {
			if (schema?.type === "number" || schema?.type === "integer") {
				DefaultWidget =
					registry.widgets.NumberWidget || widgetMap.NumberInputWidget;
			} else if (schema?.type === "string" && schema?.enum) {
				DefaultWidget =
					registry.widgets.Select || registry.widgets.SelectWidget;
			} else {
				DefaultWidget =
					registry.widgets.Select ||
					registry.widgets.SelectWidget ||
					registry.widgets.TextWidget;
			}
		}

		return (
			<DefaultWidget
				{...rest}
				options={{ ...rest.options, disabled: false }}
				disabled={false}
				value={value}
				onChange={onChange}
				formContext={formContext}
				uiSchema={uiSchema}
				registry={registry}
				schema={schema}
				label={label}
				slots={{
					inputLabel: inputLabelSlot,
				}}
			/>
		);
	}

	// If a dependency matched and disables the field, use its settings
	if (matchedDep && matchedDep.disabled !== false) {
		const valueToSet =
			matchedDep.valueToSet !== undefined ? matchedDep.valueToSet : "";
		const widgetType = matchedDep.widget || "TextField";

		return (
			<>
				<DisabledDependencyHandler
					value={value}
					valueToSet={valueToSet}
					onChange={onChange}
				/>
				{widgetType === "TextField" ? (
					<TextFieldCustom
						value={valueToSet}
						disabled
						fullWidth
						variant="outlined"
						size="small"
						label={label}
						slots={{
							inputLabel: inputLabelSlot,
						}}
					/>
				) : (
					// Fallback to disabled text field
					<TextFieldCustom
						value={valueToSet}
						disabled
						fullWidth
						variant="outlined"
						size="small"
						label={label}
						slots={{
							inputLabel: inputLabelSlot,
						}}
					/>
				)}
			</>
		);
	}

	// If no dependency matched, check for global disabled
	if (options?.disabled) {
		const disabledValue =
			options.disabledValue !== undefined ? options.disabledValue : "";

		return (
			<>
				<GlobalDisabledHandler
					value={value}
					disabledValue={disabledValue}
					onChange={onChange}
				/>
				<TextFieldCustom
					value={disabledValue}
					disabled
					fullWidth
					variant="outlined"
					size="small"
					label={label}
					slots={{
						inputLabel: inputLabelSlot,
					}}
				/>
			</>
		);
	}

	// Default: render as editable
	let DefaultWidget: any = null;
	if (options?.defaultWidget) {
		DefaultWidget =
			widgetMap[options.defaultWidget] ||
			registry.widgets[options.defaultWidget];
	}
	if (!DefaultWidget) {
		if (schema?.type === "number" || schema?.type === "integer") {
			DefaultWidget =
				registry.widgets.NumberWidget || widgetMap.NumberInputWidget;
		} else if (schema?.type === "string" && schema?.enum) {
			DefaultWidget = registry.widgets.Select || registry.widgets.SelectWidget;
		} else {
			DefaultWidget =
				registry.widgets.Select ||
				registry.widgets.SelectWidget ||
				registry.widgets.TextWidget;
		}
	}
	return (
		<DefaultWidget
			{...rest}
			value={value}
			onChange={onChange}
			formContext={formContext}
			uiSchema={uiSchema}
			registry={registry}
			schema={schema}
			label={label}
			slots={{
				inputLabel: inputLabelSlot,
			}}
		/>
	);
};

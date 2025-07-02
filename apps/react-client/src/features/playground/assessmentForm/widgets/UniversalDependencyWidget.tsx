import { TextField } from "@mui/material";
import { WidgetProps } from "@rjsf/utils";
import React from "react";
import NumberInputWidget from "./NumberInputWidget";

const widgetMap: Record<string, any> = {
	NumberInputWidget,
	TextField,
	// Add more widgets as needed
};

const UniversalDependencyWidget = (props: WidgetProps) => {
	const { formContext, uiSchema, value, onChange, registry, schema, ...rest } =
		props;
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
				disabled={false}
				value={value}
				onChange={onChange}
				formContext={formContext}
				uiSchema={uiSchema}
				registry={registry}
				schema={schema}
			/>
		);
	}

	// If a dependency matched and disables the field, use its settings
	if (matchedDep && matchedDep.disabled !== false) {
		const valueToSet =
			matchedDep.valueToSet !== undefined ? matchedDep.valueToSet : "";
		const widgetType = matchedDep.widget || "TextField";
		React.useEffect(() => {
			if (value !== valueToSet) {
				onChange(valueToSet);
			}
		}, [valueToSet, value, onChange]);
		if (widgetType === "TextField") {
			return (
				<TextField
					value={valueToSet}
					disabled
					fullWidth
					variant="outlined"
					size="small"
					label={schema?.title}
				/>
			);
		}
		// Fallback to disabled text field
		return (
			<TextField
				value={valueToSet}
				disabled
				fullWidth
				variant="outlined"
				size="small"
				label={schema?.title}
			/>
		);
	}

	// If no dependency matched, check for global disabled
	if (options?.disabled) {
		const disabledValue =
			options.disabledValue !== undefined ? options.disabledValue : "";
		React.useEffect(() => {
			if (value !== disabledValue) {
				onChange(disabledValue);
			}
		}, [disabledValue, value, onChange]);
		return (
			<TextField
				value={disabledValue}
				disabled
				fullWidth
				variant="outlined"
				size="small"
				label={schema?.title}
			/>
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
		/>
	);
};

export default UniversalDependencyWidget;

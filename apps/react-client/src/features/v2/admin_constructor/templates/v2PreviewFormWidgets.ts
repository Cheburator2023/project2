import { AlgorithmComplexityWidget } from "@react-client/common/forms/widgets/AlgorithmComplexityWidget";
import { ArrayCustomCardListsWidget } from "@react-client/common/forms/widgets/ArrayCustomCardListsWidget";
import { NumberInputWidget } from "@react-client/common/forms/widgets/NumberInputWidget";
import { TextFieldCustomWidget } from "@react-client/common/forms/widgets/TextFieldCustomWidget";
import { UniversalDependencyWidget } from "@react-client/common/forms/widgets/UniversalDependencyWidget";
import { V2BooleanWidget } from "@react-client/common/forms/widgets/V2BooleanWidget";
import { V2UncertaintyModalWidget } from "@react-client/features/v2/anketaCRUD/widgets/V2UncertaintyModalWidget";
import { createElement } from "react";
import type { RegistryWidgetsType, WidgetProps } from "@rjsf/utils";

function SelectWidget(props: WidgetProps) {
	return createElement(TextFieldCustomWidget, { ...props, select: true });
}

function TextareaWidget(props: WidgetProps) {
	const rows =
		typeof props.options?.rows === "number" ? props.options.rows : undefined;
	return createElement(TextFieldCustomWidget, {
		...props,
		options: {
			...props.options,
			multiline: true,
			...(rows != null ? { rows, minRows: rows } : { minRows: 3 }),
		},
	});
}

/** Единые RJSF-виджеты v2 анкеты: алиасы `text`/`updown`/… + кастомные имена. */
export const v2AnketaFormWidgets: RegistryWidgetsType = {
	TextFieldCustomWidget,
	TextWidget: TextFieldCustomWidget,
	text: TextFieldCustomWidget,
	TextareaWidget,
	textarea: TextareaWidget,
	NumberInputWidget,
	UpDownWidget: NumberInputWidget,
	updown: NumberInputWidget,
	SelectWidget,
	select: SelectWidget,
	CheckboxWidget: V2BooleanWidget,
	checkbox: V2BooleanWidget,
	AlgorithmComplexityWidget,
	V2UncertaintyModalWidget,
	GeneralUncertaintyWidget: V2UncertaintyModalWidget,
	UniversalDependencyWidget,
	ArrayCustomCardListsWidget,
};

/** @deprecated Используйте `v2AnketaFormWidgets`; имя сохранено для совместимости. */
export const v2PreviewFormWidgets = v2AnketaFormWidgets;

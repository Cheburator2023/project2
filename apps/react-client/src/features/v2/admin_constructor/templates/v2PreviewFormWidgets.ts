import { AlgorithmComplexityWidget } from "@react-client/common/forms/widgets/AlgorithmComplexityWidget";
import { ArrayCustomCardListsWidget } from "@react-client/common/forms/widgets/ArrayCustomCardListsWidget";
import { GeneralUncertaintyWidget } from "@react-client/common/forms/widgets/GeneralUncertaintyWidget";
import { NumberInputWidget } from "@react-client/common/forms/widgets/NumberInputWidget";
import { TextFieldCustomWidget } from "@react-client/common/forms/widgets/TextFieldCustomWidget";
import { UniversalDependencyWidget } from "@react-client/common/forms/widgets/UniversalDependencyWidget";
import { createElement } from "react";
import type { RegistryWidgetsType, WidgetProps } from "@rjsf/utils";

function SelectWidget(props: WidgetProps) {
	return createElement(TextFieldCustomWidget, { ...props, select: true });
}

/** RJSF-виджеты для превью анкеты в конструкторе (те же имена, что в ui:widget). */
export const v2PreviewFormWidgets: RegistryWidgetsType = {
	TextFieldCustomWidget,
	NumberInputWidget,
	SelectWidget,
	select: SelectWidget,
	AlgorithmComplexityWidget,
	GeneralUncertaintyWidget,
	UniversalDependencyWidget,
	ArrayCustomCardListsWidget,
};

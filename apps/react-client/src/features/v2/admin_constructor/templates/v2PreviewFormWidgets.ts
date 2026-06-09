import { AlgorithmComplexityWidget } from "@react-client/common/forms/widgets/AlgorithmComplexityWidget";
import { ArrayCustomCardListsWidget } from "@react-client/common/forms/widgets/ArrayCustomCardListsWidget";
import { V2UncertaintyModalWidget } from "@react-client/features/v2/anketaCRUD/widgets/V2UncertaintyModalWidget";
import { NumberInputWidget } from "@react-client/common/forms/widgets/NumberInputWidget";
import { TextFieldCustomWidget } from "@react-client/common/forms/widgets/TextFieldCustomWidget";
import { UniversalDependencyWidget } from "@react-client/common/forms/widgets/UniversalDependencyWidget";
import { createElement } from "react";
import type { RegistryWidgetsType, WidgetProps } from "@rjsf/utils";

function SelectWidget(props: WidgetProps) {
	return createElement(TextFieldCustomWidget, { ...props, select: true });
}

/** Единые RJSF-виджеты v2 анкеты: те же имена, что в `ui:widget`. */
export const v2AnketaFormWidgets: RegistryWidgetsType = {
	TextFieldCustomWidget,
	NumberInputWidget,
	SelectWidget,
	select: SelectWidget,
	AlgorithmComplexityWidget,
	V2UncertaintyModalWidget,
	GeneralUncertaintyWidget: V2UncertaintyModalWidget,
	UniversalDependencyWidget,
	ArrayCustomCardListsWidget,
};

/** @deprecated Используйте `v2AnketaFormWidgets`; имя сохранено для совместимости. */
export const v2PreviewFormWidgets = v2AnketaFormWidgets;

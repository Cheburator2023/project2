import { IS_DEV } from "@react-client/common/constants/dev";
import {
	V2FinalEvaluationPanel,
	type V2SummaryFormSlice,
} from "@react-client/features/v2/admin_constructor/organisms/V2FinalEvaluationPanel";
import type {
	CalculationItem,
	TaskTriggerItem,
} from "@react-client/features/v2/admin_constructor/utils/calculationEngine";

export const FinalScoreCard = ({
	summary,
	formData,
	calculationError,
	isLoading,
	calculationItems,
	taskTriggerItems,
	uiSchema,
	liveFormData,
	onExportExcel,
	hideWorkEstimates = false,
}: {
	summary?: V2SummaryFormSlice | null;
	formData?: Record<string, unknown> | null;
	calculationError?: string | null;
	isLoading?: boolean;
	calculationItems?: CalculationItem[];
	taskTriggerItems?: TaskTriggerItem[];
	uiSchema?: Record<string, unknown>;
	liveFormData?: Record<string, unknown> | null;
	onExportExcel?: () => void;
	/** Валидатор: скрыть оценки работ (§2 уровень B / без оценок). */
	hideWorkEstimates?: boolean;
}) => {
	const devCaption =
		IS_DEV && (calculationItems?.length || taskTriggerItems?.length)
			? `dev: ${calculationItems?.length ?? 0} calc · ${taskTriggerItems?.length ?? 0} triggers`
			: undefined;

	return (
		<V2FinalEvaluationPanel
			summary={hideWorkEstimates ? null : summary}
			formData={hideWorkEstimates ? null : formData}
			calculationError={calculationError}
			isLoading={isLoading}
			compact
			engineCaption={devCaption}
			uiSchema={hideWorkEstimates ? undefined : uiSchema}
			liveFormData={hideWorkEstimates ? null : liveFormData}
			onExportExcel={onExportExcel}
			hideDetailedEstimates={hideWorkEstimates}
		/>
	);
};

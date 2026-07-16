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
}: {
	summary?: V2SummaryFormSlice | null;
	formData?: Record<string, unknown> | null;
	calculationError?: string | null;
	isLoading?: boolean;
	calculationItems?: CalculationItem[];
	taskTriggerItems?: TaskTriggerItem[];
	uiSchema?: Record<string, unknown>;
	liveFormData?: Record<string, unknown> | null;
}) => {
	const devCaption =
		IS_DEV && (calculationItems?.length || taskTriggerItems?.length)
			? `dev: ${calculationItems?.length ?? 0} calc · ${taskTriggerItems?.length ?? 0} triggers`
			: undefined;

	return (
		<V2FinalEvaluationPanel
			summary={summary}
			formData={formData}
			calculationError={calculationError}
			isLoading={isLoading}
			compact
			engineCaption={devCaption}
			uiSchema={uiSchema}
			liveFormData={liveFormData}
		/>
	);
};

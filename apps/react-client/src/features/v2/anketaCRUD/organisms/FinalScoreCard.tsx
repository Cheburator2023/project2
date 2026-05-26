import {
	V2FinalEvaluationPanel,
	type V2SummaryFormSlice,
} from "@react-client/features/v2/admin_constructor/organisms/V2FinalEvaluationPanel";

export const FinalScoreCard = ({
	summary,
	isLoading,
}: {
	summary?: V2SummaryFormSlice | null;
	isLoading?: boolean;
}) => {
	return (
		<V2FinalEvaluationPanel
			summary={summary}
			isLoading={isLoading}
			compact
		/>
	);
};

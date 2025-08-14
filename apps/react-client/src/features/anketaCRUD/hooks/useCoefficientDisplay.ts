import { useMemo } from "react";
import {
	coefficientDisplayNames,
	coefficientToFormFieldMapping,
} from "../constants/coefficientMappings";
import { assessmentCalculationsStore } from "../stores/assessmentCalculationsStore";

interface CoefficientDisplayInfo {
	fieldName: string;
	coefficientName: string;
	coefficientValue: number;
	displayLabel: string;
}

export const useCoefficientDisplay = () => {
	const { coefficients } = assessmentCalculationsStore();

	const coefficientDisplayInfo = useMemo<CoefficientDisplayInfo[]>(() => {
		return Object.entries(coefficients).map(([coefficientKey, value]) => {
			const fieldName =
				coefficientToFormFieldMapping[coefficientKey] || coefficientKey;
			const displayLabel =
				coefficientDisplayNames[coefficientKey] || coefficientKey;

			return {
				fieldName,
				coefficientName: coefficientKey,
				coefficientValue: value,
				displayLabel,
			};
		});
	}, [coefficients]);

	const getCoefficientForField = (
		fieldName: string,
	): CoefficientDisplayInfo | undefined => {
		return coefficientDisplayInfo.find((info) => info.fieldName === fieldName);
	};

	const formatCoefficientLabel = (
		originalLabel: string,
		fieldName: string,
	): string => {
		const coefficientInfo = getCoefficientForField(fieldName);
		if (coefficientInfo && coefficientInfo.coefficientValue !== 0) {
			return `${originalLabel} (коэф: ${coefficientInfo.coefficientValue.toFixed(2)})`;
		}
		return originalLabel;
	};

	return {
		coefficientDisplayInfo,
		getCoefficientForField,
		formatCoefficientLabel,
	};
};

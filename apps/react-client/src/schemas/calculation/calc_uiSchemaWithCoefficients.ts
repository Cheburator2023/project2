import { UiSchema } from "@rjsf/utils";
import { calc_uiSchema } from "./calc_uiSchema";
import {
	coefficientDisplayNames,
	coefficientToFormFieldMapping,
} from "../../features/anketaCRUD/constants/coefficientMappings";
import { mainCalcSchema } from "@react-client/schemas";

interface CoefficientData {
	[key: string]: number;
}

interface EnhancedSchemaResult {
	uiSchema: UiSchema;
	schema: any;
}

export const createSchemaWithCoefficients = (
	coefficients: CoefficientData,
): EnhancedSchemaResult => {
	const enhancedUiSchema: any = JSON.parse(JSON.stringify(calc_uiSchema));
	const enhancedSchema: any = JSON.parse(JSON.stringify(mainCalcSchema));

	for (const [coefficientKey, fieldName] of Object.entries(
		coefficientToFormFieldMapping,
	)) {
		const coefficientValue = coefficients[coefficientKey];
		const displayName = (coefficientDisplayNames as any)[coefficientKey];

		if (coefficientValue !== undefined && displayName) {
			const fieldNameStr = fieldName as string;

			if (!enhancedUiSchema[fieldNameStr]) {
				enhancedUiSchema[fieldNameStr] = {};
			}

			if (!enhancedUiSchema[fieldNameStr]["ui:options"]) {
				enhancedUiSchema[fieldNameStr]["ui:options"] = {};
			}

			const currentTooltip =
				enhancedUiSchema[fieldNameStr]["ui:options"]?.tooltip || "";
			const coefficientInfo = `\n\nТекущий коэффициент: ${displayName} = ${coefficientValue.toFixed(2)}`;

			enhancedUiSchema[fieldNameStr]["ui:options"].tooltip =
				currentTooltip + coefficientInfo;
			enhancedUiSchema[fieldNameStr]["ui:options"].coefficientValue =
				coefficientValue;
			enhancedUiSchema[fieldNameStr]["ui:options"].coefficientName =
				displayName;

			if (
				enhancedSchema.properties &&
				enhancedSchema.properties[fieldNameStr]
			) {
				const originalTitle =
					enhancedSchema.properties[fieldNameStr].title || fieldNameStr;
				enhancedSchema.properties[fieldNameStr].title =
					`${originalTitle} (коэфф: ${coefficientValue.toFixed(2)})`;
			}
		}
	}

	return {
		uiSchema: enhancedUiSchema,
		schema: enhancedSchema,
	};
};

export const createUiSchemaWithCoefficients = (
	coefficients: CoefficientData,
): UiSchema => {
	return createSchemaWithCoefficients(coefficients).uiSchema;
};

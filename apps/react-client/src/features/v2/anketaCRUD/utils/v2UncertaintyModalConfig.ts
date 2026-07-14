import {
	V2_UNCERTAINTY_RISK_GROUP_LABELS,
} from "@smart-anketa/api-contract";
import { GENERAL_UNCERTAINTY_TOOLTIPS } from "@react-client/features/v2/admin_constructor/schemaEditor/fieldTypePresets";

/** Порядок полей riskGroup — совпадает с ui:order в uncertaintyCalculation. */
const UNCERTAINTY_RISK_GROUP_ORDER = [
	"businessComplexity",
	"defectsInSolution",
	"adjacentProjectsImpact",
	"laborCostIncrease",
	"thirdPartyNegligence",
	"staffShortage",
	"sanctions",
	"controlProceduresLack",
	"regulatoryChanges",
	"isNotUsedAfterProject",
	"itArchitectureChanges",
] as const;

/** Ключи riskGroup в uncertaintyCalculation → id полей модалки. */
export const UNCERTAINTY_SCHEMA_KEY_TO_MODAL_RISK_ID: Record<string, string> = {
	businessComplexity: "business_change",
	defectsInSolution: "solution_defects",
	adjacentProjectsImpact: "adjacent_projects",
	laborCostIncrease: "labor_growth",
	thirdPartyNegligence: "contractor_risk",
	staffShortage: "staff_shortage",
	sanctions: "sanctions",
	controlProceduresLack: "lack_of_controls",
	regulatoryChanges: "regulatory_changes",
	isNotUsedAfterProject: "post_project_usage",
	itArchitectureChanges: "target_architecture",
};

export const UNCERTAINTY_MODAL_RISK_ID_TO_SCHEMA_KEY = Object.fromEntries(
	Object.entries(UNCERTAINTY_SCHEMA_KEY_TO_MODAL_RISK_ID).map(
		([schemaKey, modalId]) => [modalId, schemaKey],
	),
);

export type UncertaintyModalRiskOption = {
	id: string;
	label: string;
	tooltip?: string;
};

/** Группы рисков для TotalUncertaintyModal — полные подписи из схемы/CSV. */
export function buildUncertaintyModalRiskGroups(): UncertaintyModalRiskOption[] {
	return UNCERTAINTY_RISK_GROUP_ORDER.map((schemaKey, index) => ({
		id: UNCERTAINTY_SCHEMA_KEY_TO_MODAL_RISK_ID[schemaKey] ?? schemaKey,
		label: V2_UNCERTAINTY_RISK_GROUP_LABELS[schemaKey] ?? schemaKey,
		tooltip: GENERAL_UNCERTAINTY_TOOLTIPS[index],
	}));
}

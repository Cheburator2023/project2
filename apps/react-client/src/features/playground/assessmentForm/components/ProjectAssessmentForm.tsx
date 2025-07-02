import { withTheme } from "@rjsf/core";
import type { IChangeEvent } from "@rjsf/core";
import { Theme as MuiTheme } from "@rjsf/mui";
import type { RJSFSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import React, { useState } from "react";
import { useAssessmentCalculations } from "../hooks/useAssessmentCalculations";
import schema from "../schemas/calc_schema.json";
import uiSchema from "../schemas/calc_uiSchema";
import type { FormData } from "../types/FormData";
import AlgorithmComplexityWidget from "../widgets/AlgorithmComplexityWidget";
import GeneralUncertaintyWidget from "../widgets/GeneralUncertaintyWidget";
import NumberInputWidget from "../widgets/NumberInputWidget";
import ProductionDeploymentChannelsWidget from "../widgets/ProductionDeploymentChannelsWidget";
import UniversalDependencyWidget from "../widgets/UniversalDependencyWidget";
import StageResultsSidebar from "./StageResultsSidebar";

const Form = withTheme(MuiTheme);

const widgets = {
	AlgorithmComplexityWidget,
	GeneralUncertaintyWidget,
	ProductionDeploymentChannelsWidget,
	NumberInputWidget,
	UniversalDependencyWidget,
};

const ProjectAssessmentForm: React.FC = () => {
	const [formData, setFormData] = useState<FormData>({
		modelsCount: 1,
		algorithmComplexity: [{ algorithmType: "" }],
		setupComplexity: "",
		readyPromReports: "",
		assessedInitiativesCount: 1,
		dataSourcesCount: "1",
		pilotModelRequired: "Не требуется",
		pilotSupportRequired: "Не требуется",
		autoMlRequired: "Не требуется",
		productionAdditionalReports: "1",
		productionDeploymentChannels: [],
		generalUncertainty: [],
	});

	const { coefficients, stageResults } = useAssessmentCalculations(formData);

	const handleSubmit = (e: IChangeEvent<FormData>) => {
		console.log("Submitted data:", e.formData);
		if (e.formData) {
			setFormData(e.formData);
		}
	};

	const handleChange = (e: IChangeEvent<FormData>) => {
		if (e.formData) {
			setFormData(e.formData);
		}
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "flex-start",
				width: "100%",
				maxWidth: 1280,
				margin: "auto",
			}}
		>
			<div style={{ flex: 1, padding: 24 }}>
				<h2 style={{ marginBottom: 24 }}>{schema.title}</h2>
				<Form
					schema={schema as RJSFSchema}
					uiSchema={uiSchema}
					validator={validator}
					widgets={widgets}
					formData={formData}
					formContext={{ formData }}
					onChange={handleChange}
					onSubmit={handleSubmit}
				/>
			</div>
			<StageResultsSidebar results={stageResults} coefficients={coefficients} />
		</div>
	);
};

export default ProjectAssessmentForm;

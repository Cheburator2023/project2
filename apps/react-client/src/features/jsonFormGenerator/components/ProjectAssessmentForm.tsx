import { withTheme } from "@rjsf/core";
import type FormRef from "@rjsf/core";

import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { MultiSelectAutocompleteWidget } from "@react-client/features/anketa/molecules/MultiSelectAutocompleteWidget";
import type { IChangeEvent } from "@rjsf/core";
import { Theme as MuiTheme } from "@rjsf/mui";
import type { RJSFSchema } from "@rjsf/utils";
import React, { createRef, useState } from "react";
import schema from "../schemas/calc_schema.json";
import uiSchema from "../schemas/calc_uiSchema";
import type { FormData } from "../types/FormData";
import AlgorithmComplexityWidget from "../widgets/AlgorithmComplexityWidget";
import GeneralUncertaintyWidget from "../widgets/GeneralUncertaintyWidget";
import NumberInputWidget from "../widgets/NumberInputWidget";
import ProductionDeploymentChannelsWidget from "../widgets/ProductionDeploymentChannelsWidget";
import UniversalDependencyWidget from "../widgets/UniversalDependencyWidget";

const Form = withTheme(MuiTheme);

const widgets = {
	AlgorithmComplexityWidget,
	GeneralUncertaintyWidget,
	ProductionDeploymentChannelsWidget,
	NumberInputWidget,
	UniversalDependencyWidget,
	MultiSelectAutocompleteWidget,
};

export const ProjectAssessmentForm: React.FC<{ isCreate?: boolean }> = ({
	isCreate,
}) => {
	const formRef = createRef<FormRef>();

	const readonly = !isCreate;

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
		<Form
			ref={formRef}
			schema={schema as RJSFSchema}
			uiSchema={uiSchema}
			validator={validatorRu}
			widgets={widgets}
			formData={formData}
			formContext={{ formData }}
			onChange={handleChange}
			onSubmit={handleSubmit}
			liveValidate={!readonly}
			noHtml5Validate
			readonly={readonly}
			showErrorList={false}
		/>
	);
};

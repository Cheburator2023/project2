import { IAssessmentFormData } from "@react-client/features/jsonFormGenerator/types/FormData";
import type FormRef from "@rjsf/core";
import { create } from "zustand";

export interface IBasicFormData {
	name: string;
	rfd?: string;
	streamExecutor: string;
	department: string[];
	customerName?: string;
	comment?: string;
	relatedModels?: string[];
	status?: string;
	createdAt?: string;
	id?: string;
	author?: string;
}

export const basicInfoFormInitialData: IBasicFormData = {
	name: "",
	rfd: "",
	streamExecutor: "",
	department: [],
	customerName: "",
	comment: "",
	relatedModels: [],
	id: "",
	author: "",
};

export const projectAssessmentFormInitialData: IAssessmentFormData = {
	modelsCount: 1,
	algorithmComplexity: [{ algorithmType: "" }],
	setupComplexity: "",
	readyPromReports: "",
	assessedInitiativesCount: 1,
	dataSourcesCount: "",
	pilotModelRequired: "",
	pilotSupportRequired: "",
	autoMlRequired: "",
	productionAdditionalReports: "Не требуется",
	productionDeploymentChannels: [],
	generalUncertainty: [],
};

export type FormName =
	| "anketaCreate_basicInfoForm"
	| "anketaPreview_basicInfoForm"
	| "anketaCreate_projectAssessmentForm"
	| "anketaPreview_projectAssessmentForm";

export enum AnketaCRUDFormNames {
	anketaCreate_basicInfoForm = "anketaCreate_basicInfoForm",
	anketaPreview_basicInfoForm = "anketaPreview_basicInfoForm",
	anketaCreate_projectAssessmentForm = "anketaCreate_projectAssessmentForm",
	anketaPreview_projectAssessmentForm = "anketaPreview_projectAssessmentForm",
}
interface FormData<T> {
	api: FormRef | undefined;
	state?: T | {};
	isDirty: boolean;
}

type AnketaCRUDFormsStoreType = {
	[key in FormName]: FormData<AnketaCreateData | AnketaPreviewData>;
};

type AnketaCRUDFormsStoreBase = {
	calculationResult: (
		| {
				stageName: string;
				score: number;
				stageBaseValue: number;
				disabled?: undefined;
				percentFromAverage?: undefined;
				offset?: undefined;
		  }
		| {
				stageName: string;
				score: number;
				disabled: boolean;
				stageBaseValue: number;
				percentFromAverage: number;
				offset: number;
		  }
	)[];
};

interface AnketaCRUDFormsStore
	extends AnketaCRUDFormsStoreType,
		AnketaCRUDFormsStoreBase {
	updateFormState: (formName: FormName, state?: any) => void;
	resetFormData: (formName: FormName) => void;
	setApiRef: (formName: FormName, api: FormRef) => void;
	resetApiRef: (formName: FormName) => void;
	setCalculationResult: (result: any) => void;
	setFormDirty: (formName: FormName, isDirty: boolean) => void;
}

type AnketaCreateData = any;
type AnketaPreviewData = any;

export const useAnketaCRUDFormsStore = create<AnketaCRUDFormsStore>((set) => ({
	anketaCreate_basicInfoForm: {
		api: undefined,
		state: undefined,
		isDirty: false,
		initialData: basicInfoFormInitialData,
	},
	anketaPreview_basicInfoForm: {
		api: undefined,
		state: undefined,
		isDirty: false,
		initialData: basicInfoFormInitialData,
	},
	anketaCreate_projectAssessmentForm: {
		api: undefined,
		state: undefined,
		isDirty: false,
		initialData: projectAssessmentFormInitialData,
	},
	anketaPreview_projectAssessmentForm: {
		api: undefined,
		state: undefined,
		isDirty: false,
		initialData: projectAssessmentFormInitialData,
	},

	calculationResult: [],

	setFormDirty: (formName, isDirty) =>
		set((_state) => ({ [formName]: { ..._state[formName], isDirty } })),

	setCalculationResult: (result: any) =>
		set((_state) => ({ calculationResult: result })),

	updateFormState: (formName, newState) =>
		set((_state) => ({ [formName]: { ..._state[formName], state: newState } })),

	resetFormData: (formName) =>
		set((_state) => ({
			[formName]: {
				..._state[formName],
				api: undefined,
				state: undefined,
				isLoading: false,
			},
		})),

	setApiRef: (formName, api) =>
		set((_state) => ({ [formName]: { ..._state[formName], api } })),

	resetApiRef: (formName) =>
		set((_state) => ({ [formName]: { ..._state[formName], api: undefined } })),
}));

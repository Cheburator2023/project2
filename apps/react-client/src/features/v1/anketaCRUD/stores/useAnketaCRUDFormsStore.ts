import { IAssessmentFormData } from "@react-client/features/v1/anketaCRUD/types/FormData";
import type FormRef from "@rjsf/core";
import { create } from "zustand";

const _IS_DEV = process.env.NODE_ENV === "development";
export interface IBasicFormData {
	calcName: string;
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
	calcName: "",
	rfd: "",
	streamExecutor: "",
	department: [],
	customerName: "",
	comment: "",
	relatedModels: [],
	id: "",
	author: "",
	createdAt: "",
};

export const projectAssessmentFormInitialData: IAssessmentFormData = {
	modelDeveloped: "Нет",
	modelsCount: 1,
	algorithmComplexity: [{ algorithmType: "" }],
	uncertaintyAdjustment: 0,
	setupComplexity: "",
	readyPromReports: "",
	initiativeCost: "",
	initiativeTimeline: "",
	assessedInitiativesCount: 1,
	dataSourcesCount: "",
	pilotModelRequired: "Не требуется",
	pilotSupportRequired: "Не требуется",
	autoMlRequired: "",
	productionAdditionalReports: "",
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
	wasValidated: boolean;
	isValid: boolean;
	isSubmitting: boolean;
	submitCount: number;
	errors: Record<string, string>;
	hasErrors: boolean;
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
	reset: () => void;
	setApiRef: (formName: FormName, api: FormRef) => void;
	resetApiRef: (formName: FormName) => void;
	setCalculationResult: (result: any) => void;
	setFormDirty: (formName: FormName, isDirty: boolean) => void;
	setFormValidated: (formName: FormName, wasValidated: boolean) => void;
	setFormValid: (formName: FormName, isValid: boolean) => void;
	setFormSubmitting: (formName: FormName, isSubmitting: boolean) => void;
	incrementSubmitCount: (formName: FormName) => void;
	resetSubmitCount: (formName: FormName) => void;
	setFormError: (formName: FormName, field: string, error: string) => void;
	clearFormError: (formName: FormName, field: string) => void;
	clearAllFormErrors: (formName: FormName) => void;
	setFormErrors: (formName: FormName, errors: Record<string, string>) => void;
}

type AnketaCreateData = any;
type AnketaPreviewData = any;

const init = {
	anketaCreate_basicInfoForm: {
		api: undefined,
		state: undefined,
		isDirty: false,
		wasValidated: false,
		isValid: false,
		isSubmitting: false,
		submitCount: 0,
		errors: {},
		hasErrors: false,
		initialData: basicInfoFormInitialData,
	},
	anketaPreview_basicInfoForm: {
		api: undefined,
		state: undefined,
		isDirty: false,
		wasValidated: false,
		isValid: false,
		isSubmitting: false,
		submitCount: 0,
		errors: {},
		hasErrors: false,
		initialData: basicInfoFormInitialData,
	},
	anketaCreate_projectAssessmentForm: {
		api: undefined,
		state: undefined,
		isDirty: false,
		wasValidated: false,
		isValid: false,
		isSubmitting: false,
		submitCount: 0,
		errors: {},
		hasErrors: false,
		initialData: projectAssessmentFormInitialData,
	},
	anketaPreview_projectAssessmentForm: {
		api: undefined,
		state: undefined,
		isDirty: false,
		wasValidated: false,
		isValid: false,
		isSubmitting: false,
		submitCount: 0,
		errors: {},
		hasErrors: false,
		initialData: projectAssessmentFormInitialData,
	},

	calculationResult: [],
};

export const useAnketaCRUDFormsStore = create<AnketaCRUDFormsStore>((set) => ({
	...init,
	setFormDirty: (formName, isDirty) =>
		set((_state) => ({ [formName]: { ..._state[formName], isDirty } })),
	setFormValidated: (formName, wasValidated) =>
		set((_state) => ({ [formName]: { ..._state[formName], wasValidated } })),

	setFormValid: (formName, isValid) =>
		set((_state) => ({ [formName]: { ..._state[formName], isValid } })),

	setCalculationResult: (result: any) =>
		set((_state) => ({ calculationResult: result })),

	updateFormState: (formName, newState) =>
		set((_state) => ({ [formName]: { ..._state[formName], state: newState } })),

	reset: () => set(() => init),
	setApiRef: (formName, api) =>
		set((_state) => ({ [formName]: { ..._state[formName], api } })),

	resetApiRef: (formName) =>
		set((_state) => ({ [formName]: { ..._state[formName], api: undefined } })),

	setFormSubmitting: (formName, isSubmitting) =>
		set((_state) => ({ [formName]: { ..._state[formName], isSubmitting } })),

	incrementSubmitCount: (formName) =>
		set((_state) => ({
			[formName]: {
				..._state[formName],
				submitCount: _state[formName].submitCount + 1,
			},
		})),

	resetSubmitCount: (formName) =>
		set((_state) => ({ [formName]: { ..._state[formName], submitCount: 0 } })),

	setFormError: (formName, field, error) =>
		set((_state) => ({
			[formName]: {
				..._state[formName],
				errors: { ..._state[formName].errors, [field]: error },
				hasErrors: true,
			},
		})),

	clearFormError: (formName, field) =>
		set((_state) => {
			const newErrors = { ..._state[formName].errors };
			delete newErrors[field];
			const hasErrors = Object.keys(newErrors).length > 0;
			return {
				[formName]: {
					..._state[formName],
					errors: newErrors,
					hasErrors,
				},
			};
		}),

	clearAllFormErrors: (formName) =>
		set((_state) => ({
			[formName]: {
				..._state[formName],
				errors: {},
				hasErrors: false,
			},
		})),

	setFormErrors: (formName, errors) =>
		set((_state) => ({
			[formName]: {
				..._state[formName],
				errors,
				hasErrors: Object.keys(errors).length > 0,
			},
		})),
}));

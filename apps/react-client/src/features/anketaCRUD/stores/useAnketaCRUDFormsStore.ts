import type FormRef from "@rjsf/core";
import { create } from "zustand";

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
	calculationResult: any;
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
	},
	anketaPreview_basicInfoForm: {
		api: undefined,
		state: undefined,
		isDirty: false,
	},
	anketaCreate_projectAssessmentForm: {
		api: undefined,
		state: undefined,
		isDirty: false,
	},
	anketaPreview_projectAssessmentForm: {
		api: undefined,
		state: undefined,
		isDirty: false,
	},

	calculationResult: undefined,

	setFormDirty: (formName, isDirty) =>
		set((_state) => ({ [formName]: { ..._state[formName], isDirty } })),

	setCalculationResult: (result: any) =>
		set((_state) => ({ calculationResult: result })),

	updateFormState: (formName, newState) =>
		set((_state) => ({ [formName]: { ..._state[formName], state: newState } })),

	resetFormData: (formName) =>
		set((_state) => ({
			[formName]: {
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

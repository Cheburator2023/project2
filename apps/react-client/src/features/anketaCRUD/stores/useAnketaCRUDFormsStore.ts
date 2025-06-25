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
	isLoading: boolean;
}

type AnketaCRUDFormsStoreType = {
	[key in FormName]: FormData<AnketaCreateData | AnketaPreviewData>;
};

interface AnketaCRUDFormsStore extends AnketaCRUDFormsStoreType {
	updateFormState: (formName: FormName, state?: any) => void;
	resetFormData: (formName: FormName) => void;
	setApiRef: (formName: FormName, api: FormRef) => void;
	resetApiRef: (formName: FormName) => void;
}

type AnketaCreateData = any;
type AnketaPreviewData = any;

export const useAnketaCRUDFormsStore = create<AnketaCRUDFormsStore>((set) => ({
	anketaCreate_basicInfoForm: {
		api: undefined,
		state: undefined,
		isLoading: false,
	},
	anketaPreview_basicInfoForm: {
		api: undefined,
		state: undefined,
		isLoading: false,
	},
	anketaCreate_projectAssessmentForm: {
		api: undefined,
		state: undefined,
		isLoading: false,
	},
	anketaPreview_projectAssessmentForm: {
		api: undefined,
		state: undefined,
		isLoading: false,
	},

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

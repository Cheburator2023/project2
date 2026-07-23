import type {
	ErrorSchema,
	FormContextType,
	RJSFSchema,
	StrictRJSFSchema,
	UiSchema,
	ValidationData,
	ValidatorType,
} from "@rjsf/utils";

const EMPTY_VALIDATION: ValidationData<Record<string, unknown>> = {
	errors: [],
	errorSchema: {} as ErrorSchema<Record<string, unknown>>,
};

/**
 * RJSF-валидатор без AJV: не вызывает `new Function()` (CSP / «Error compiling schema»).
 * Для модалок анкеты достаточно своей проверки required + omit пустых optional.
 */
export const anketaModalNoAjvValidator: ValidatorType<
	Record<string, unknown>,
	RJSFSchema,
	FormContextType
> = {
	validateFormData(
		_formData,
		_schema,
		_customValidate?,
		_transformErrors?,
		_uiSchema?: UiSchema,
	): ValidationData<Record<string, unknown>> {
		return EMPTY_VALIDATION;
	},
	isValid(_schema, _formData, _rootSchema): boolean {
		return true;
	},
	rawValidation<Result = unknown>(
		_schema: StrictRJSFSchema,
		_formData?: Record<string, unknown>,
	): { errors?: Result[]; validationError?: Error } {
		return { errors: [] };
	},
};

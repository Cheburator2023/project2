interface ValidationError {
	name: string;
	message: string;
	property?: string;
	instancePath?: string;
}

interface FieldUiSchema {
	"ui:options"?: {
		errors?: Record<string, string>;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

export function transformErrors(
	errors: ValidationError[],
	uiSchema: Record<string, FieldUiSchema>,
): ValidationError[] {
	return errors.map((error: ValidationError) => {
		const fieldPath =
			error.property?.replace(".", "") ||
			error.instancePath?.replace(/^\//, "");

		const fieldUiSchema = fieldPath ? uiSchema[fieldPath] : null;

		if (fieldUiSchema?.["ui:options"]?.errors?.[error.name]) {
			error.message = fieldUiSchema["ui:options"].errors[error.name];
		} else if (
			error.name === "pattern" &&
			fieldUiSchema?.["ui:options"]?.errors?.pattern
		) {
			error.message = fieldUiSchema["ui:options"].errors.pattern;
		}

		return error;
	});
}

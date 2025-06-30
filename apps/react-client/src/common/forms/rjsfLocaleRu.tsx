import { customizeValidator } from "@rjsf/validator-ajv8";
import type { ErrorObject } from "ajv";

function localize_ru(errors: null | ErrorObject[] = []) {
	if (!errors?.length) return;
	errors.forEach((error) => {
		let outMessage = "";

		switch (error.keyword) {
			case "pattern": {
				outMessage = `должно соответствовать образцу "${error.params.pattern}"`;
				break;
			}
			case "required": {
				outMessage = "поле обязательно для заполнения";
				break;
			}
			case "minLength": {
				outMessage = `минимальная длина ${error.params.limit}`;
				break;
			}
			case "maxLength": {
				outMessage = `максимальная длина ${error.params.limit}`;
				break;
			}
			case "type": {
				outMessage = `должно соответствовать типу ${error.params.type}`;
				break;
			}
			case "format": {
				outMessage = `должно соответствовать формату ${error.params.format}`;
				break;
			}
			case "enum": {
				outMessage = `должно быть одним из значений: ${error.params.enum}`;
				break;
			}
			case "minimum": {
				outMessage = `минимальное значение ${error.params.minimum}`;
				break;
			}
			case "maximum": {
				outMessage = `максимальное значение ${error.params.maximum}`;
				break;
			}
			case "multipleOf": {
				outMessage = `должно быть кратным ${error.params.multipleOf}`;
				break;
			}
			case "const": {
				outMessage = `должно быть равно ${error.params.const}`;
				break;
			}
			default:
				outMessage = error.message || "Произошла ошибка валидации";
		}

		error.message = outMessage;
	});
}

export const validatorRu = customizeValidator({}, localize_ru);

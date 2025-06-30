import { customizeValidator } from "@rjsf/validator-ajv8";
import type { ErrorObject } from "ajv";

function localize_ru(errors: null | ErrorObject[] = []) {
	if (!errors?.length) return;
	errors.forEach((error) => {
		let outMessage = "";

		switch (error.keyword) {
			case "pattern": {
				outMessage = `Должно соответствовать образцу "${error.params.pattern}"`;
				break;
			}
			case "required": {
				outMessage = "Поле обязательно для заполнения";
				break;
			}
			case "minLength": {
				outMessage = `Поле обязательно для заполнения. Минимальная длина значения - ${error.params.limit}`;
				break;
			}
			case "maxLength": {
				outMessage = `Поле обязательно для заполнения. Максимальная длина значения - ${error.params.limit}`;
				break;
			}
			case "type": {
				outMessage = `Должно соответствовать типу ${error.params.type}`;
				break;
			}
			case "format": {
				outMessage = `Должно соответствовать формату ${error.params.format}`;
				break;
			}
			case "enum": {
				outMessage = `Выберите одно из значений`;
				break;
			}
			case "minimum": {
				outMessage = `Минимальное значение ${error.params.minimum}`;
				break;
			}
			case "maximum": {
				outMessage = `Максимальное значение ${error.params.maximum}`;
				break;
			}
			case "multipleOf": {
				outMessage = `Должно быть кратным ${error.params.multipleOf}`;
				break;
			}
			case "const": {
				outMessage = `Должно быть равно ${error.params.const}`;
				break;
			}
			default:
				outMessage = error.message || "Произошла ошибка валидации";
		}

		error.message = outMessage;
	});
}

export const validatorRu = customizeValidator({}, localize_ru);

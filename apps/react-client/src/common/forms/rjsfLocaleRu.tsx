import { regexpToHuman } from "@react-client/utils/regexpToHuman";
import { customizeValidator } from "@rjsf/validator-ajv8";
import type { ErrorObject } from "ajv";

function localize_ru(errors: null | ErrorObject[] = []) {
	if (!errors?.length) return;
	errors.forEach((error) => {
		let outMessage = "";

		switch (error.keyword) {
			case "pattern": {
				outMessage = `${regexpToHuman(error.params.pattern, {
					required: true,
				})}`;
				break;
			}
			case "required": {
				outMessage = "Поле обязательно для заполнения";
				break;
			}
			case "minLength": {
				outMessage = `Минимальная длина значения - ${error.params.limit}`;
				break;
			}
			case "maxLength": {
				outMessage = `Максимальная длина значения - ${error.params.limit}`;
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
			case "additionalProperties": {
				outMessage = `Должно быть равно ${error.params.additionalProperties}`;
				break;
			}
			case "minItems": {
				outMessage = `Минимальное количество элементов ${error.params.limit}`;
				break;
			}
			case "contains": {
				outMessage = `Выберите хотя бы одно значение`;
				break;
			}
			default:
				outMessage = error.message || "Произошла ошибка валидации";
		}

		error.message = outMessage;
	});
}

export const validatorRu = customizeValidator({}, localize_ru);

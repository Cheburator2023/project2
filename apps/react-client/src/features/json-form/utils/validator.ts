import { customizeValidator } from "@rjsf/validator-ajv8";

const customFormats = {
	year: /^(19|20)\d{2}$/g,
};

const validator = customizeValidator({ customFormats });

export default validator;

import { Theme as MuiTheme } from "@rjsf/mui";
import v8Validator, { customizeValidator } from "@rjsf/validator-ajv8";
import Ajv2019 from "ajv/dist/2019.js";
import Ajv2020 from "ajv/dist/2020.js";
import PlaygroundComp, { type PlaygroundProps } from "./components";

const esV8Validator = customizeValidator({});
const AJV8_2019 = customizeValidator({ AjvClass: Ajv2019 });
const AJV8_2020 = customizeValidator({ AjvClass: Ajv2020 });
const AJV8_DISC = customizeValidator({
	ajvOptionsOverrides: { discriminator: true },
});
const AJV8_DATA_REF = customizeValidator({
	ajvOptionsOverrides: { $data: true },
});

const validators: PlaygroundProps["validators"] = {
	AJV8: v8Validator,
	"AJV8 $data reference": AJV8_DATA_REF,
	"AJV8 (discriminator)": AJV8_DISC,
	AJV8_es: esV8Validator,
	"AJV8 (2019)": AJV8_2019,
	"AJV8 (2020)": AJV8_2020,
};

const themes: PlaygroundProps["themes"] = {
	default: {
		stylesheet: "",
		theme: MuiTheme,
	},
	mui: {
		stylesheet: "",
		theme: MuiTheme,
	},
};

export function PlaygroundRJSF() {
	return (
		<PlaygroundComp
			themes={themes}
			validators={validators}
			data-test-id="playground-r-j-s-f--PlaygroundComp-0"
		/>
	);
}

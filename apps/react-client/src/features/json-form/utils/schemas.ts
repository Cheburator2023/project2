import { RJSFSchema, UiSchema } from "@rjsf/utils";

export const uiSchema: UiSchema = {
	"ui:options": {
		label: false,
		emptyValue: true,
	},
	realEstateMarket: {
		"ui:options": {
			label: false,
			hideError: true,
		},
		comissioning: {
			"ui:field": "CommissioningField",
			// "ui:fieldReplacesAnyOrOneOf": true
		},
	},
};

export const customSchema: RJSFSchema = {
	$id: "my-custom-schema",
	title: "My custom schema",
	type: "object",
	properties: {
		realEstateMarket: {
			$ref: "#/definitions/realEstateMarket",
		},
	},
	definitions: {
		realEstateMarket: {
			type: "object",
			properties: {
				marketType: {
					title: "Real estate market",
					type: "string",
					enum: ["primary", "secondary"],
				},
			},
			dependencies: {
				marketType: {
					oneOf: [
						{
							properties: {
								marketType: {
									enum: ["secondary"],
								},
							},
						},
						{
							properties: {
								marketType: {
									enum: ["primary"],
								},
								housingComplexClass: {
									type: "string",
									title: "Housing Complex Class",
									enum: ["Premium", "Econom", "Comfort", "Business"],
								},
								comissioning: {
									title: "Сommissioning",
									type: "number",
									format: "year",
								},
							},
							required: ["comissioning"],
						},
					],
				},
			},
		},
	},
	formData: {
		realEstateMarket: {
			marketType: "primary",
			comissioning: "",
			housingComplexClass: "Premium",
		},
	},
};

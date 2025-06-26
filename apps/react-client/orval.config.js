/* eslint-disable prefer-destructuring */
/* eslint-disable no-undef */

const path = require("path");

const ORVAL_PATH = process.env.ORVAL_PATH;

const DEFAULT_PATH = "src/generated/orval";

const serviceConfig = [
	{
		service: "some-service",
	},
];

const getSwaggerFile = (service) => {
	return {
		file: `./swagger/${service}.json`, // LOCAL SCHEMA
		// file: `https://${stageName['co(ext)']}.vs.inno.tech/${service}/api-docs` // REMOTE
	};
};

const config = serviceConfig.reduce((prev, curr) => {
	return {
		...prev,
		[curr.service]: {
			input: {
				target: getSwaggerFile(curr.service).file,
				override: {
					transformer: (inputSchema) => {
						return {
							...inputSchema,
							paths: Object.entries(inputSchema.paths).reduce(
								(acc, [_path, pathItem]) => ({
									...acc,
									[`${curr.service}${_path}`]: Object.entries(pathItem).reduce(
										(pathItemAcc, [verb, operation]) => {
											const result = {
												...pathItemAcc,
												[verb]: {
													...operation,
													parameters: [
														...(operation.parameters || []),
														{
															name: "SOME_VAR_TO_INJECT",
															in: "path",
															required: true,
															schema: {
																type: "number",
																default: 1,
															},
														},
													],
												},
											};
											return result;
										},
										{},
									),
								}),
								{},
							),
						};
					},
				},
			},
			output: {
				client: "react-query",
				mode: "tags-split",
				target: `./${ORVAL_PATH || DEFAULT_PATH}/queries/${curr.service}/queries.ts`,
				schemas: `./${ORVAL_PATH || DEFAULT_PATH}/types/${curr.service}/`,
				prettier: true,
				override: {
					query: {
						useMutation: true,
						mutationOptions: {
							path: "./src/api/helpers/customMutationOptions.ts",
							name: "customMutationOptions",
						},
					},
					mutator: {
						path: "./src/api/axiosInstance.tsx",
						name: "axiosInstance",
					},
				},
			},
		},
	};
}, {});

module.exports = config;

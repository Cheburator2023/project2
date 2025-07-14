/* eslint-disable prefer-destructuring */
/* eslint-disable no-undef */
const path = require("path");

const config = {
	calculation: {
		input: {
			target: "http://localhost:3000/api-json",
			override: {
				transformer: (inputSchema) => {
					return {
						...inputSchema,
						paths: Object.entries(inputSchema.paths).reduce(
							(acc, [_path, pathItem]) => ({
								...acc,
								[_path]: pathItem,
							}),
							{},
						),
					};
				},
			},
		},
		output: {
			client: "react-query",
			mode: "split",
			target: "./src/common/api/generated/queries/calculation.ts",
			schemas: "./src/common/api/generated/types/",
			prettier: true,
			override: {
				query: {
					useQuery: true,
					useInfinite: false,
					useInfiniteQueryParam: "pageParam",
					options: {
						staleTime: 30000,
						retry: 2,
					},
					queryOptions: {
						path: "./src/common/api/helpers/queryOptions.ts",
						name: "customQueryOptions",
					},
				},
				mutation: {
					useMutation: true,
					mutationOptions: {
						path: "./src/common/api/helpers/mutationOptions.ts",
						name: "customMutationOptions",
					},
				},
				mutator: {
					path: "./src/common/api/helpers/apiClient.ts",
					name: "apiClient",
				},
				useTypeOverride: true,
				hooks: {
					useApiWithAuth: {
						path: "./src/common/api/hooks/useApiWithAuth.ts",
						name: "useApiWithAuth",
					},
					useMutationWithAuth: {
						path: "./src/common/api/hooks/useApiWithAuth.ts",
						name: "useMutationWithAuth",
					},
				},
			},
		},
	},
};

module.exports = config;

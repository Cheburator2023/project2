module.exports = {
	moduleFileExtensions: ["js", "json", "ts"],
	rootDir: ".",
	testRegex: ".*\\.spec\\.ts$",
	transform: {
		"^.+\\.(t|j)s$": [
			"ts-jest",
			{
				tsconfig: {
					resolveJsonModule: true,
					esModuleInterop: true,
					allowSyntheticDefaultImports: true,
				},
			},
		],
	},
	collectCoverageFrom: [
		"src/**/*.(t|j)s",
		"!src/main.ts",
		"!src/ormconfig.ts",
		"!src/scripts/**",
		"!src/**/interfaces/**",
		"!src/**/*.module.ts",
		"!src/**/*.entity.ts",
		"!src/**/*.dto.ts",
	],
	coverageDirectory: "../coverage",
	testEnvironment: "node",
	moduleNameMapper: {
		"^@smart-anketa/api-contract$":
			"<rootDir>/../../packages/api-contract/src/index.ts",
		"^@smart-anketa/api-contract/(.*)$":
			"<rootDir>/../../packages/api-contract/src/$1",
		"^@app/(.*)$": "<rootDir>/src/$1",
		"^src/(.*)$": "<rootDir>/src/$1",
		"^test/(.*)$": "<rootDir>/test/$1",
	},
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: 80,
		},
	},
};
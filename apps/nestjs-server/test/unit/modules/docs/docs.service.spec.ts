import { DataSource } from "typeorm";
import { DocsService } from "../../../../src/modules/docs/docs.service";

const buildColumn = (overrides: Record<string, unknown>) => ({
	propertyName: "id",
	databaseName: "id",
	type: "uuid",
	isPrimary: false,
	isNullable: false,
	isGenerated: false,
	isUnique: false,
	default: undefined,
	...overrides,
});

const dataSource = {
	entityMetadatas: [
		{
			name: "Calculation",
			tableName: "calculation",
			columns: [
				buildColumn({ isPrimary: true, isGenerated: true }),
				buildColumn({
					propertyName: "questionnaireData",
					databaseName: "questionnaireData",
					type: "jsonb",
				}),
			],
			relations: [
				{
					propertyName: "parentCalc",
					relationType: "many-to-one",
					inverseEntityMetadata: { tableName: "calculation" },
					joinColumns: [{ databaseName: "parentCalcId" }],
					isNullable: true,
				},
			],
			uniques: [],
		},
		{
			name: "CoefficientEntity",
			tableName: "coefficient",
			columns: [
				buildColumn({ isPrimary: true, isGenerated: true }),
				buildColumn({
					propertyName: "code",
					databaseName: "code",
					type: "varchar",
					isUnique: true,
				}),
			],
			relations: [],
			uniques: [
				{
					columns: [{ databaseName: "code" }],
				},
			],
		},
		{
			name: "QuestionnaireItemEntity",
			tableName: "questionnaire_item",
			columns: [buildColumn({ isPrimary: true, isGenerated: true })],
			relations: [],
			uniques: [],
		},
	],
} as unknown as DataSource;

describe("DocsService", () => {
	let service: DocsService;

	beforeEach(() => {
		service = new DocsService(dataSource);
	});

	it("builds database docs from TypeORM metadata", () => {
		const docs = service.getDatabaseDocs();

		expect(docs.entities).toHaveLength(3);
		expect(docs.entities[0]).toMatchObject({
			name: "Calculation",
			tableName: "calculation",
		});
		expect(docs.entities[0].columns).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					databaseName: "id",
					isPrimary: true,
					type: "uuid",
				}),
				expect.objectContaining({
					databaseName: "questionnaireData",
					type: "jsonb",
				}),
			]),
		);
		expect(docs.entities[0].relations).toEqual([
			expect.objectContaining({
				propertyName: "parentCalc",
				target: "calculation",
				joinColumns: ["parentCalcId"],
			}),
			expect.objectContaining({
				propertyName: "questionnaireData.answers",
				target: "questionnaire_item",
				type: "logical-jsonb",
			}),
			expect.objectContaining({
				propertyName: "questionnaireData.coefficients",
				target: "coefficient",
				type: "logical-jsonb",
			}),
		]);
	});

	it("generates mermaid ERD and documents calculation jsonb shape", () => {
		const docs = service.getDatabaseDocs();

		expect(docs.mermaid).toContain("erDiagram");
		expect(docs.mermaid).toContain("calculation {");
		expect(docs.mermaid).toContain("jsonb questionnaireData isRequired");
		expect(docs.mermaid).toContain(
			"calculation }o--|| calculation : parentCalc",
		);
		expect(docs.mermaid).toContain(
			"calculation }o--|| questionnaire_item : questionnaireData.answers",
		);
		expect(docs.jsonbDocuments).toEqual([
			expect.objectContaining({
				tableName: "calculation",
				columnName: "questionnaireData",
				fields: expect.arrayContaining([
					expect.objectContaining({ name: "modelsCount", type: "number" }),
					expect.objectContaining({
						name: "calculationResult",
						required: false,
					}),
				]),
			}),
		]);
	});
});

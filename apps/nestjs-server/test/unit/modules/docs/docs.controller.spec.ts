import { DocsController } from "../../../../src/modules/docs/docs.controller";
import { DocsService } from "../../../../src/modules/docs/docs.service";

describe("DocsController", () => {
	let controller: DocsController;
	let docsService: jest.Mocked<Pick<DocsService, "getDatabaseDocs">>;

	beforeEach(() => {
		docsService = {
			getDatabaseDocs: jest.fn().mockReturnValue({
				generatedAt: "2026-04-30T00:00:00.000Z",
				entities: [
					{
						name: "Calculation",
						tableName: "calculation",
						columns: [
							{
								name: "id",
								databaseName: "id",
								type: "uuid",
								isPrimary: true,
								isNullable: false,
								isGenerated: true,
								isUnique: false,
							},
							{
								name: "questionnaireData",
								databaseName: "questionnaireData",
								type: "jsonb",
								isPrimary: false,
								isNullable: false,
								isGenerated: false,
								isUnique: false,
							},
						],
						relations: [
							{
								propertyName: "parentCalc",
								type: "many-to-one",
								target: "calculation",
								joinColumns: ["parentCalcId"],
								isNullable: true,
							},
							{
								propertyName: "questionnaireData.answers",
								type: "logical-jsonb",
								target: "questionnaire_item",
								joinColumns: ["questionnaireData"],
								isNullable: false,
							},
						],
					},
					{
						name: "QuestionnaireItemEntity",
						tableName: "questionnaire_item",
						columns: [
							{
								name: "id",
								databaseName: "id",
								type: "uuid",
								isPrimary: true,
								isNullable: false,
								isGenerated: true,
								isUnique: false,
							},
						],
						relations: [],
					},
				],
				jsonbDocuments: [
					{
						tableName: "calculation",
						columnName: "questionnaireData",
						description: "JSONB data",
						fields: [{ name: "modelsCount", type: "number", required: true }],
					},
				],
				mermaid: "erDiagram\n  calculation {\n    uuid id PK required\n  }",
			}),
		};
		controller = new DocsController(docsService as unknown as DocsService);
	});

	it("returns raw database docs", () => {
		expect(controller.getDatabaseDocs()).toEqual(
			expect.objectContaining({
				generatedAt: "2026-04-30T00:00:00.000Z",
				mermaid: expect.stringContaining("erDiagram"),
			}),
		);
		expect(docsService.getDatabaseDocs).toHaveBeenCalledTimes(1);
	});

	it("renders database docs html page", () => {
		const html = controller.getDatabaseDocsPage();

		expect(html).toContain("Smart Anketa DB Docs");
		expect(html).toContain("Database node graph");
		expect(html).toContain('id="graph-canvas"');
		expect(html).toContain('id="graph-svg"');
		expect(html).toContain('id="graph-shell"');
		expect(html).toContain('class="graph-controls"');
		expect(html).toContain("pointer-events: none");
		expect(html).toContain("pointer-events: auto");
		expect(html).toContain('id="center-button"');
		expect(html).toContain('id="zoom-in-button"');
		expect(html).toContain('id="zoom-out-button"');
		expect(html).toContain("scale: 0.75");
		expect(html).toContain("centerGraph");
		expect(html).toContain("setZoom");
		expect(html).toContain("getNodeHeight");
		expect(html).toContain("columnHeights");
		expect(html).toContain('event.target.closest(".graph-controls")');
		expect(html).toContain("getSuspiciousSelfReferences");
		expect(html).toContain("isExpectedSelfReference");
		expect(html).toContain("possible bug");
		expect(html).toContain("Possible relation bug");
		expect(html).toContain('id="docs-data"');
		expect(html).toContain("renderEdges");
		expect(html).toContain("self reference ×");
		expect(html).toContain("column-row");
		expect(html).toContain("connected");
		expect(html).toContain("relation");
		expect(html).toContain(' + " H " + ');
		expect(html).toContain(' + " V " + ');
		expect(html).toContain("marker-end: url(#arrow)");
		expect(html).toContain('fill="#111827"');
		expect(html).toContain("stroke: #111827");
		expect(html).toContain(
			"background: linear-gradient(135deg, #1d4ed8, #2563eb)",
		);
		expect(html).toContain("calculation.questionnaireData");
		expect(html).toContain("/docs/db.json");
		expect(html).toContain("/api");
		expect(html).toContain("erDiagram");
		expect(docsService.getDatabaseDocs).toHaveBeenCalledTimes(1);
	});
});

import { Injectable } from "@nestjs/common";
import { DataSource, EntityMetadata } from "typeorm";

type DocsColumn = {
	name: string;
	databaseName: string;
	type: string;
	isPrimary: boolean;
	isNullable: boolean;
	isGenerated: boolean;
	isUnique: boolean;
	default?: unknown;
};

type DocsRelation = {
	propertyName: string;
	type: string;
	target: string;
	joinColumns: string[];
	isNullable: boolean;
};

type DocsEntity = {
	name: string;
	tableName: string;
	columns: DocsColumn[];
	relations: DocsRelation[];
};

export type DatabaseDocs = {
	generatedAt: string;
	entities: DocsEntity[];
	jsonbDocuments: Array<{
		tableName: string;
		columnName: string;
		description: string;
		fields: Array<{ name: string; type: string; required: boolean }>;
	}>;
	mermaid: string;
};

@Injectable()
export class DocsService {
	constructor(private readonly dataSource: DataSource) {}

	getDatabaseDocs(): DatabaseDocs {
		const entities = this.dataSource.entityMetadatas
			.map((metadata) => this.mapEntity(metadata))
			.sort((left, right) => left.tableName.localeCompare(right.tableName));
		this.addInferredRelations(entities);

		return {
			generatedAt: new Date().toISOString(),
			entities,
			jsonbDocuments: this.getJsonbDocuments(),
			mermaid: this.buildMermaidDiagram(entities),
		};
	}

	private addInferredRelations(entities: DocsEntity[]): void {
		const tableNames = new Set(entities.map((entity) => entity.tableName));
		const addRelation = (
			sourceTableName: string,
			relation: DocsRelation,
		): void => {
			const entity = entities.find(
				(item) => item.tableName === sourceTableName,
			);
			if (!entity || !tableNames.has(relation.target)) {
				return;
			}

			const alreadyExists = entity.relations.some(
				(item) =>
					item.propertyName === relation.propertyName &&
					item.target === relation.target,
			);
			if (!alreadyExists) {
				entity.relations.push(relation);
			}
		};

		addRelation("calculation", {
			propertyName: "questionnaireData.answers",
			type: "logical-jsonb",
			target: "questionnaire_item",
			joinColumns: ["questionnaireData"],
			isNullable: false,
		});
		addRelation("calculation", {
			propertyName: "questionnaireData.coefficients",
			type: "logical-jsonb",
			target: "coefficient",
			joinColumns: ["questionnaireData"],
			isNullable: false,
		});
		addRelation("calculation", {
			propertyName: "streamExecutor",
			type: "logical-reference",
			target: "stream_average",
			joinColumns: ["streamExecutor"],
			isNullable: true,
		});
		addRelation("coefficient", {
			propertyName: "code",
			type: "logical-reference",
			target: "questionnaire_item",
			joinColumns: ["code"],
			isNullable: false,
		});
		addRelation("artefact_values", {
			propertyName: "artefact_parent_value_id",
			type: "logical-self-reference",
			target: "artefact_values",
			joinColumns: ["artefact_parent_value_id"],
			isNullable: true,
		});
	}

	private mapEntity(metadata: EntityMetadata): DocsEntity {
		const uniqueColumnNames = new Set(
			metadata.uniques.flatMap((unique) =>
				unique.columns.map((column) => column.databaseName),
			),
		);

		return {
			name: metadata.name,
			tableName: metadata.tableName,
			columns: metadata.columns.map((column) => ({
				name: column.propertyName,
				databaseName: column.databaseName,
				type: this.formatColumnType(column.type),
				isPrimary: column.isPrimary,
				isNullable: column.isNullable,
				isGenerated: column.isGenerated,
				isUnique: uniqueColumnNames.has(column.databaseName),
				default: column.default,
			})),
			relations: metadata.relations.map((relation) => ({
				propertyName: relation.propertyName,
				type: relation.relationType,
				target: relation.inverseEntityMetadata.tableName,
				joinColumns: relation.joinColumns.map((column) => column.databaseName),
				isNullable: relation.isNullable,
			})),
		};
	}

	private buildMermaidDiagram(entities: DocsEntity[]): string {
		const lines = ["erDiagram"];

		for (const entity of entities) {
			lines.push(`  ${this.escapeIdentifier(entity.tableName)} {`);
			for (const column of entity.columns) {
				const markers = [
					column.isPrimary ? "isPrimary" : "",
					column.isUnique ? "isUnique" : "",
					column.isNullable ? "isNullable" : "isRequired",
				]
					.filter(Boolean)
					.join(" ");
				lines.push(
					`    ${this.escapeMermaidType(column.type)} ${this.escapeIdentifier(column.databaseName)} ${markers}`,
				);
			}
			lines.push("  }");
		}

		for (const entity of entities) {
			for (const relation of entity.relations) {
				lines.push(
					`  ${this.escapeIdentifier(entity.tableName)} }o--|| ${this.escapeIdentifier(relation.target)} : ${relation.propertyName}`,
				);
			}
		}

		return lines.join("\n");
	}

	private getJsonbDocuments(): DatabaseDocs["jsonbDocuments"] {
		return [
			{
				tableName: "calculation",
				columnName: "questionnaireData",
				description:
					"Основной документ анкеты расчета. Хранит ответы, параметры расчета и результаты этапов.",
				fields: [
					{ name: "calcName", type: "string", required: true },
					{ name: "setupComplexity", type: "string", required: true },
					{ name: "initiativeTimeline", type: "string", required: false },
					{ name: "initiativeCost", type: "string", required: false },
					{ name: "modelDeveloped", type: "string", required: false },
					{ name: "modelsCount", type: "number", required: true },
					{ name: "uncertaintyAdjustment", type: "number", required: false },
					{
						name: "generalUncertainty",
						type: "record | array",
						required: false,
					},
					{ name: "readyPromReports", type: "string", required: true },
					{ name: "assessedInitiativesCount", type: "number", required: false },
					{ name: "dataSourcesCount", type: "string", required: true },
					{ name: "pilotModelRequired", type: "string", required: true },
					{ name: "algorithmComplexity", type: "array", required: true },
					{ name: "pilotSupportRequired", type: "string", required: true },
					{ name: "autoMlRequired", type: "string", required: true },
					{
						name: "productionAdditionalReports",
						type: "string",
						required: false,
					},
					{
						name: "productionDeploymentChannels",
						type: "array",
						required: true,
					},
					{ name: "calculationResult", type: "array", required: false },
				],
			},
		];
	}

	private formatColumnType(type: unknown): string {
		return typeof type === "function" ? type.name : String(type);
	}

	private escapeIdentifier(value: string): string {
		return value.replace(/[^a-zA-Z0-9_]/g, "_");
	}

	private escapeMermaidType(value: string): string {
		return this.escapeIdentifier(value || "unknown");
	}
}

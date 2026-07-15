import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { V2DataTransferSection } from "@smart-anketa/api-contract";
import {
	expandV2DataTransferExportSections,
	V2_DATA_TRANSFER_DEFAULT_SECTIONS,
} from "@smart-anketa/api-contract";
import { DataSource, Repository } from "typeorm";
import { V2DictionaryEntity } from "../entities/v2-dictionary.entity";
import { V2DictionaryItemEntity } from "../entities/v2-dictionary-item.entity";
import { V2QuestionnaireEntity } from "../entities/v2-questionnaire.entity";
import { V2TemplateEntity } from "../entities/v2-template.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";
import { V2TypicalWorkEntity } from "../entities/v2-typical-work.entity";
import { V2TypicalWorkAssignmentEntity } from "../entities/v2-typical-work-assignment.entity";
import { V2TypicalWorkLaborCoefficientEntity } from "../entities/v2-typical-work-labor-coefficient.entity";
import { V2TypicalWorkLaborParamEntity } from "../entities/v2-typical-work-labor-param.entity";
import { V2TypicalWorkNormEntity } from "../entities/v2-typical-work-norm.entity";
import { V2TypicalWorkRuleEntity } from "../entities/v2-typical-work-rule.entity";
import { V2TypicalWorkVersionConfigEntity } from "../entities/v2-typical-work-version-config.entity";
import { remapAssignmentIdsInVersionConfigRow } from "../utils/v2-data-transfer-formula.util";
import {
	assertV2DataSnapshotIntegrity,
	buildV2DataSnapshot,
	parseV2DataSnapshot,
	type V2DataImportMode,
	type V2DataImportStats,
	type V2DataSnapshot,
	type V2DataSnapshotPayload,
} from "../utils/v2-data-snapshot.util";

export {
	SnapshotIntegrityError,
	SnapshotSchemaError,
} from "../utils/v2-data-snapshot.util";

type Row = Record<string, unknown>;

@Injectable()
export class V2DataTransferService {
	constructor(
		private readonly dataSource: DataSource,
		@InjectRepository(V2DictionaryEntity)
		private readonly dictionaryRepo: Repository<V2DictionaryEntity>,
		@InjectRepository(V2DictionaryItemEntity)
		private readonly dictionaryItemRepo: Repository<V2DictionaryItemEntity>,
		@InjectRepository(V2TemplateEntity)
		private readonly templateRepo: Repository<V2TemplateEntity>,
		@InjectRepository(V2TemplateVersionEntity)
		private readonly templateVersionRepo: Repository<V2TemplateVersionEntity>,
		@InjectRepository(V2TypicalWorkEntity)
		private readonly typicalWorkRepo: Repository<V2TypicalWorkEntity>,
		@InjectRepository(V2TypicalWorkAssignmentEntity)
		private readonly typicalWorkAssignmentRepo: Repository<V2TypicalWorkAssignmentEntity>,
		@InjectRepository(V2TypicalWorkLaborParamEntity)
		private readonly typicalWorkLaborParamRepo: Repository<V2TypicalWorkLaborParamEntity>,
		@InjectRepository(V2TypicalWorkNormEntity)
		private readonly typicalWorkNormRepo: Repository<V2TypicalWorkNormEntity>,
		@InjectRepository(V2TypicalWorkRuleEntity)
		private readonly typicalWorkRuleRepo: Repository<V2TypicalWorkRuleEntity>,
		@InjectRepository(V2TypicalWorkLaborCoefficientEntity)
		private readonly typicalWorkLaborCoeffRepo: Repository<V2TypicalWorkLaborCoefficientEntity>,
		@InjectRepository(V2TypicalWorkVersionConfigEntity)
		private readonly typicalWorkVersionConfigRepo: Repository<V2TypicalWorkVersionConfigEntity>,
		@InjectRepository(V2QuestionnaireEntity)
		private readonly questionnaireRepo: Repository<V2QuestionnaireEntity>,
	) {}

	async exportSnapshot(
		sections: V2DataTransferSection[] = V2_DATA_TRANSFER_DEFAULT_SECTIONS,
	): Promise<Buffer> {
		const exportSections = expandV2DataTransferExportSections(sections);
		const payload = await this.loadPayload(exportSections);
		const snapshot = buildV2DataSnapshot(payload, undefined, sections);
		const buffer = Buffer.from(JSON.stringify(snapshot, null, 2), "utf8");
		const parsed = parseV2DataSnapshot(buffer);
		assertV2DataSnapshotIntegrity(parsed);
		return buffer;
	}

	async importSnapshot(
		buffer: Buffer,
		mode: V2DataImportMode,
		sections: V2DataTransferSection[] = V2_DATA_TRANSFER_DEFAULT_SECTIONS,
	): Promise<{ meta: V2DataSnapshot["meta"]; stats: V2DataImportStats }> {
		const snapshot = parseV2DataSnapshot(buffer);
		assertV2DataSnapshotIntegrity(snapshot);

		const stats =
			mode === "replace"
				? await this.importReplace(snapshot, sections)
				: await this.importMerge(snapshot, sections);

		return { meta: snapshot.meta, stats };
	}

	private includes(
		sections: readonly V2DataTransferSection[],
		section: V2DataTransferSection,
	): boolean {
		return sections.includes(section);
	}

	private filterSnapshotBySections(
		snapshot: V2DataSnapshot,
		sections: readonly V2DataTransferSection[],
	): V2DataSnapshot {
		return {
			...snapshot,
			dictionaries: this.includes(sections, "dictionaries")
				? snapshot.dictionaries
				: [],
			dictionaryItems: this.includes(sections, "dictionaries")
				? snapshot.dictionaryItems
				: [],
			templates: this.includes(sections, "templates")
				? snapshot.templates
				: [],
			templateVersions: this.includes(sections, "templates")
				? snapshot.templateVersions
				: [],
			typicalWorks: this.includes(sections, "typicalWorks")
				? snapshot.typicalWorks
				: [],
			typicalWorkAssignments: this.includes(sections, "typicalWorks")
				? snapshot.typicalWorkAssignments
				: [],
			typicalWorkLaborParams: this.includes(sections, "typicalWorks")
				? snapshot.typicalWorkLaborParams
				: [],
			typicalWorkNorms: this.includes(sections, "typicalWorks")
				? snapshot.typicalWorkNorms
				: [],
			typicalWorkRules: this.includes(sections, "typicalWorks")
				? snapshot.typicalWorkRules
				: [],
			typicalWorkLaborCoefficients: this.includes(
				sections,
				"typicalWorks",
			)
				? snapshot.typicalWorkLaborCoefficients
				: [],
			typicalWorkVersionConfigs: this.includes(sections, "typicalWorks")
				? snapshot.typicalWorkVersionConfigs
				: [],
			questionnaires: this.includes(sections, "questionnaires")
				? snapshot.questionnaires
				: [],
		};
	}

	private async loadPayload(
		sections: readonly V2DataTransferSection[],
	): Promise<V2DataSnapshotPayload> {
		const [
			dictionaries,
			dictionaryItems,
			templates,
			templateVersions,
			typicalWorks,
			typicalWorkAssignments,
			typicalWorkLaborParams,
			typicalWorkNorms,
			typicalWorkRules,
			typicalWorkLaborCoefficients,
			typicalWorkVersionConfigs,
			questionnaires,
		] = await Promise.all([
			this.includes(sections, "dictionaries")
				? this.dictionaryRepo.find()
				: Promise.resolve([]),
			this.includes(sections, "dictionaries")
				? this.dictionaryItemRepo.find()
				: Promise.resolve([]),
			this.includes(sections, "templates")
				? this.templateRepo.find()
				: Promise.resolve([]),
			this.includes(sections, "templates")
				? this.templateVersionRepo.find()
				: Promise.resolve([]),
			this.includes(sections, "typicalWorks")
				? this.typicalWorkRepo.find()
				: Promise.resolve([]),
			this.includes(sections, "typicalWorks")
				? this.typicalWorkAssignmentRepo.find()
				: Promise.resolve([]),
			this.includes(sections, "typicalWorks")
				? this.typicalWorkLaborParamRepo.find()
				: Promise.resolve([]),
			this.includes(sections, "typicalWorks")
				? this.typicalWorkNormRepo.find()
				: Promise.resolve([]),
			this.includes(sections, "typicalWorks")
				? this.typicalWorkRuleRepo.find()
				: Promise.resolve([]),
			this.includes(sections, "typicalWorks")
				? this.typicalWorkLaborCoeffRepo.find()
				: Promise.resolve([]),
			this.includes(sections, "typicalWorks")
				? this.typicalWorkVersionConfigRepo.find()
				: Promise.resolve([]),
			this.includes(sections, "questionnaires")
				? this.questionnaireRepo.find()
				: Promise.resolve([]),
		]);

		return {
			dictionaries: dictionaries.map((row) => this.toRow(row)),
			dictionaryItems: dictionaryItems.map((row) => this.toRow(row)),
			templates: templates.map((row) => this.toRow(row)),
			templateVersions: templateVersions.map((row) => this.toRow(row)),
			typicalWorks: typicalWorks.map((row) => this.toRow(row)),
			typicalWorkAssignments: typicalWorkAssignments.map((row) =>
				this.toRow(row),
			),
			typicalWorkLaborParams: typicalWorkLaborParams.map((row) =>
				this.toRow(row),
			),
			typicalWorkNorms: typicalWorkNorms.map((row) => this.toRow(row)),
			typicalWorkRules: typicalWorkRules.map((row) => this.toRow(row)),
			typicalWorkLaborCoefficients: typicalWorkLaborCoefficients.map((row) =>
				this.toRow(row),
			),
			typicalWorkVersionConfigs: typicalWorkVersionConfigs.map((row) =>
				this.toRow(row),
			),
			questionnaires: questionnaires.map((row) => this.toRow(row)),
		};
	}

	private toRow(entity: object): Row {
		const row: Row = {};
		for (const [key, value] of Object.entries(entity)) {
			if (key === "template" || key === "dictionary" || key === "parentQuestionnaire" || key === "boundTemplateVersion" || key === "currentVersion") {
				continue;
			}
			row[key] = value;
		}
		return row;
	}

	private emptyStats(mode: V2DataImportMode): V2DataImportStats {
		const zero = () => ({
			dictionaries: 0,
			dictionaryItems: 0,
			templates: 0,
			templateVersions: 0,
			typicalWorks: 0,
			typicalWorkAssignments: 0,
			typicalWorkLaborParams: 0,
			typicalWorkNorms: 0,
			typicalWorkRules: 0,
			typicalWorkLaborCoefficients: 0,
			typicalWorkVersionConfigs: 0,
			questionnaires: 0,
		});
		return { mode, inserted: zero(), skipped: zero() };
	}

	private async importReplace(
		snapshot: V2DataSnapshot,
		sections: readonly V2DataTransferSection[],
	): Promise<V2DataImportStats> {
		const stats = this.emptyStats("replace");
		const filtered = this.filterSnapshotBySections(snapshot, sections);

		await this.dataSource.transaction(async (manager) => {
			if (this.includes(sections, "questionnaires")) {
				await manager.query(
					`UPDATE v2_questionnaire SET parent_questionnaire_id = NULL`,
				);
				await manager.delete(V2QuestionnaireEntity, {});
			}

			if (this.includes(sections, "typicalWorks")) {
				await manager.delete(V2TypicalWorkVersionConfigEntity, {});
				await manager.delete(V2TypicalWorkNormEntity, {});
				await manager.delete(V2TypicalWorkRuleEntity, {});
				await manager.delete(V2TypicalWorkLaborCoefficientEntity, {});
				await manager.delete(V2TypicalWorkLaborParamEntity, {});
				await manager.delete(V2TypicalWorkAssignmentEntity, {});
				await manager.delete(V2TypicalWorkEntity, {});
			}

			if (this.includes(sections, "templates")) {
				await manager.query(`UPDATE v2_template SET current_version_id = NULL`);
				await manager.delete(V2TemplateVersionEntity, {});
				await manager.delete(V2TemplateEntity, {});
			}

			if (this.includes(sections, "dictionaries")) {
				await manager.delete(V2DictionaryItemEntity, {});
				await manager.delete(V2DictionaryEntity, {});
			}

			await this.insertAll(manager, filtered, stats, { skipExisting: false }, {
				fullSnapshot: snapshot,
				sections,
			});
		});

		return stats;
	}

	private async importMerge(
		snapshot: V2DataSnapshot,
		sections: readonly V2DataTransferSection[],
	): Promise<V2DataImportStats> {
		const stats = this.emptyStats("merge");
		const filtered = this.filterSnapshotBySections(snapshot, sections);

		await this.dataSource.transaction(async (manager) => {
			await this.insertAll(manager, filtered, stats, { skipExisting: true }, {
				fullSnapshot: snapshot,
				sections,
			});
		});

		return stats;
	}

	private async insertAll(
		manager: DataSource["manager"],
		snapshot: V2DataSnapshot,
		stats: V2DataImportStats,
		options: { skipExisting: boolean },
		context?: {
			fullSnapshot: V2DataSnapshot;
			sections: readonly V2DataTransferSection[];
		},
	): Promise<void> {
		const dictIdMap = new Map<string, string>();
		const templateIdMap = new Map<string, string>();
		const versionIdMap = new Map<string, string>();
		const workIdMap = new Map<string, string>();
		const questionnaireIdMap = new Map<string, string>();

		const existingDictByCode = await this.indexBy(
			await manager.getRepository(V2DictionaryEntity).find(),
			(row) => row.code,
		);
		const existingTemplateByCode = await this.indexBy(
			await manager.getRepository(V2TemplateEntity).find(),
			(row) => row.code,
		);
		const existingWorkByCatalogKey = await this.indexBy(
			(await manager.getRepository(V2TypicalWorkEntity).find()).filter(
				(row) => row.catalogKey,
			),
			(row) => row.catalogKey as string,
		);
		const existingQuestionnaireByReadableId = await this.indexBy(
			(await manager.getRepository(V2QuestionnaireEntity).find()).filter(
				(row) => row.readableId,
			),
			(row) => row.readableId as string,
		);
		const existingQuestionnaireIds = new Set(
			(await manager.getRepository(V2QuestionnaireEntity).find()).map(
				(row) => row.id,
			),
		);

		const dictRepo = manager.getRepository(V2DictionaryEntity);
		for (const row of snapshot.dictionaries) {
			const id = String(row.id);
			const code = String(row.code);
			const existing = existingDictByCode.get(code);
			if (options.skipExisting && existing) {
				dictIdMap.set(id, existing.id);
				stats.skipped.dictionaries += 1;
				continue;
			}
			await dictRepo.save(this.fromRow(V2DictionaryEntity, row));
			dictIdMap.set(id, id);
			stats.inserted.dictionaries += 1;
		}

		const dictItemRepo = manager.getRepository(V2DictionaryItemEntity);
		const existingDictItems = await dictItemRepo.find();
		const dictItemKey = (dictionaryId: string, code: string) =>
			`${dictionaryId}::${code}`;
		const existingDictItemKeys = new Set(
			existingDictItems.map((row) => dictItemKey(row.dictionaryId, row.code)),
		);

		for (const row of snapshot.dictionaryItems) {
			const sourceDictId = String(row.dictionaryId);
			const mappedDictId = dictIdMap.get(sourceDictId);
			if (!mappedDictId) {
				stats.skipped.dictionaryItems += 1;
				continue;
			}
			const code = String(row.code);
			if (
				options.skipExisting &&
				existingDictItemKeys.has(dictItemKey(mappedDictId, code))
			) {
				stats.skipped.dictionaryItems += 1;
				continue;
			}
			await dictItemRepo.save(
				this.fromRow(V2DictionaryItemEntity, {
					...row,
					dictionaryId: mappedDictId,
				}),
			);
			stats.inserted.dictionaryItems += 1;
			existingDictItemKeys.add(dictItemKey(mappedDictId, code));
		}

		const templateRepo = manager.getRepository(V2TemplateEntity);
		const templatesToInsert = new Set<string>();

		for (const row of snapshot.templates) {
			const id = String(row.id);
			const code = String(row.code);
			const existing = existingTemplateByCode.get(code);
			if (options.skipExisting && existing) {
				templateIdMap.set(id, existing.id);
				stats.skipped.templates += 1;
				continue;
			}
			await templateRepo.save(
				this.fromRow(V2TemplateEntity, {
					...row,
					currentVersionId: null,
				}),
			);
			templateIdMap.set(id, id);
			templatesToInsert.add(id);
			stats.inserted.templates += 1;
		}

		const versionRepo = manager.getRepository(V2TemplateVersionEntity);
		const existingVersions = await versionRepo.find();
		const existingVersionKeys = new Set(
			existingVersions.map((row) => `${row.templateId}::${row.versionNumber}`),
		);
		const existingVersionByTemplate = new Map<string, V2TemplateVersionEntity[]>();
		for (const version of existingVersions) {
			const list = existingVersionByTemplate.get(version.templateId) ?? [];
			list.push(version);
			existingVersionByTemplate.set(version.templateId, list);
		}

		const sortedVersions = [...snapshot.templateVersions].sort(
			(a, b) => Number(a.versionNumber) - Number(b.versionNumber),
		);

		for (const row of sortedVersions) {
			const sourceTemplateId = String(row.templateId);
			const mappedTemplateId = templateIdMap.get(sourceTemplateId);
			if (!mappedTemplateId) {
				stats.skipped.templateVersions += 1;
				continue;
			}

			const versionNumber = Number(row.versionNumber);
			const versionKey = `${mappedTemplateId}::${versionNumber}`;

			if (options.skipExisting && !templatesToInsert.has(mappedTemplateId)) {
				const existingVersion = existingVersionByTemplate
					.get(mappedTemplateId)
					?.find((version) => version.versionNumber === versionNumber);
				if (existingVersion) {
					versionIdMap.set(String(row.id), existingVersion.id);
					stats.skipped.templateVersions += 1;
					continue;
				}
			}

			if (options.skipExisting && existingVersionKeys.has(versionKey)) {
				const existingVersion = existingVersionByTemplate
					.get(mappedTemplateId)
					?.find((version) => version.versionNumber === versionNumber);
				if (existingVersion) {
					versionIdMap.set(String(row.id), existingVersion.id);
				}
				stats.skipped.templateVersions += 1;
				continue;
			}

			const saved = await versionRepo.save(
				this.fromRow(V2TemplateVersionEntity, {
					...row,
					templateId: mappedTemplateId,
					parentVersionId: row.parentVersionId
						? (versionIdMap.get(String(row.parentVersionId)) ?? null)
						: null,
				}),
			);
			versionIdMap.set(String(row.id), saved.id);
			existingVersionKeys.add(versionKey);
			const list = existingVersionByTemplate.get(mappedTemplateId) ?? [];
			list.push(saved);
			existingVersionByTemplate.set(mappedTemplateId, list);
			stats.inserted.templateVersions += 1;
		}

		for (const row of snapshot.templates) {
			const sourceId = String(row.id);
			const mappedId = templateIdMap.get(sourceId);
			if (!mappedId || !templatesToInsert.has(mappedId)) {
				continue;
			}
			const currentVersionId = row.currentVersionId
				? versionIdMap.get(String(row.currentVersionId))
				: null;
			if (currentVersionId) {
				await templateRepo.update(mappedId, { currentVersionId });
			}
		}

		const workRepo = manager.getRepository(V2TypicalWorkEntity);

		for (const row of snapshot.typicalWorks) {
			const id = String(row.id);
			const catalogKey = row.catalogKey ? String(row.catalogKey) : null;
			if (options.skipExisting && catalogKey) {
				const existing = existingWorkByCatalogKey.get(catalogKey);
				if (existing) {
					workIdMap.set(id, existing.id);
					stats.skipped.typicalWorks += 1;
					continue;
				}
			}
			if (options.skipExisting && !catalogKey) {
				const existingById = await workRepo.findOne({ where: { id } });
				if (existingById) {
					workIdMap.set(id, existingById.id);
					stats.skipped.typicalWorks += 1;
					continue;
				}
			}
			const templateId = row.templateId
				? (templateIdMap.get(String(row.templateId)) ??
					String(row.templateId))
				: null;
			await workRepo.save(
				this.fromRow(V2TypicalWorkEntity, {
					...row,
					templateId,
				}),
			);
			workIdMap.set(id, id);
			stats.inserted.typicalWorks += 1;
		}

		if (
			context &&
			snapshot.typicalWorkVersionConfigs.length > 0
		) {
			await this.ensureVersionIdMapForTypicalWorks(
				manager,
				context.fullSnapshot,
				templateIdMap,
				versionIdMap,
				existingTemplateByCode,
				{
					insertTemplates: this.includes(context.sections, "templates"),
				},
				stats,
			);
		}

		const assignmentIdMap = await this.insertTypicalWorkAssignments(
			manager.getRepository(V2TypicalWorkAssignmentEntity),
			snapshot.typicalWorkAssignments,
			workIdMap,
			stats,
		);

		await this.insertWorkChildren(
			manager.getRepository(V2TypicalWorkLaborParamEntity),
			V2TypicalWorkLaborParamEntity,
			snapshot.typicalWorkLaborParams,
			workIdMap,
			options.skipExisting,
			(row) => `${row.workId}::${row.streamExecutor}::${row.paramCode}`,
			stats,
			"typicalWorkLaborParams",
		);

		await this.insertWorkChildren(
			manager.getRepository(V2TypicalWorkNormEntity),
			V2TypicalWorkNormEntity,
			snapshot.typicalWorkNorms,
			workIdMap,
			options.skipExisting,
			(row) => `${row.workId}::${row.streamExecutor}::${row.validFrom}`,
			stats,
			"typicalWorkNorms",
		);
		await this.insertWorkChildren(
			manager.getRepository(V2TypicalWorkRuleEntity),
			V2TypicalWorkRuleEntity,
			snapshot.typicalWorkRules,
			workIdMap,
			options.skipExisting,
			(row) =>
				`${row.workId}::${row.streamExecutor}::${row.paramCode}::${row.operator}::${row.valueCode ?? ""}`,
			stats,
			"typicalWorkRules",
		);
		await this.insertWorkChildren(
			manager.getRepository(V2TypicalWorkLaborCoefficientEntity),
			V2TypicalWorkLaborCoefficientEntity,
			snapshot.typicalWorkLaborCoefficients,
			workIdMap,
			options.skipExisting,
			(row) =>
				`${row.workId}::${row.streamExecutor}::${row.paramCode}::${row.valueCode ?? ""}`,
			stats,
			"typicalWorkLaborCoefficients",
		);

		const versionConfigRepo = manager.getRepository(
			V2TypicalWorkVersionConfigEntity,
		);
		const existingConfigByKey = new Map(
			(await versionConfigRepo.find()).map((row) => [
				`${row.templateVersionId}::${row.workId}::${row.streamExecutor ?? ""}`,
				row,
			]),
		);

		for (const row of snapshot.typicalWorkVersionConfigs) {
			const templateVersionId = versionIdMap.get(
				String(row.templateVersionId),
			);
			const workId = workIdMap.get(String(row.workId));
			if (!templateVersionId || !workId) {
				stats.skipped.typicalWorkVersionConfigs += 1;
				continue;
			}
			const streamExecutor = String(row.streamExecutor ?? "");
			const key = `${templateVersionId}::${workId}::${streamExecutor}`;
			const remappedRow = remapAssignmentIdsInVersionConfigRow(
				{
					...row,
					templateVersionId,
					workId,
					streamExecutor,
				},
				assignmentIdMap,
			);
			const existingConfig = existingConfigByKey.get(key);
			if (options.skipExisting && existingConfig) {
				await versionConfigRepo.save({
					...existingConfig,
					...this.fromRow(V2TypicalWorkVersionConfigEntity, remappedRow),
					id: existingConfig.id,
				});
				stats.inserted.typicalWorkVersionConfigs += 1;
				continue;
			}
			await versionConfigRepo.save(
				this.fromRow(V2TypicalWorkVersionConfigEntity, remappedRow),
			);
			existingConfigByKey.set(
				key,
				existingConfig ??
					(this.fromRow(
						V2TypicalWorkVersionConfigEntity,
						remappedRow,
					) as V2TypicalWorkVersionConfigEntity),
			);
			stats.inserted.typicalWorkVersionConfigs += 1;
		}

		const questionnaireRepo = manager.getRepository(V2QuestionnaireEntity);
		const pendingParents: Array<{ id: string; parentId: string }> = [];

		for (const row of snapshot.questionnaires) {
			const sourceId = String(row.id);
			const readableId = row.readableId ? String(row.readableId) : null;
			if (options.skipExisting) {
				if (existingQuestionnaireIds.has(sourceId)) {
					questionnaireIdMap.set(sourceId, sourceId);
					stats.skipped.questionnaires += 1;
					continue;
				}
				if (
					readableId &&
					existingQuestionnaireByReadableId.has(readableId)
				) {
					stats.skipped.questionnaires += 1;
					continue;
				}
			}

			const templateId = templateIdMap.get(String(row.templateId));
			const boundTemplateVersionId = versionIdMap.get(
				String(row.boundTemplateVersionId),
			);
			if (!templateId || !boundTemplateVersionId) {
				stats.skipped.questionnaires += 1;
				continue;
			}

			const parentSourceId = row.parentQuestionnaireId
				? String(row.parentQuestionnaireId)
				: null;
			const mappedParentId = parentSourceId
				? questionnaireIdMap.get(parentSourceId)
				: null;

			const entity = this.fromRow(V2QuestionnaireEntity, {
				...row,
				templateId,
				boundTemplateVersionId,
				parentQuestionnaireId: mappedParentId ?? null,
			});

			if (parentSourceId && !mappedParentId) {
				entity.parentQuestionnaireId = null;
				await questionnaireRepo.save(entity);
				pendingParents.push({ id: sourceId, parentId: parentSourceId });
			} else {
				await questionnaireRepo.save(entity);
			}

			questionnaireIdMap.set(sourceId, sourceId);
			existingQuestionnaireIds.add(sourceId);
			if (readableId) {
				existingQuestionnaireByReadableId.set(readableId, entity as V2QuestionnaireEntity);
			}
			stats.inserted.questionnaires += 1;
		}

		for (const link of pendingParents) {
			const childId = questionnaireIdMap.get(link.id);
			const parentId = questionnaireIdMap.get(link.parentId);
			if (childId && parentId) {
				await questionnaireRepo.update(childId, {
					parentQuestionnaireId: parentId,
				});
			}
		}
	}

	private async insertTypicalWorkAssignments(
		repo: Repository<V2TypicalWorkAssignmentEntity>,
		rows: Row[],
		workIdMap: Map<string, string>,
		stats: V2DataImportStats,
	): Promise<Map<string, string>> {
		const assignmentIdMap = new Map<string, string>();
		const existing = await repo.find();
		const existingByKey = new Map(
			existing.map((row) => [`${row.workId}::${row.streamExecutor}`, row]),
		);

		for (const row of rows) {
			const sourceId = String(row.id);
			const workId = workIdMap.get(String(row.workId));
			if (!workId) {
				stats.skipped.typicalWorkAssignments += 1;
				continue;
			}
			const streamExecutor = String(row.streamExecutor);
			const key = `${workId}::${streamExecutor}`;
			const existingRow = existingByKey.get(key);
			if (existingRow) {
				assignmentIdMap.set(sourceId, existingRow.id);
				stats.skipped.typicalWorkAssignments += 1;
				continue;
			}

			const saved = await repo.save(
				this.fromRow(V2TypicalWorkAssignmentEntity, {
					...row,
					workId,
					streamExecutor,
				}),
			);
			assignmentIdMap.set(sourceId, saved.id);
			existingByKey.set(key, saved);
			stats.inserted.typicalWorkAssignments += 1;
		}

		return assignmentIdMap;
	}

	private async insertWorkChildren<T extends { workId: string; id: string }>(
		repo: Repository<T>,
		EntityClass: new () => T,
		rows: Row[],
		workIdMap: Map<string, string>,
		skipExisting: boolean,
		keyOf: (row: T) => string,
		stats: V2DataImportStats,
		statKey:
			| "typicalWorkLaborParams"
			| "typicalWorkNorms"
			| "typicalWorkRules"
			| "typicalWorkLaborCoefficients",
	): Promise<void> {
		const existing = await repo.find();
		const existingByKey = new Map(existing.map((row) => [keyOf(row), row]));
		const existingKeys = new Set(existingByKey.keys());

		for (const row of rows) {
			const workId = workIdMap.get(String(row.workId));
			if (!workId) {
				stats.skipped[statKey] += 1;
				continue;
			}
			const entity = this.fromRow(EntityClass, {
				...row,
				workId,
			});
			const key = keyOf(entity);
			const existingRow = existingByKey.get(key);
			if (skipExisting && existingRow) {
				await repo.save({ ...existingRow, ...entity, id: existingRow.id });
				stats.inserted[statKey] += 1;
				continue;
			}
			if (skipExisting && existingKeys.has(key)) {
				stats.skipped[statKey] += 1;
				continue;
			}
			await repo.save(entity);
			existingKeys.add(key);
			existingByKey.set(key, entity);
			stats.inserted[statKey] += 1;
		}
	}

	private async ensureVersionIdMapForTypicalWorks(
		manager: DataSource["manager"],
		fullSnapshot: V2DataSnapshot,
		templateIdMap: Map<string, string>,
		versionIdMap: Map<string, string>,
		existingTemplateByCode: Map<string, V2TemplateEntity>,
		options: { insertTemplates: boolean },
		stats: V2DataImportStats,
	): Promise<void> {
		for (const row of fullSnapshot.templates) {
			const sourceId = String(row.id);
			if (templateIdMap.has(sourceId)) {
				continue;
			}
			const existing = existingTemplateByCode.get(String(row.code));
			if (existing) {
				templateIdMap.set(sourceId, existing.id);
			}
		}

		const versionRepo = manager.getRepository(V2TemplateVersionEntity);
		const existingVersions = await versionRepo.find();
		const existingVersionByTemplate = new Map<
			string,
			V2TemplateVersionEntity[]
		>();
		for (const version of existingVersions) {
			const list = existingVersionByTemplate.get(version.templateId) ?? [];
			list.push(version);
			existingVersionByTemplate.set(version.templateId, list);
		}
		const existingVersionKeys = new Set(
			existingVersions.map(
				(row) => `${row.templateId}::${row.versionNumber}`,
			),
		);

		const sortedVersions = [...fullSnapshot.templateVersions].sort(
			(a, b) => Number(a.versionNumber) - Number(b.versionNumber),
		);

		for (const row of sortedVersions) {
			const sourceId = String(row.id);
			if (versionIdMap.has(sourceId)) {
				continue;
			}

			const mappedTemplateId = templateIdMap.get(String(row.templateId));
			if (!mappedTemplateId) {
				continue;
			}

			const versionNumber = Number(row.versionNumber);
			const versionKey = `${mappedTemplateId}::${versionNumber}`;
			const existingVersion = existingVersionByTemplate
				.get(mappedTemplateId)
				?.find((version) => version.versionNumber === versionNumber);

			if (existingVersion) {
				versionIdMap.set(sourceId, existingVersion.id);
				continue;
			}

			if (!options.insertTemplates) {
				continue;
			}

			const saved = await versionRepo.save(
				this.fromRow(V2TemplateVersionEntity, {
					...row,
					templateId: mappedTemplateId,
					parentVersionId: row.parentVersionId
						? (versionIdMap.get(String(row.parentVersionId)) ?? null)
						: null,
				}),
			);
			versionIdMap.set(sourceId, saved.id);
			existingVersionKeys.add(versionKey);
			const list = existingVersionByTemplate.get(mappedTemplateId) ?? [];
			list.push(saved);
			existingVersionByTemplate.set(mappedTemplateId, list);
			stats.inserted.templateVersions += 1;
		}
	}

	private fromRow<T>(EntityClass: new () => T, row: Row): T {
		const entity = new EntityClass();
		Object.assign(entity as object, row);
		return entity;
	}

	private async indexBy<T>(
		rows: T[] | Promise<T[]>,
		keyOf: (row: T) => string,
	): Promise<Map<string, T>> {
		const list = await rows;
		return new Map(list.map((row) => [keyOf(row), row]));
	}
}

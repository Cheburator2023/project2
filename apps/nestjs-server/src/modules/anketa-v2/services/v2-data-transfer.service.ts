import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { V2DictionaryEntity } from "../entities/v2-dictionary.entity";
import { V2DictionaryItemEntity } from "../entities/v2-dictionary-item.entity";
import { V2QuestionnaireEntity } from "../entities/v2-questionnaire.entity";
import { V2TemplateEntity } from "../entities/v2-template.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";
import { V2TypicalWorkEntity } from "../entities/v2-typical-work.entity";
import { V2TypicalWorkLaborCoefficientEntity } from "../entities/v2-typical-work-labor-coefficient.entity";
import { V2TypicalWorkNormEntity } from "../entities/v2-typical-work-norm.entity";
import { V2TypicalWorkRuleEntity } from "../entities/v2-typical-work-rule.entity";
import { V2TypicalWorkVersionConfigEntity } from "../entities/v2-typical-work-version-config.entity";
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

	async exportSnapshot(): Promise<Buffer> {
		const payload = await this.loadPayload();
		const snapshot = buildV2DataSnapshot(payload);
		return Buffer.from(JSON.stringify(snapshot, null, 2), "utf8");
	}

	async importSnapshot(
		buffer: Buffer,
		mode: V2DataImportMode,
	): Promise<{ meta: V2DataSnapshot["meta"]; stats: V2DataImportStats }> {
		const snapshot = parseV2DataSnapshot(buffer);
		assertV2DataSnapshotIntegrity(snapshot);

		const stats =
			mode === "replace"
				? await this.importReplace(snapshot)
				: await this.importMerge(snapshot);

		return { meta: snapshot.meta, stats };
	}

	private async loadPayload(): Promise<V2DataSnapshotPayload> {
		const [
			dictionaries,
			dictionaryItems,
			templates,
			templateVersions,
			typicalWorks,
			typicalWorkNorms,
			typicalWorkRules,
			typicalWorkLaborCoefficients,
			typicalWorkVersionConfigs,
			questionnaires,
		] = await Promise.all([
			this.dictionaryRepo.find(),
			this.dictionaryItemRepo.find(),
			this.templateRepo.find(),
			this.templateVersionRepo.find(),
			this.typicalWorkRepo.find(),
			this.typicalWorkNormRepo.find(),
			this.typicalWorkRuleRepo.find(),
			this.typicalWorkLaborCoeffRepo.find(),
			this.typicalWorkVersionConfigRepo.find(),
			this.questionnaireRepo.find(),
		]);

		return {
			dictionaries: dictionaries.map((row) => this.toRow(row)),
			dictionaryItems: dictionaryItems.map((row) => this.toRow(row)),
			templates: templates.map((row) => this.toRow(row)),
			templateVersions: templateVersions.map((row) => this.toRow(row)),
			typicalWorks: typicalWorks.map((row) => this.toRow(row)),
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
	): Promise<V2DataImportStats> {
		const stats = this.emptyStats("replace");

		await this.dataSource.transaction(async (manager) => {
			await manager.query(
				`UPDATE v2_questionnaire SET parent_questionnaire_id = NULL`,
			);
			await manager.query(`UPDATE v2_template SET current_version_id = NULL`);

			await manager.delete(V2QuestionnaireEntity, {});
			await manager.delete(V2TypicalWorkVersionConfigEntity, {});
			await manager.delete(V2TypicalWorkNormEntity, {});
			await manager.delete(V2TypicalWorkRuleEntity, {});
			await manager.delete(V2TypicalWorkLaborCoefficientEntity, {});
			await manager.delete(V2TypicalWorkEntity, {});
			await manager.delete(V2TemplateVersionEntity, {});
			await manager.delete(V2TemplateEntity, {});
			await manager.delete(V2DictionaryItemEntity, {});
			await manager.delete(V2DictionaryEntity, {});

			await this.insertAll(manager, snapshot, stats, { skipExisting: false });
		});

		return stats;
	}

	private async importMerge(
		snapshot: V2DataSnapshot,
	): Promise<V2DataImportStats> {
		const stats = this.emptyStats("merge");

		await this.dataSource.transaction(async (manager) => {
			await this.insertAll(manager, snapshot, stats, { skipExisting: true });
		});

		return stats;
	}

	private async insertAll(
		manager: DataSource["manager"],
		snapshot: V2DataSnapshot,
		stats: V2DataImportStats,
		options: { skipExisting: boolean },
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
				}
				stats.skipped.templateVersions += 1;
				continue;
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
		const worksToInsert = new Set<string>();

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
			await workRepo.save(this.fromRow(V2TypicalWorkEntity, row));
			workIdMap.set(id, id);
			worksToInsert.add(id);
			stats.inserted.typicalWorks += 1;
		}

		await this.insertWorkChildren(
			manager.getRepository(V2TypicalWorkNormEntity),
			V2TypicalWorkNormEntity,
			snapshot.typicalWorkNorms,
			workIdMap,
			worksToInsert,
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
			worksToInsert,
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
			worksToInsert,
			options.skipExisting,
			(row) =>
				`${row.workId}::${row.streamExecutor}::${row.paramCode}::${row.valueCode ?? ""}`,
			stats,
			"typicalWorkLaborCoefficients",
		);

		const versionConfigRepo = manager.getRepository(
			V2TypicalWorkVersionConfigEntity,
		);
		const existingConfigKeys = new Set(
			(await versionConfigRepo.find()).map(
				(row) => `${row.templateVersionId}::${row.workId}`,
			),
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
			const key = `${templateVersionId}::${workId}`;
			if (options.skipExisting && existingConfigKeys.has(key)) {
				stats.skipped.typicalWorkVersionConfigs += 1;
				continue;
			}
			await versionConfigRepo.save(
				this.fromRow(V2TypicalWorkVersionConfigEntity, {
					...row,
					templateVersionId,
					workId,
				}),
			);
			existingConfigKeys.add(key);
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

	private async insertWorkChildren<T extends { workId: string }>(
		repo: Repository<T>,
		EntityClass: new () => T,
		rows: Row[],
		workIdMap: Map<string, string>,
		worksToInsert: Set<string>,
		skipExisting: boolean,
		keyOf: (row: T) => string,
		stats: V2DataImportStats,
		statKey:
			| "typicalWorkNorms"
			| "typicalWorkRules"
			| "typicalWorkLaborCoefficients",
	): Promise<void> {
		const existing = await repo.find();
		const existingKeys = new Set(existing.map((row) => keyOf(row)));

		for (const row of rows) {
			const workId = workIdMap.get(String(row.workId));
			if (!workId) {
				stats.skipped[statKey] += 1;
				continue;
			}
			if (skipExisting && !worksToInsert.has(workId)) {
				stats.skipped[statKey] += 1;
				continue;
			}
			const entity = this.fromRow(EntityClass, {
				...row,
				workId,
			});
			const key = keyOf(entity);
			if (skipExisting && existingKeys.has(key)) {
				stats.skipped[statKey] += 1;
				continue;
			}
			await repo.save(entity);
			existingKeys.add(key);
			stats.inserted[statKey] += 1;
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

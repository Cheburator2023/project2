import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Repository } from "typeorm";
import type {
	V2FactoryPublishTypicalWorksRequestDto,
	V2FactoryPublishTypicalWorksResponseDto,
} from "@smart-anketa/api-contract";
import {
	publishFactoryTypicalWorksBundle,
	rebuildFactoryCatalogSnapshotMeta,
} from "@smart-anketa/api-contract";
import type { V2FactoryTypicalWorksSnapshot } from "../constants/v2-factory-typical-works-catalog";
import { V2TemplateEntity } from "../entities/v2-template.entity";
import { V2TemplateVersionEntity } from "../entities/v2-template-version.entity";
import { V2TypicalWorkService } from "./v2-typical-work.service";

const REGISTRY_FILENAME = "v2-factory-template-typical-works.registry.json";
const CATALOG_FILENAME = "v2-factory-typical-works.snapshot.json";

function isFactoryPublishWriteAllowed(): boolean {
	return process.env.V2_FACTORY_PUBLISH_WRITE === "1";
}

function resolveFactoryConstantsDirs(): string[] {
	return [
		join(__dirname, "../constants"),
		join(process.cwd(), "src/modules/anketa-v2/constants"),
		join(process.cwd(), "apps/nestjs-server/src/modules/anketa-v2/constants"),
	];
}

/** Предпочитаем source `src/.../constants` для --write в локальной разработке. */
function resolveFactoryFilePath(filename: string): string {
	const candidates = resolveFactoryConstantsDirs().map((dir) =>
		join(dir, filename),
	);
	const sourceFirst = [
		...candidates.filter((p) => p.includes(`${join("src", "modules")}`)),
		...candidates,
	];
	for (const path of sourceFirst) {
		if (existsSync(path)) return path;
	}
	return candidates[0];
}

@Injectable()
export class V2FactoryTypicalWorksPublishService {
	constructor(
		@InjectRepository(V2TemplateEntity)
		private readonly templateRepository: Repository<V2TemplateEntity>,
		@InjectRepository(V2TemplateVersionEntity)
		private readonly versionRepository: Repository<V2TemplateVersionEntity>,
		private readonly typicalWorkService: V2TypicalWorkService,
	) {}

	async publish(
		dto: V2FactoryPublishTypicalWorksRequestDto,
	): Promise<V2FactoryPublishTypicalWorksResponseDto> {
		const templateId = dto.templateId?.trim();
		const versionId = dto.versionId?.trim();
		if (!templateId || !versionId) {
			throw new BadRequestException("Укажите templateId и versionId");
		}

		const template = await this.templateRepository.findOne({
			where: { id: templateId },
		});
		if (!template) {
			throw new NotFoundException(`Template ${templateId} not found`);
		}

		const version = await this.versionRepository.findOne({
			where: { id: versionId, templateId },
		});
		if (!version) {
			throw new NotFoundException(
				`Version ${versionId} not found for template ${templateId}`,
			);
		}

		const catalogPath = resolveFactoryFilePath(CATALOG_FILENAME);
		const registryPath = resolveFactoryFilePath(REGISTRY_FILENAME);
		const catalogSnapshot = JSON.parse(
			readFileSync(catalogPath, "utf-8"),
		) as V2FactoryTypicalWorksSnapshot;

		const cards = await this.typicalWorkService.listWorkCardsForVersion(
			templateId,
			versionId,
		);

		const result = publishFactoryTypicalWorksBundle({
			cards,
			existingCatalog: catalogSnapshot.typicalWorks,
			templateId,
			templateName: template.name,
		});

		const catalogMeta = rebuildFactoryCatalogSnapshotMeta(result.catalogRows, {
			snapshotVersion: catalogSnapshot.meta.snapshotVersion,
			description: catalogSnapshot.meta.description,
		});

		const nextCatalog: V2FactoryTypicalWorksSnapshot = {
			...catalogSnapshot,
			meta: {
				...catalogMeta,
				counts: {
					...catalogMeta.counts,
					dictionaries: catalogSnapshot.dictionaries?.length ?? 0,
				},
			},
			typicalWorks:
				result.catalogRows as V2FactoryTypicalWorksSnapshot["typicalWorks"],
			dictionaries: catalogSnapshot.dictionaries,
		};

		const writeAllowed = isFactoryPublishWriteAllowed();
		let wrote = false;
		let writeDisabledReason: string | null = null;

		if (dto.write) {
			if (!writeAllowed) {
				writeDisabledReason =
					"Запись на диск отключена. Запустите сервер с V2_FACTORY_PUBLISH_WRITE=1 (локально).";
			} else {
				writeFileSync(
					registryPath,
					`${JSON.stringify(result.registry, null, "\t")}\n`,
					"utf-8",
				);
				writeFileSync(
					catalogPath,
					`${JSON.stringify(nextCatalog, null, "\t")}\n`,
					"utf-8",
				);
				wrote = true;
			}
		}

		return {
			report: result.report,
			registry: result.registry,
			catalog: nextCatalog,
			wrote,
			writeAllowed,
			writeDisabledReason,
		};
	}
}

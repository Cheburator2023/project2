import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type {
	UpdateV2FactorySnapshotSettingDto,
	V2EffectiveFactoryEditorSnapshotDto,
	V2FactorySnapshotSettingDto,
	V2WorkRefIndexItemDto,
} from "@smart-anketa/api-contract";
import { CurrentUser } from "../../../shared/decorators/user.decorator";
import { V2_FACTORY_TEMPLATE_TYPICAL_WORKS_REGISTRY } from "../constants/v2-factory-template-typical-works-registry";
import { V2FactorySnapshotService } from "../services/v2-factory-snapshot.service";
import { V2TypicalWorkService } from "../services/v2-typical-work.service";

@ApiTags("v2-factory-snapshot")
@Controller("v2/factory-snapshot")
export class V2FactorySnapshotController {
	constructor(
		private readonly factorySnapshotService: V2FactorySnapshotService,
		private readonly typicalWorkService: V2TypicalWorkService,
	) {}

	@Get()
	@ApiOperation({ summary: "Текущий заводской эталон (встроенный или схема из БД)" })
	async getSetting(): Promise<V2FactorySnapshotSettingDto> {
		return this.factorySnapshotService.getSettingDto();
	}

	@Get("effective-editor-snapshot")
	@ApiOperation({
		summary:
			"Эффективный эталон для диффа: схема как при createDraftFromDefault + работы",
	})
	async getEffectiveEditorSnapshot(): Promise<V2EffectiveFactoryEditorSnapshotDto> {
		const setting = await this.factorySnapshotService.getSettingDto();
		/** Та же обработка, что createDraftFromDefault (resolve logic + strip calcName). */
		const snap = await this.factorySnapshotService.getEffectiveSnapshot();
		const workRefIndex = await this.buildWorkRefIndex(
			setting.source === "template" ? setting.templateId : null,
		);

		if (
			setting.source === "template" &&
			setting.templateId &&
			setting.versionId
		) {
			const typicalWorks =
				await this.typicalWorkService.listWorkCardsForVersion(
					setting.templateId,
					setting.versionId,
				);
			return {
				setting,
				jsonSchema: snap.jsonSchema,
				uiSchema: snap.uiSchema,
				logic: snap.logic,
				dictionariesSnapshot: snap.dictionariesSnapshot,
				typicalWorks,
				workRefIndex,
			};
		}

		return {
			setting,
			jsonSchema: snap.jsonSchema,
			uiSchema: snap.uiSchema,
			logic: snap.logic,
			dictionariesSnapshot: snap.dictionariesSnapshot,
			/** Builtin: карточки из registry+каталога, чтобы дифф ловил правки условий. */
			typicalWorks:
				this.typicalWorkService.listFactoryBundleTypicalWorksForDiff(),
			workRefIndex,
		};
	}

	/**
	 * Factory registry (+ работы шаблона-эталона) для нормализации
	 * allowedWorkIds/boundWorkIds в arch|name при диффе.
	 */
	private async buildWorkRefIndex(
		templateId: string | null,
	): Promise<V2WorkRefIndexItemDto[]> {
		const byId = new Map<string, V2WorkRefIndexItemDto>();
		for (const entry of V2_FACTORY_TEMPLATE_TYPICAL_WORKS_REGISTRY.works) {
			const id = entry.id.trim();
			if (!id) continue;
			byId.set(id, {
				id,
				name: entry.name.trim(),
				archComponentType: entry.archComponentType.trim(),
			});
		}
		if (templateId?.trim()) {
			const list = await this.typicalWorkService.listWorks({
				templateId: templateId.trim(),
			});
			for (const item of list.items) {
				byId.set(item.id, {
					id: item.id,
					name: item.name.trim(),
					archComponentType: item.archComponentType.trim(),
				});
			}
		}
		return [...byId.values()];
	}

	@Put()
	@ApiOperation({
		summary:
			"Назначить заводской эталон: встроенный JSON-снимок или версия выбранной схемы",
	})
	async updateSetting(
		@Body() body: UpdateV2FactorySnapshotSettingDto,
		@CurrentUser() user: { id: string } | null,
	): Promise<V2FactorySnapshotSettingDto> {
		return this.factorySnapshotService.updateSetting(body, user?.id ?? null);
	}
}

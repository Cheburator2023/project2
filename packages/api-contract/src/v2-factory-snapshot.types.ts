import type {
	V2DictionariesSnapshotDto,
	V2JsonSchemaDto,
	V2LogicGraphDto,
	V2UiSchemaDto,
} from "./v2-template.types";
import type { V2TypicalWorkCardDto } from "./v2-typical-work.types";

export const V2_FACTORY_SNAPSHOT_SOURCE_VALUES = ["builtin", "template"] as const;

export type V2FactorySnapshotSource =
	(typeof V2_FACTORY_SNAPSHOT_SOURCE_VALUES)[number];

export type V2FactorySnapshotSettingDto = {
	source: V2FactorySnapshotSource;
	templateId: string | null;
	versionId: string | null;
	templateName: string | null;
	versionNumber: number | null;
	builtinSnapshotLabel: string;
	updatedAt: string | null;
};

export type UpdateV2FactorySnapshotSettingDto = {
	source: V2FactorySnapshotSource;
	templateId?: string | null;
	versionId?: string | null;
};

/** Полный снепшот версии для JSON-панели конструктора (схема + карточки работ). */
export type V2TemplateVersionEditorSnapshotDto = {
	jsonSchema: V2JsonSchemaDto;
	uiSchema: V2UiSchemaDto;
	logic: V2LogicGraphDto;
	dictionariesSnapshot: V2DictionariesSnapshotDto | null;
	typicalWorks: V2TypicalWorkCardDto[];
};

/**
 * Id работы → стабильная идентичность (arch|name) для диффа клонов / builtin.
 * Builtin-эталон хранит в logic id из factory registry; у клона — другие uuid.
 */
export type V2WorkRefIndexItemDto = {
	id: string;
	name: string;
	archComponentType: string;
};

/**
 * Эффективный заводской эталон для диффа в конструкторе.
 * Builtin: `typicalWorks` — синтетика из registry+каталога (условия для диффа).
 * Template: карточки версии-эталона из БД.
 * `workRefIndex` — id→arch|name для нормализации allowedWorkIds/boundWorkIds.
 */
export type V2EffectiveFactoryEditorSnapshotDto = {
	setting: V2FactorySnapshotSettingDto;
	jsonSchema: V2JsonSchemaDto;
	uiSchema: V2UiSchemaDto;
	logic: V2LogicGraphDto;
	dictionariesSnapshot: V2DictionariesSnapshotDto | null;
	typicalWorks: V2TypicalWorkCardDto[] | null;
	workRefIndex: V2WorkRefIndexItemDto[];
};

/** Запрос publish типовых работ в factory bundle (registry + catalog). */
export type V2FactoryPublishTypicalWorksRequestDto = {
	templateId: string;
	versionId: string;
	/** Записать JSON на диск сервера (только если V2_FACTORY_PUBLISH_WRITE=1). */
	write?: boolean;
};

export type V2FactoryPublishTypicalWorksReportDto = {
	registryWorks: number;
	catalogAdded: number;
	catalogUpdated: number;
	catalogUnchanged: number;
	catalogPreserved: number;
	dropped: Array<{
		workId: string;
		workName: string;
		streamExecutor: string;
		field: string;
		reason: string;
	}>;
	legacyStreamCatalogRows: number;
};

export type V2FactoryPublishTypicalWorksResponseDto = {
	report: V2FactoryPublishTypicalWorksReportDto;
	registry: unknown;
	catalog: unknown;
	wrote: boolean;
	writeAllowed: boolean;
	writeDisabledReason: string | null;
};

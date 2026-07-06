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

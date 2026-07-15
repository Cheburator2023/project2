import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REGISTRY_FILENAME = "v2-factory-template-typical-works.registry.json";

export type V2FactoryTemplateTypicalWorkRegistryItem = {
	id: string;
	name: string;
	archComponentType: string;
	workType: string | null;
	streams: string[];
	normsByStream: Record<string, number | null>;
};

export type V2FactoryTemplateTypicalWorksRegistry = {
	meta: {
		snapshotVersion: number;
		factoryBundle: boolean;
		description?: string;
		sourceTemplateId: string;
		sourceTemplateName: string;
		counts: { works: number };
	};
	works: V2FactoryTemplateTypicalWorkRegistryItem[];
};

function resolveRegistryPath(): string {
	const distPath = join(__dirname, REGISTRY_FILENAME);
	if (existsSync(distPath)) return distPath;
	return join(
		process.cwd(),
		"src/modules/anketa-v2/constants",
		REGISTRY_FILENAME,
	);
}

function loadRegistry(): V2FactoryTemplateTypicalWorksRegistry {
	const path = resolveRegistryPath();
	return JSON.parse(
		readFileSync(path, "utf-8"),
	) as V2FactoryTemplateTypicalWorksRegistry;
}

export const V2_FACTORY_TEMPLATE_TYPICAL_WORKS_REGISTRY: V2FactoryTemplateTypicalWorksRegistry =
	loadRegistry();

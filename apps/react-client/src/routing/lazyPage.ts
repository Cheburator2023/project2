import { lazy, type ComponentType, type LazyExoticComponent } from "react";

type ModuleRecord = Record<string, ComponentType<never> | unknown>;

export function lazyPage<P = object>(
	factory: () => Promise<ModuleRecord>,
	exportName: string,
): LazyExoticComponent<ComponentType<P>> {
	return lazy(async () => {
		const module = await factory();
		const component = module[exportName] as ComponentType<P> | undefined;

		if (!component) {
			throw new Error(`lazyPage: export "${exportName}" not found`);
		}

		return { default: component };
	});
}

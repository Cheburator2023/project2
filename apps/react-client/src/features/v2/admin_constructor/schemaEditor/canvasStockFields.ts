import type { UiSchema } from "@rjsf/utils";
import type { V2ArchComponentType } from "@smart-anketa/api-contract";
import { ARCH_COMPONENT_PRESET_DEFS } from "./archComponentPresets";
import { resolveArchComponentAtPointer } from "./propertiesFieldKind";
import { parentOfPointer } from "../utils/schemaPaths";
import { getObjectItemsSchema } from "../utils/schemaMutators";

const STOCK_ARCH_ARRAY_COMPONENTS = new Set<V2ArchComponentType>([
	"atypicalWork",
	"typicalWork",
]);

function stockItemKeysForArch(arch: V2ArchComponentType): Set<string> | null {
	if (!STOCK_ARCH_ARRAY_COMPONENTS.has(arch)) return null;
	const preset = ARCH_COMPONENT_PRESET_DEFS[arch]?.make();
	if (!preset) return null;
	const items = getObjectItemsSchema(preset);
	if (!items?.properties) return null;
	return new Set(Object.keys(items.properties));
}

/** JSON Pointer массива-архблока для поля внутри `…/items/<key>`. */
export function resolveArrayPointerFromItemField(
	fieldPointer: string,
): string | null {
	const pk = parentOfPointer(fieldPointer);
	if (!pk || pk.parentSegments.at(-1) !== "items") return null;
	return `/${pk.parentSegments.slice(0, -1).join("/")}`;
}

/** Стоковое поле элемента арх. списка (из пресета atypicalWork / typicalWork). */
export function isCanvasStockField(
	uiSchema: UiSchema | Record<string, unknown> | undefined,
	fieldPointer: string,
): boolean {
	const arrayPointer = resolveArrayPointerFromItemField(fieldPointer);
	if (!arrayPointer) return false;
	const arch = resolveArchComponentAtPointer(uiSchema, arrayPointer);
	if (!arch) return false;
	const stockKeys = stockItemKeysForArch(arch);
	if (!stockKeys) return false;
	const pk = parentOfPointer(fieldPointer);
	return pk ? stockKeys.has(pk.key) : false;
}

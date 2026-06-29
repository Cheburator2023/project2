import type { V2LogicGraphDto } from "@smart-anketa/api-contract";
import { V2_DEFAULT_TEMPLATE_SNAPSHOT } from "./v2-default-template-snapshot";

/**
 * Заводская логика эталонной схемы (`v2-default-anketa.snapshot.json`).
 * Обновляется вместе со snapshot: `npm run sync:factory-snapshot`.
 */
export const V2_DEFAULT_LOGIC_GRAPH: V2LogicGraphDto =
	V2_DEFAULT_TEMPLATE_SNAPSHOT.logic;

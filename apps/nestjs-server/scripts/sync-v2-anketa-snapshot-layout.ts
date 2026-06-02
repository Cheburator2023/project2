/**
 * Записывает в v2-default-anketa.snapshot.json layout ui:options из enrichAnketaLayoutUiSchema.
 * npm run sync:anketa-snapshot-layout (из apps/nestjs-server)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { enrichAnketaLayoutUiSchema } from "@smart-anketa/api-contract";

const snapshotPath = join(
	__dirname,
	"../src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json",
);

const raw = JSON.parse(readFileSync(snapshotPath, "utf-8")) as {
	jsonSchema: Record<string, unknown>;
	uiSchema: Record<string, unknown>;
	logic?: unknown;
};

raw.uiSchema = enrichAnketaLayoutUiSchema(
	raw.uiSchema,
	raw.jsonSchema,
) as Record<string, unknown>;

writeFileSync(snapshotPath, `${JSON.stringify(raw, null, "\t")}\n`, "utf-8");
console.log("Updated layout ui:options in", snapshotPath);

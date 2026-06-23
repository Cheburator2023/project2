import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseLatestChangelogVersion } from "@smart-anketa/api-contract";

const CHANGELOG_FILE = "CHANGELOG.md";

export function resolveLatestChangelogVersion(
	startDirs: string[],
): string | null {
	for (const startDir of startDirs) {
		let current = startDir;

		for (let depth = 0; depth < 6; depth += 1) {
			const changelogPath = join(current, CHANGELOG_FILE);
			if (existsSync(changelogPath)) {
				const content = readFileSync(changelogPath, "utf8");
				return parseLatestChangelogVersion(content);
			}

			const parent = join(current, "..");
			if (parent === current) break;
			current = parent;
		}
	}

	return null;
}

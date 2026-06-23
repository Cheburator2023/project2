import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { Injectable } from "@nestjs/common";
import type { AppVersionDto } from "@smart-anketa/api-contract";
import { resolveLatestChangelogVersion } from "./changelog-version";

@Injectable()
export class AppInfoService {
	getVersion(): AppVersionDto {
		const pkgPath = join(process.cwd(), "package.json");
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
			name?: string;
			version?: string;
		};

		return {
			name: pkg.name ?? "nestjs-server",
			version:
				resolveLatestChangelogVersion([process.cwd(), __dirname]) ??
				pkg.version ??
				"0.0.0",
			gitRevision: this.resolveGitRevision(),
		};
	}

	private resolveGitRevision(): string | null {
		const fromEnv = process.env.GIT_REVISION?.trim();
		if (fromEnv) return fromEnv;

		try {
			return execSync('git show --format="short" -s', {
				encoding: "utf8",
			}).trim();
		} catch {
			return null;
		}
	}
}

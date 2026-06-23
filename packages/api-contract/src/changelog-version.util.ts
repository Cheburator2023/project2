const CHANGELOG_VERSION_HEADING = /^#{1,3}\s+\[(\d+\.\d+\.\d+)\]/m;

export function parseLatestChangelogVersion(content: string): string | null {
	const match = content.match(CHANGELOG_VERSION_HEADING);
	return match?.[1] ?? null;
}

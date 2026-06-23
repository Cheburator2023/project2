const CHANGELOG_VERSION_HEADING = /^#{1,3}\s+\[(\d+\.\d+\.\d+)\]/m;
export function parseLatestChangelogVersion(content) {
    const match = content.match(CHANGELOG_VERSION_HEADING);
    return match?.[1] ?? null;
}

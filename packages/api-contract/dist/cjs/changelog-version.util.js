"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLatestChangelogVersion = parseLatestChangelogVersion;
const CHANGELOG_VERSION_HEADING = /^#{1,3}\s+\[(\d+\.\d+\.\d+)\]/m;
function parseLatestChangelogVersion(content) {
    const match = content.match(CHANGELOG_VERSION_HEADING);
    return match?.[1] ?? null;
}

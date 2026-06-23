"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const changelog_version_util_1 = require("./changelog-version.util");
describe("parseLatestChangelogVersion", () => {
    it("returns the first semver heading from changelog", () => {
        const content = `# Semantic Versioning Changelog

## [1.21.2](https://example.com/compare/v1.21.1...v1.21.2) (2026-06-22)

# [1.21.0](https://example.com/compare/v1.20.0...v1.21.0) (2026-06-22)
`;
        expect((0, changelog_version_util_1.parseLatestChangelogVersion)(content)).toBe("1.21.2");
    });
    it("returns null when no version heading is found", () => {
        expect((0, changelog_version_util_1.parseLatestChangelogVersion)("# Changelog\n\nNo releases yet.")).toBeNull();
    });
});

const pullRequestRegexp = /^Merge pull request #\d+:.*/s;

module.exports = {
	extends: ["@commitlint/config-conventional"],
	ignores: [
		(commit) => pullRequestRegexp.test(commit),
		(commit) => commit.startsWith("Merge: fix conflict"),
	],
	rules: {
		"body-max-line-length": [1, "always", 1000],
		"header-max-length": [2, "always", 1000],
	},
};

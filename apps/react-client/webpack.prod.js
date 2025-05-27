const { merge } = require("webpack-merge");
const webpack = require("webpack");

const { DefinePlugin } = webpack;
const common = require("./webpack.common.js");

const git_revision = require("node:child_process")
	.execSync('git show --format="short" -s')
	.toString()
	.trim();

module.exports = merge(common, {
	mode: "production",
	plugins: [
		new DefinePlugin({
			"process.env.MOCKED_REQUESTS": JSON.stringify(
				process.env.MOCKED_REQUESTS || "",
			),
			"process.env.GIT_REVISION": JSON.stringify(git_revision || ""),
		}),
	],
});

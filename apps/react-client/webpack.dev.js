const { merge } = require("webpack-merge");
const path = require("node:path");
const { readFileSync } = require("node:fs");
const webpack = require("webpack");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");

const { DefinePlugin } = webpack;
const APP_NAME = "smartAnketa";

const common = require("./webpack.common.js");
const git_revision = require("node:child_process")
	.execSync('git show --format="short" -s')
	.toString()
	.trim();
const changelog_content = readFileSync(
	path.resolve(__dirname, "../../CHANGELOG.md"),
	"utf8",
);
const changelog_version_match = changelog_content.match(
	/^#{1,3}\s+\[(\d+\.\d+\.\d+)\]/m,
);
const app_version = changelog_version_match?.[1] ?? "0.0.0";

/**
 * publicPath:
 * - standalone http://localhost:8004/ → "/" или "auto"
 * - shell грузит http://localhost:8004/remoteEntry.js → нужен абсолютный
 *   PUBLIC_PATH=http://localhost:8004/ (или "auto")
 * - shell через /proxy/smart-anketa-frontend/ →
 *   PUBLIC_PATH=/proxy/smart-anketa-frontend/
 */
const PUBLIC_PATH =
	process.env.PUBLIC_PATH ||
	(process.env.MF_SHELL === "1" ? "http://localhost:8004/" : "/");

module.exports = merge(common, {
	mode: "development",
	devtool: "cheap-module-source-map",
	output: {
		publicPath: PUBLIC_PATH,
	},
	optimization: {
		minimize: false,
	},
	plugins: [
		new ReactRefreshWebpackPlugin({ overlay: false }),
		new DefinePlugin({
			"process.env": {},
			"process.env.NODE_ENV": JSON.stringify("development"),
			"process.env.MOCKED_REQUESTS": JSON.stringify(
				process.env.MOCKED_REQUESTS || "",
			),
			"process.env.GIT_REVISION": JSON.stringify(git_revision || ""),
			"process.env.APP_VERSION": JSON.stringify(app_version),
			"process.env.APP_NAME": JSON.stringify(APP_NAME),
			"process.env.REACT_APP_API_URL": JSON.stringify("http://localhost:3000"),
			"process.env.NO_ROLES": JSON.stringify(process.env.NO_ROLES || ""),
		}),
	],
	watchOptions: {
		...(process.env.WEBPACK_POLL
			? { poll: Number(process.env.WEBPACK_POLL) || 1000 }
			: {}),
		ignored: /node_modules/,
	},
	devServer: {
		static: [
			{
				directory: path.join(__dirname, "public"),
				publicPath: "/",
			},
		],
		port: Number(process.env.PORT) || 8004,
		historyApiFallback: {
			index: "/index.html",
			disableDotRule: false,
		},
		hot: true,
		liveReload: false,
		allowedHosts: ["all"],
		headers: {
			// Shell на :8080 грузит remoteEntry/chunks с :8004
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
			"Access-Control-Allow-Headers": "*",
		},
		devMiddleware: {
			publicPath: PUBLIC_PATH.startsWith("http") ? "/" : PUBLIC_PATH,
			writeToDisk: false,
		},
		client: {
			overlay: {
				runtimeErrors: (error) => {
					const ignoreErrors = [
						"ResizeObserver loop completed with undelivered notifications.",
					];
					return !ignoreErrors.includes(error.message);
				},
			},
			reconnect: 5,
		},
	},
});

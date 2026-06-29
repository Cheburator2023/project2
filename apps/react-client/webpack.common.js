const path = require("node:path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ModuleFederationPlugin =
	require("webpack").container.ModuleFederationPlugin;
const browserslistToEsbuild = require("browserslist-to-esbuild").default;

const SRC_DIR = path.join(__dirname, "./src");
const PUBLIC_PATH = process.env.PUBLIC_PATH || undefined;
const isDev = process.env.NODE_ENV === "development";
const APP_NAME = "smartAnketa";
const JSON_LOGIC_TS_ENTRY = path.resolve(
	__dirname,
	"../../packages/json-logic-ts/dist/esm/index.js",
);
const NODE_MODULES_DIR = path.resolve(__dirname, "../../node_modules");

const ALIAS = {
	"@react-client": `${SRC_DIR}`,
	// Webpack: ESM+browser-safe entry (CJS loadEngine uses node:module/createRequire).
	"@smart-anketa/json-logic-ts": JSON_LOGIC_TS_ENTRY,
};

const tsRule = isDev
	? {
			test: /\.tsx?$/,
			loader: "babel-loader",
			options: {
				cacheDirectory: true,
				cacheCompression: false,
				presets: [
					"@babel/preset-env",
					["@babel/preset-react", { runtime: "automatic" }],
					"@babel/preset-typescript",
					"react-refresh/babel",
				],
			},
			exclude: /node_modules/,
		}
	: [
			{
				test: /\.tsx$/,
				loader: "esbuild-loader",
				options: {
					loader: "tsx",
					target: browserslistToEsbuild(),
				},
				exclude: /node_modules/,
			},
			{
				test: /\.ts$/,
				loader: "esbuild-loader",
				options: {
					loader: "ts",
					target: browserslistToEsbuild(),
				},
				exclude: /node_modules/,
			},
		];

/** @type {import('webpack').Configuration} */
module.exports = {
	entry: {
		app: "./src/index",
	},
	plugins: [
		new ModuleFederationPlugin({
			name: APP_NAME,
			exposes: {
				"./App": "./src/indexFederated",
			},
			filename: "remoteEntry.js",
			shared: {},
		}),
		new HtmlWebpackPlugin({
			template: "./public/index.html",
			excludeChunks: [APP_NAME],
		}),
	],
	output: {
		filename: "[name].bundle.js",
		path: path.resolve(__dirname, "dist"),
		publicPath: PUBLIC_PATH,
		clean: true,
	},
	cache: {
		type: "filesystem",
		buildDependencies: {
			config: [__filename],
		},
	},
	snapshot: {
		managedPaths: [NODE_MODULES_DIR],
	},
	resolve: {
		alias: ALIAS,
		extensions: [".ts", ".tsx", ".js", ".jsx"],
		// ESM packages in monorepo (json-logic-ts) use explicit .js extensions.
		extensionAlias: {
			".js": [".js", ".ts", ".tsx"],
		},
		fallback: {
			url: false,
			path: false,
		},
	},
	module: {
		rules: [
			...(Array.isArray(tsRule) ? tsRule : [tsRule]),
			{
				test: /\.svg$/i,
				issuer: /\.[jt]sx?$/,
				use: ["@svgr/webpack"],
			},
			{
				test: /\.(gif|svg|jpg|png|otf|ttf)$/,
				use: "file-loader",
			},
			// Глобальные стили (dockview, xyflow, toasts) — без CSS Modules, как в data_lineage.
			{
				test: /\.css$/,
				use: ["style-loader", "css-loader"],
			},
		],
	},
};

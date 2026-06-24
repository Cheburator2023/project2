const path = require("node:path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ModuleFederationPlugin =
	require("webpack").container.ModuleFederationPlugin;

const SRC_DIR = path.join(__dirname, "./src");
const TS_CONFIG_PATH = path.resolve(__dirname, "./tsconfig.json");
const PUBLIC_PATH = process.env.PUBLIC_PATH || undefined;
const isDev = process.env.NODE_ENV === "development";
const APP_NAME = "smartAnketa";
const JSON_LOGIC_TS_ENTRY = path.resolve(
	__dirname,
	"../../packages/json-logic-ts/dist/esm/index.js",
);

const ALIAS = {
	"@react-client": `${SRC_DIR}`,
	// Webpack: ESM+browser-safe entry (CJS loadEngine uses node:module/createRequire).
	"@smart-anketa/json-logic-ts": JSON_LOGIC_TS_ENTRY,
};

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
			// {
			// 	test: /bootstrap\.tsx$/,
			// 	loader: "bundle-loader",
			// 	options: {
			// 		lazy: true,
			// 	},
			// },
			{
				test: /\.tsx?$/,
				loader: "babel-loader",
				options: {
					presets: [
						"@babel/preset-env",
						["@babel/preset-react", { runtime: "automatic" }],
						"@babel/preset-typescript",
						...(isDev ? ["react-refresh/babel"] : []),
					],
				},
				exclude: /node_modules/,
			},
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

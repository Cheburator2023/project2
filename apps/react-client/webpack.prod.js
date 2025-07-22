const { merge } = require("webpack-merge");
const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");

const { DefinePlugin } = webpack;
const common = require("./webpack.common.js");
const APP_NAME = "smartAnketa";

const git_revision = require("child_process")
	.execSync('git show --format="short" -s')
	.toString()
	.trim();

module.exports = merge(common, {
	mode: "development",
	devtool: "cheap-module-source-map",
	optimization: {
		minimize: true, // Enables the minimizers configured in 'minimizer' [3, 10, 12, 17, 21]
		minimizer: [
			// For JavaScript optimization
			new TerserPlugin({
				parallel: true, // Enable multi-process parallel running for faster builds [3, 21]
				terserOptions: {
					compress: {
						drop_console: true, // Remove console.log statements from production code [19, 21]
					},
					mangle: true, // Enable name mangling for smaller code [19, 21]
					output: {
						comments: false, // Remove all comments from the output [21]
					},
				},
				// Enable source maps for debugging minified code in production [3, 21]
				// Requires 'devtool: "source-map"' or similar in the main webpack config [3, 21, 23]
				// sourceMap: true, // Uncomment if you need source maps for production debugging
			}),
			// The '...' syntax extends existing minimizers (like TerserPlugin which is built-in for JS) [2]
			// It ensures that other default minimizers are also applied if Webpack adds them.
			// Make sure to add it if you're replacing the default minimizers with custom ones.
			// '...',
		],
		splitChunks: {
			chunks: "all", // Optimize all chunks, including initial and async ones [6, 29, 31]
			minSize: 20000, // Minimum size in bytes for a chunk to be generated (defaults to 20kb) [31]
			// maxAsyncRequests: 30, // Maximum number of parallel requests for on-demand chunks (default) [31]
			// maxInitialRequests: 30, // Maximum number of parallel requests at initial page load (default) [31]
			// enforceSizeThreshold: 50000, // Enforces the maximum size for all chunks
			cacheGroups: {
				vendor: {
					test: /[\\/]node_modules[\\/]/, // Separate vendor (node_modules) code into its own chunk [11, 17, 24]
					name: "vendors", // Name of the vendor chunk [11, 17, 24]
					chunks: "all", // Apply to all types of chunks [11, 17]
					reuseExistingChunk: true, // If a chunk already exists, reuse it
				},
				common: {
					minChunks: 2, // Minimum number of chunks that must share a module before splitting [31]
					priority: -10, // A module can belong to multiple cache groups. The one with higher priority is chosen.
					name: "common", // Name of the common chunk
					reuseExistingChunk: true,
				},
				// Add other cache groups as needed for specific libraries or application sections
			},
		},
		runtimeChunk: {
			name: (entrypoint) => `runtime-${entrypoint.name}`, // Extract the runtime code into a separate chunk per entrypoint [2, 9, 11]
			// Setting `true` is an alias for a default name for the runtime chunk. [2]
		},
		moduleIds: "deterministic", // Generate short, but deterministic, numeric IDs for modules, useful for long-term caching [2, 6, 7]
		chunkIds: "deterministic", // Generate short, but deterministic, numeric IDs for chunks, useful for long-term caching [2, 6]
		usedExports: true, // Enable tree shaking to mark unused exports, allowing minimizers to remove dead code [1, 2, 10, 20, 21]
		sideEffects: true, // Optimize by identifying and removing modules with no side effects. Requires "sideEffects": false in package.json for pure modules [1, 6, 10, 20, 24]
		concatenateModules: true, // Enable scope hoisting for smaller and faster code by concatenating modules [2, 6]
		nodeEnv: "production", // Sets process.env.NODE_ENV to 'production'. This is usually handled by 'mode: "production"' [2, 14]
		checkWasmTypes: true, // Tells webpack to check the incompatible types of WebAssembly modules [2]
	},
	plugins: [
		new DefinePlugin({
			"process.env": {},
			"process.env.MOCKED_REQUESTS": JSON.stringify(
				process.env.MOCKED_REQUESTS || "",
			),
			"process.env.GIT_REVISION": JSON.stringify(git_revision || ""),
			"process.env.APP_NAME": JSON.stringify(APP_NAME),
			"process.env.REACT_APP_API_URL": JSON.stringify("http://localhost:3000"),
			"process.env.NO_ROLES": JSON.stringify(process.env.NO_ROLES || ""),
		}),
	],
});

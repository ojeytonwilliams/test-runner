const webpack = require("webpack");

const commonConfig = (isDev) => {
	return {
		mode: isDev ? "development" : "production",
		cache: isDev ? { type: "filesystem" } : false,
		output: {
			filename: "[name].mjs",
			// during testing, we need the files to be available for the test server:
			path: isDev ? __dirname + "/__fixtures__/dist" : __dirname + "/dist",
		},
		module: {
			rules: [
				{
					test: /\.ts$/,
					use: [
						{
							loader: "ts-loader",
							options: {
								projectReferences: true,
							},
						},
					],
					exclude: /node_modules/,
				},
			],
		},
		resolve: {
			fallback: {
				// buffer: require.resolve("buffer"),
				util: require.resolve("util"),
				stream: false,
				process: require.resolve("process/browser.js"),
			},
			extensions: [".ts", ".js"],
		},
		plugins: [
			new webpack.ProvidePlugin({
				process: "process/browser",
			}),
		],
	};
};

// ts-loader doesn't seem to support multiple entry points, so we need to create
// multiple configs
const entryPoints = [
	{
		name: "index",
		path: "./packages/main/src/index.ts",
	},
	{
		name: "frame-test-evaluator",
		path: "./packages/frame-evaluators/src/frame-test-evaluator.ts",
	},
	{
		name: "worker-test-evaluator",
		path: "./packages/workers/src/worker-test-evaluator.ts",
	},
];

module.exports = (env = {}) => {
	const isDev = env.development;

	return entryPoints.map((entryPoint) => {
		return {
			...commonConfig(isDev),
			entry: {
				[entryPoint.name]: entryPoint.path,
			},
		};
	});
};

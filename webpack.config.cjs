const webpack = require("webpack");

// ts-loader doesn't seem to support multiple entry points, so we need to create
// multiple sets of rules for each entry point.
const sources = [
	{
		name: "index",
		path: __dirname + "/packages/main/src/",
	},
	{
		name: "frame-test-evaluator",
		path: __dirname + "/packages/frame-evaluators/src/",
	},
	{
		name: "worker-test-evaluator",
		path: __dirname + "/packages/workers/src/",
	},
];

const entry = sources.reduce(
	(acc, { name, path }) => ({
		...acc,
		[name]: `${path}/${name}.ts`,
	}),
	{},
);

module.exports = (env = {}) => {
	const isDev = env.development;

	return {
		mode: isDev ? "development" : "production",
		cache: isDev ? { type: "filesystem" } : false,
		entry,
		output: {
			filename: "[name].mjs",
			// during testing, we need the files to be available for the test server:
			path: isDev ? __dirname + "/__fixtures__/dist" : __dirname + "/dist",
			clean: true,
		},
		module: {
			rules: sources.map(({ name, path }) => ({
				test: /\.ts$/,
				include: path,
				use: [
					{
						loader: "ts-loader",
						options: {
							projectReferences: true,
							instance: name,
						},
					},
				],
				exclude: /node_modules/,
			})),
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

const webpack = require("webpack");

// ts-loader doesn't seem to support multiple entry points, so we need to create
// multiple sets of rules for each entry point.
const entrypointSources = [
	{
		name: "index",
		path: __dirname + "/packages/main/src",
	},
	{
		name: "dom-test-evaluator",
		path: __dirname + "/packages/dom-evaluator/src",
	},
	{
		name: "javascript-test-evaluator",
		path: __dirname + "/packages/javascript-evaluator/src",
	},
	{
		name: "python-test-evaluator",
		path: __dirname + "/packages/python-evaluator/src",
	},
];

const sharedSources = [
	{
		name: "shared",
		path: __dirname + "/packages/shared/src",
	},
];

const allSources = [...entrypointSources, ...sharedSources];

const entry = entrypointSources.reduce(
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
			filename: "[name].js",
			// during testing, we need the files to be available for the test server:
			path: isDev ? __dirname + "/__fixtures__/dist" : __dirname + "/dist",
			clean: true,
		},
		module: {
			rules: allSources.map(({ name, path }) => ({
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
				timers: require.resolve("timers-browserify"),
			},
			extensions: [".ts", ".js"],
		},
		plugins: [
			new webpack.ProvidePlugin({
				process: "process/browser",
			}),
			// @sinon/fake-timers can use 'timers/promises' if it's available, but
			// 'timers-browserify' does not include it. This means webpack has to be
			// told to ignore it, otherwise it will throw an error when trying to
			// build.
			new webpack.IgnorePlugin({
				resourceRegExp: /timers\/promises/,
			}),
		],
	};
};

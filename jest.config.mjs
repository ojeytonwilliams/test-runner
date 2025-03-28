const jestConfig = {
	preset: "jest-puppeteer",
	globalSetup: "./jest-setup.mjs",
	testPathIgnorePatterns: ["/node_modules/", "packages/.*/build"],
};

export default jestConfig;

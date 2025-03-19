import "jest-puppeteer";
import "expect-puppeteer";

declare global {
	interface Window {
		FCCSandbox?: unknown;
	}
}

describe("Test Runner", () => {
	beforeAll(async () => {
		await page.goto("http://localhost:8080");
	});
	it("should add a FCCSandbox to the window object", async () => {
		const actual = await page.evaluate(() => {
			return window.FCCSandbox;
		});

		expect(actual).toBeDefined();
	});
});

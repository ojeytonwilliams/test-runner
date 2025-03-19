import "jest-puppeteer";
import "expect-puppeteer";

describe("Test Runner", () => {
	beforeAll(async () => {
		await page.goto("http://localhost:8080/__fixtures__/");
	});
	it("should add a FCCSandbox to the window object", async () => {
		const actual = await page.evaluate(() => {
			return window.FCCSandbox;
		});

		expect(actual).toBe("something");
	});
});

import "jest-puppeteer";
import "expect-puppeteer";

describe("Test Test", () => {
	beforeAll(async () => {
		await page.goto("http://localhost:8080");
	});
	it("should match expectations", async () => {
		await expect(page).toMatchTextContent("Hello World");
	});
});

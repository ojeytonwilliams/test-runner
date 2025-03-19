import "jest-puppeteer";
import "expect-puppeteer";

describe("Test Runner", () => {
	beforeAll(async () => {
		// served by webpack-dev-server
		await page.goto("http://localhost:8080/");
	});
	it("should add a FCCSandbox to the window object", async () => {
		const sandbox = await page.evaluate(() => {
			return window.FCCSandbox;
		});

		expect(sandbox).toMatchObject({});
	});

	describe("FCCSandbox", () => {
		describe("TestRunner", () => {
			beforeEach(async () => {
				// clear the page
				await page.evaluate(() => {
					document.body.innerHTML = "";
				});
			});

			it("should be instantiated by createTestRunner", async () => {
				const before = await page.$("iframe");
				await page.evaluate(() => {
					window.FCCSandbox.createTestRunner();
				});

				const after = await page.$("iframe");

				expect(before).toBeFalsy();
				expect(after).toBeTruthy();
			});

			it("should be disposable", async () => {
				page.evaluate(() => {
					window.FCCSandbox.createTestRunner();
				});

				const before = await page.$("iframe");
				await page.evaluate(() => {
					window.FCCSandbox.testRunner?.dispose();
				});

				const after = await page.$("iframe");

				expect(before).toBeTruthy();
				expect(after).toBeFalsy();
			});

			it("should remove existing iframe before creating a new one", async () => {
				await page.evaluate(() => {
					window.FCCSandbox.createTestRunner();
					window.FCCSandbox.createTestRunner();
				});

				const iframes = await page.$$("iframe");
				expect(iframes.length).toBe(1);
			});
		});
	});
});

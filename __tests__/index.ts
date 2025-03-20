import "jest-puppeteer";
import "expect-puppeteer";

describe("Test Runner", () => {
	beforeAll(async () => {
		await page.goto("http://localhost:8080/__fixtures__/");
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
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({ source: "" });
				});

				const after = await page.$("iframe");

				expect(before).toBeFalsy();
				expect(after).toBeTruthy();
			});

			it("should be disposable", async () => {
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({ source: "" });
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
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({ source: "" });
					await window.FCCSandbox.createTestRunner({ source: "" });
				});

				const iframes = await page.$$("iframe");
				expect(iframes.length).toBe(1);
			});

			it("should create a sandboxed iframe", async () => {
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({ source: "" });
				});

				const iframe = await page.$("iframe");
				const sandbox = await iframe?.evaluate((iframe) => {
					return iframe.getAttribute("sandbox");
				});

				expect(sandbox).toBe("allow-scripts");
			});

			it("should have an init method that prepares the runner and resolves when it is ready", async () => {
				const isReady = await page.evaluate(() => {
					const runner = new window.FCCSandbox.TestRunner({ source: "" });
					const isReady = runner.init();
					if (typeof isReady !== "object") {
						throw new Error("isReady is not a promise");
					}

					return isReady;
				});

				expect(isReady).toBe(undefined);
			});
		});
	});
});

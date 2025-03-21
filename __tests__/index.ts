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
					await window.FCCSandbox.createTestRunner({
						source: "",
						type: "frame",
					});
				});

				const after = await page.$("iframe");

				expect(before).toBeFalsy();
				expect(after).toBeTruthy();
			});

			it("should be disposable", async () => {
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({
						source: "",
						type: "frame",
					});
				});

				const before = await page.$("iframe");
				await page.evaluate(() => {
					window.FCCSandbox.testRunner?.dispose();
				});

				const after = await page.$("iframe");

				expect(before).toBeTruthy();
				expect(after).toBeFalsy();
			});

			it("should create a sandboxed iframe, when type is 'frame'", async () => {
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({
						source: "",
						type: "frame",
					});
				});

				const iframe = await page.$("iframe");
				const sandbox = await iframe?.evaluate((iframe) => {
					return iframe.getAttribute("sandbox");
				});

				expect(sandbox).toBe("allow-scripts");
			});

			it("should remove existing iframe before creating a new one", async () => {
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({
						source: "",
						type: "frame",
					});
					await window.FCCSandbox.createTestRunner({
						source: "",
						type: "frame",
					});
				});

				const iframes = await page.$$("iframe");
				expect(iframes.length).toBe(1);
			});

			it("should run tests against the sandboxed iframe", async () => {
				const source = "<body><h1>Hello World</h1></body>";
				const result = await page.evaluate(async (source) => {
					const runner = await window.FCCSandbox.createTestRunner({
						source,
						type: "frame",
					});
					return runner.runTest(
						"document.body.innerHTML.includes(`<h1>Hello World</h1>`)",
					);
				}, source);

				expect(result).toEqual({ pass: true });
			});

			it("should handle tests that throw errors", async () => {
				const result = await page.evaluate(async () => {
					const runner = await window.FCCSandbox.createTestRunner({
						source: "",
						type: "frame",
					});
					return runner.runTest("throw new Error('test error')");
				});

				expect(result).toEqual({
					message: "test error",
					stack: expect.stringMatching("Error: test error"),
				});
			});

			it('should not create a frame when type is "worker"', async () => {
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({
						source: "",
						type: "worker",
					});
				});

				const frame = await page.$("iframe");

				expect(frame).toBeFalsy();
			});

			it("should remove any existing iframes when creating a worker", async () => {
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({
						source: "",
						type: "frame",
					});
				});
				expect(await page.$("iframe")).toBeTruthy();

				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({
						source: "",
						type: "worker",
					});
				});
				expect(await page.$("iframe")).toBeFalsy();
			});

			it("should run tests against the worker", async () => {
				const source = "const getFive = () => 5;";
				const result = await page.evaluate(async (source) => {
					const runner = await window.FCCSandbox.createTestRunner({
						source,
						type: "worker",
					});
					return runner.runTest(
						"if(getFive() !== 5) { throw Error('getFive() should return 5') }",
					);
				}, source);

				expect(result).toEqual({ pass: true });
			});
		});

		describe("iframe evaluators", () => {
			it("should ignore messages that do not come from the parent window", async () => {
				const result = await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({
						source: "",
						type: "frame",
					});

					const otherFrame = document.createElement("iframe");
					// post a message from a different window
					otherFrame.srcdoc = `<script>let frame = window.parent.document.getElementById('test-frame').contentWindow.postMessage({ type: "test", value: "document.body.innerHTML.includes('<h1>Hello World</h1>')" }, "*");
						 </script>`;

					// wait for a message from otherFrame
					const awaitMessage = new Promise((resolve, reject) => {
						setTimeout(() => {
							resolve("done");
						}, 100);
						window.addEventListener("message", function handler() {
							reject(Error("Should not have received a message"));
						});
					});
					document.body.appendChild(otherFrame);

					return await awaitMessage;
				});

				expect(result).toBe("done");
			});
		});
	});
});

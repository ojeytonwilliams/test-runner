import "jest-puppeteer";
import "expect-puppeteer";

describe("Test Runner", () => {
	beforeAll(async () => {
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
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({
						source: "",
						type: "frame",
						code: {
							contents: "",
						},
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
						code: {
							contents: "",
						},
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
						code: {
							contents: "",
						},
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
						code: {
							contents: "",
						},
					});
					await window.FCCSandbox.createTestRunner({
						source: "",
						type: "frame",
						code: {
							contents: "",
						},
					});
				});

				const iframes = await page.$$("iframe");
				expect(iframes.length).toBe(1);
			});

			it("should handle tests that throw errors", async () => {
				const result = await page.evaluate(async () => {
					const runner = await window.FCCSandbox.createTestRunner({
						source: "",
						type: "frame",
						code: {
							contents: "",
						},
					});
					return runner.runTest("throw new Error('test error')");
				});

				expect(result).toEqual({
					err: {
						message: "test error",
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						stack: expect.stringMatching("Error: test error"),
					},
				});
			});

			it('should not create a frame when type is "worker"', async () => {
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({
						source: "",
						type: "worker",
						code: {
							contents: "",
						},
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
						code: {
							contents: "",
						},
					});
				});
				expect(await page.$("iframe")).toBeTruthy();

				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({
						source: "",
						type: "worker",
						code: {
							contents: "",
						},
					});
				});
				expect(await page.$("iframe")).toBeFalsy();
			});
		});

		describe("iframe evaluators", () => {
			it("should ignore messages that do not come from the parent window", async () => {
				const result = await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({
						source: "",
						type: "frame",
						code: {
							contents: "",
						},
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

			it("should run tests against the sandboxed iframe", async () => {
				const source = "<body><h1>Hello World</h1></body>";
				const result = await page.evaluate(async (source) => {
					const runner = await window.FCCSandbox.createTestRunner({
						source,
						type: "frame",
						code: {
							contents: "",
						},
					});
					return runner.runTest(
						"assert.include(document.body.innerHTML,`<h1>Hello World</h1>`)",
					);
				}, source);

				expect(result).toEqual({ pass: true });
			});

			it("should have access to variables defined in the iframe", async () => {
				const source =
					"<body><h1>Hello World</h1><script>const someGlobal = 'test'</script></body>";
				const result = await page.evaluate(async (source) => {
					const runner = await window.FCCSandbox.createTestRunner({
						source,
						type: "frame",
						code: {
							contents: "",
						},
					});
					return runner.runTest("assert.equal(someGlobal, 'tes')");
				}, source);

				expect(result).toEqual({
					err: {
						actual: "test",
						expected: "tes",
						message: "expected 'test' to equal 'tes'",
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						stack: expect.stringMatching(
							"AssertionError: expected 'test' to equal 'tes'",
						),
					},
				});
			});

			it("should have access to the original code when running tests", async () => {
				const source = "";
				const result = await page.evaluate(async (source) => {
					const runner = await window.FCCSandbox.createTestRunner({
						source,
						type: "frame",
						code: {
							contents: "// some code",
						},
					});
					return runner.runTest("assert.equal(code, '// some code');");
				}, source);

				expect(result).toEqual({ pass: true });
			});

			it("should run source scripts before running tests", async () => {
				const source = "<script>const getFive = () => 5;</script>";
				const result = await page.evaluate(async (source) => {
					const runner = await window.FCCSandbox.createTestRunner({
						source,
						type: "frame",
						code: {
							contents: "// some code",
						},
					});
					return runner.runTest("assert.equal(5, getFive());");
				}, source);

				expect(result).toEqual({ pass: true });
			});

			it("should handle unclosed tags in the source", async () => {
				const source = `<script> const getFive = () => 5; </script>;
<script> const getSix = () => 6`;
				const result = await page.evaluate(async (source) => {
					const runner = await window.FCCSandbox.createTestRunner({
						source,
						type: "frame",
						code: {
							contents: "// some code",
						},
					});
					return runner.runTest("assert.equal(5, getFive());");
				}, source);

				expect(result).toEqual({ pass: true });
			});

			it("should serialize error responses", async () => {
				const results = await page.evaluate(async () => {
					const runner = await window.FCCSandbox.createTestRunner({
						source: "",
						type: "frame",
						code: {
							contents: "",
						},
					});
					const resultOne = await runner.runTest(
						"assert.isNotEmpty(document.querySelectorAll('h1'))",
					);
					const resultTwo = await runner.runTest(
						"assert.notEqual(Symbol('foo'), 'something')",
					);
					return [resultOne, resultTwo];
				});

				expect(results[0]).toEqual({
					err: {
						actual: "{}",
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						stack: expect.stringMatching(
							"AssertionError: expected  not to be empty",
						),
						message: "expected  not to be empty",
					},
				});
				expect(results[1]).toEqual({
					pass: true,
				});
			});

			it("should allow tests to play audio", async () => {
				const source = `<body><audio id='audio' src='nothing.mp3'></audio></body>`;
				const result = await page.evaluate(async (source) => {
					const runner = await window.FCCSandbox.createTestRunner({
						source,
						type: "frame",
						code: {
							contents: "",
						},
					});
					return await runner.runTest(
						"document.getElementById('audio').play()",
					);
				}, source);

				// If it were unable to play, it would throw "play() failed because the
				// user didn't interact with the document first". The following error
				// only happens because it does try to play.
				expect(result).toEqual({
					err: { message: "The element has no supported sources." },
				});
			});

			it("should allow tests to access local storage", async () => {
				const source = `<body><h1>Hello World</h1></body>`;
				const result = await page.evaluate(async (source) => {
					const runner = await window.FCCSandbox.createTestRunner({
						source,
						type: "frame",
						code: {
							contents: "",
						},
					});
					return runner.runTest(
						"localStorage.setItem('test', 'value'); assert.equal(localStorage.getItem('test'), 'value');",
					);
				}, source);

				expect(result).toEqual({ pass: true });
			});

			it("should run the beforeAll function before evaluating the source", async () => {
				const result = await page.evaluate(async () => {
					const runner = await window.FCCSandbox.createTestRunner({
						source: "",
						type: "frame",
						code: {
							contents: "",
						},
						hooks: {
							beforeAll: "window.__before = 'and so it begins'",
						},
					});
					return runner.runTest(
						"assert.equal(window.__before,'and so it begins')",
					);
				});
				expect(result).toEqual({ pass: true });
			});
		});

		describe("worker evaluators", () => {
			it("should run tests after evaluating the source supplied to the runner", async () => {
				const source = "const getFive = () => 5;";
				const result = await page.evaluate(async (source) => {
					const runner = await window.FCCSandbox.createTestRunner({
						source,
						type: "worker",
						code: {
							contents: "// should not be evaluated",
						},
					});
					return runner.runTest(
						"if(getFive() !== 5) { throw Error('getFive() should return 5') }",
					);
				}, source);

				expect(result).toEqual({ pass: true });
			});

			it("should have access to the original code when running tests", async () => {
				const source = "const getFive = () => 5;";
				const result = await page.evaluate(async (source) => {
					const runner = await window.FCCSandbox.createTestRunner({
						source,
						type: "worker",
						code: {
							contents: "// some code",
						},
					});
					return runner.runTest("assert.equal(code, '// some code');");
				}, source);

				expect(result).toEqual({ pass: true });
			});
		});
	});
});

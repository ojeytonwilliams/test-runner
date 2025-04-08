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

			it("should be able to use Enzyme in tests", async () => {
				const source = `<script src='https://unpkg.com/react@16.4.0/umd/react.production.min.js' type='text/javascript'></script>
<script src='https://unpkg.com/react-dom@16.4.0/umd/react-dom.production.min.js' type='text/javascript'></script>
<script src='https://unpkg.com/react-dom@16.4.0/umd/react-dom-test-utils.production.min.js' type='text/javascript'></script>
<script src='https://unpkg.com/react-dom@16.4.0/umd/react-dom-server.browser.production.min.js' type='text/javascript'></script></head><body><div id='root'></div><div id='challenge-node'></div><script>"use strict";"use strict";

var JSX = /*#__PURE__*/React.createElement("h1", null, "Hello JSX!");"use strict";

ReactDOM.render(JSX, document.getElementById('root'));</script></body>`;

				const result = await page.evaluate(async (source) => {
					const runner = await window.FCCSandbox.createTestRunner({
						source,
						type: "frame",
						code: {
							contents: "",
						},
						loadEnzyme: true,
					});
					return runner.runTest(
						"assert(Enzyme.shallow(JSX).contains('Hello JSX!'));",
					);
				}, source);
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

		describe("python evaluator", () => {
			beforeAll(async () => {
				await page.evaluate(async () => {
					await window.FCCSandbox.createTestRunner({
						source: "",
						type: "python",
						code: {
							contents: "",
						},
					});
				});
			});
			it("should run tests after evaluating the source supplied to the runner", async () => {
				const source = `def get_five():
  return 5`;
				const result = await page.evaluate(async (source) => {
					const runner = window.FCCSandbox.testRunner;
					await runner?.init({
						code: {
							contents: "",
						},
						source,
					});
					return runner?.runTest(
						`({
test: () => assert.equal(runPython('get_five()'), 5),
						})`,
					);
				}, source);

				expect(result).toEqual({ pass: true });
			});

			it("should clear the source when init is called a second time", async () => {
				const source = `def get_five():
  return 5`;
				await page.evaluate(async (source) => {
					const runner = window.FCCSandbox.testRunner;
					await runner?.init({
						code: {
							contents: "",
						},
						source,
					});
				}, source);

				const result = await page.evaluate(async () => {
					const runner = window.FCCSandbox.testRunner;
					await runner?.init({
						code: {
							contents: "",
						},
						source: "",
					});
					return runner?.runTest(
						`({
test: () => assert.equal(runPython('get_five()'), 5),
						})`,
					);
				});

				expect(result).toEqual({
					err: {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						message: expect.stringContaining(
							"NameError: name 'get_five' is not defined",
						),
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						stack: expect.stringContaining(
							"NameError: name 'get_five' is not defined",
						),
					},
				});
			});

			it("should set __name__ to __main__ when running tests", async () => {
				const result = await page.evaluate(async () => {
					const runner = window.FCCSandbox.testRunner;
					await runner?.init({
						code: {
							contents: "",
						},
						source: "",
					});
					return runner?.runTest(
						`({
test: () => assert.equal(runPython('__name__'), '__main__'),
						})`,
					);
				});

				expect(result).toEqual({ pass: true });
			});

			it("should handle js-only tests", async () => {
				const result = await page.evaluate(async () => {
					const runner = window.FCCSandbox.testRunner;
					await runner?.init({
						code: {
							contents: "# wrong comment for test",
						},
						source: "",
					});
					return runner?.runTest(`assert.equal(code, "# comment for test")`);
				});
				expect(result).toEqual({
					err: {
						actual: "# wrong comment for test",
						expected: "# comment for test",
						message:
							"expected '# wrong comment for test' to equal '# comment for test'",
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						stack: expect.stringMatching(
							"AssertionError: expected '# wrong comment for test' to equal '# comment for test'",
						),
					},
				});
			});

			it("should reject testStrings that evaluate to an invalid object ", async () => {
				const result = await page.evaluate(async () => {
					const runner = window.FCCSandbox.testRunner;
					await runner?.init({
						code: {
							contents: "",
						},
						source: "",
					});
					return runner?.runTest(`({ invalid: 'test' })`);
				});

				expect(result).toEqual({
					err: {
						message:
							"Test string did not evaluate to an object with the 'test' property",
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						stack: expect.stringContaining(
							"Error: Test string did not evaluate to an object with the 'test' property",
						),
					},
				});
			});

			it("should be able to test with mock input", async () => {
				const result = await page.evaluate(async () => {
					const runner = window.FCCSandbox.testRunner;
					await runner?.init({
						code: {
							contents: "",
						},
						source: `
first = input()
second = input()
`,
					});
					return runner?.runTest(`({ 
	input: ["argle", "bargle"],
  test: () => assert.equal(runPython('first + second'), "arglebargle")
})`);
				});

				expect(result).toEqual({ pass: true });
			});

			it("should make user code available to the python code as the _code variable", async () => {
				const result = await page.evaluate(async () => {
					const runner = window.FCCSandbox.testRunner;
					await runner?.init({
						code: {
							contents: "test = 'value'",
						},
						source: "",
					});
					return runner?.runTest(`({ 
  test: () => assert.equal(runPython('_code'), "test = 'value'")
})`);
				});

				expect(result).toEqual({ pass: true });
			});

			it("should make the AST helper available to the python code as _Node", async () => {
				const result = await page.evaluate(async () => {
					const runner = window.FCCSandbox.testRunner;
					await runner?.init({
						code: {
							contents: "",
						},
						source: "",
					});
					return runner?.runTest(`({ 
  test: () => assert.equal(runPython('_Node("x = 1").get_variable("x")'), 1)
})`);
				});

				expect(result).toEqual({ pass: true });
			});
		});
	});
});

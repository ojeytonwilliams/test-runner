/* @jest-environment jsdom */

import { WorkerTestEvaluator } from "./worker-test-evaluator";

describe("WorkerTestEvaluator", () => {
	let messenger: WorkerTestEvaluator;

	beforeEach(async () => {
		messenger = new WorkerTestEvaluator();
		await messenger.init({ code: {}, source: "" });
		jest.spyOn(console, "error").mockImplementation(jest.fn());
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe("runTest", () => {
		it("should handle tests that end in a comment", async () => {
			const test = "// something that does not throw an error";

			const result = await messenger.runTest(test);

			expect(result).toStrictEqual({ pass: true });
		});

		it("should handle incorrect source that ends in a comment", async () => {
			await messenger.init({
				code: {},
				source: `
const x = 2;
// trailing comment`,
			});

			const test = "assert.equal(x, 1)";
			const result = await messenger.runTest(test);

			expect(result).toStrictEqual({
				err: {
					message: "expected 2 to equal 1",
					expected: 1,
					actual: 2,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					stack: expect.stringMatching("AssertionError: expected"),
				},
			});
		});

		it("should handle correct source that ends in a comment", async () => {
			await messenger.init({
				code: {},
				source: `
const x = 1;
// trailing comment`,
			});

			const test = "assert.equal(x, 1)";
			const result = await messenger.runTest(test);

			expect(result).toStrictEqual({ pass: true });
		});

		it("should handle a test that throws an error", async () => {
			const test = "throw new Error('test error')";

			const result = await messenger.runTest(test);

			expect(result).toStrictEqual({
				err: {
					message: "test error",
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					stack: expect.stringMatching("Error: test error"),
				},
			});
		});

		it("should handle a test that throws an error with expected and actual values", async () => {
			const test = "assert.equal('actual', 'expected')";

			const result = await messenger.runTest(test);

			expect(result).toStrictEqual({
				err: {
					message: "expected 'actual' to equal 'expected'",
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					stack: expect.stringMatching("AssertionError: expected"),
					expected: "expected",
					actual: "actual",
				},
			});
		});

		it("should use the init source when running a test", async () => {
			await messenger.init({ code: {}, source: "let x = 1" });

			const test = "assert.equal(x, 2)";
			const result = await messenger.runTest(test);

			expect(result).toStrictEqual({
				err: {
					message: "expected 1 to equal 2",
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					stack: expect.stringMatching("AssertionError: expected"),
					expected: 2,
					actual: 1,
				},
			});
		});

		it("should still run tests against code if the source throws", async () => {
			const source = "throw Error('expected')";
			await messenger.init({ code: { contents: source }, source });

			const test = `assert.equal(code, \`${source}\`)`;
			const result = await messenger.runTest(test);

			expect(result).toStrictEqual({ pass: true });
		});

		// This may not be doable, but it's worth investigating.
		it.todo("should handle user code that overwrites `code`");

		it("should be able to declare variables in the test that are already declared in the source", async () => {
			await messenger.init({ code: {}, source: "const x = 1; const y = 2;" });

			// if you naively eval the source + test, that would be
			//
			// `const x = 1; const y = 2; const x = 2; assert.equal(y, 2)`
			//
			// which would throw an error because you're redeclaring x
			const test = "const x = 2; assert.equal(y, 2)";
			const result = await messenger.runTest(test);

			expect(result).toStrictEqual({ pass: true });
		});

		// This is probably behavior we want, but it's not how the client works at
		// the moment.
		it.failing("should NOT handle async sources (yet)", async () => {
			await messenger.init({
				code: {},
				source: `let delay = () => new Promise((resolve) => setTimeout(resolve, 10));
let x = 1;
await delay();
x = 2;`,
			});
			const test = "assert.equal(x, 2)";
			const result = await messenger.runTest(test);
			expect(result).toStrictEqual({ pass: true });
		});

		it("should handle async tests", async () => {
			await messenger.init({
				code: {},
				source: "const x = 1;",
			});
			const test = `await new Promise((resolve) => setTimeout(resolve, 10));
assert.equal(x, 1)`;
			const result = await messenger.runTest(test);
			expect(result).toStrictEqual({ pass: true });
		});
	});
});

// We have to specify pyodide.js because we need to import that file (not .mjs)
// and 'import' defaults to .mjs
import { loadPyodide, type PyodideInterface } from "pyodide/pyodide.js";
import type { PyProxy, PythonError } from "pyodide/ffi";
import pkg from "pyodide/package.json";
import * as helpers from "@freecodecamp/curriculum-helpers";
import chai from "chai";
import {
	InitEvent,
	InitWorkerOptions,
	TestEvaluator,
	TestEvent,
} from "../../../types/test-evaluator";
import { ReadyEvent, ResultEvent } from "../../../types/test-runner";

type EvaluatedTeststring = {
	input?: string[];
	test: () => Promise<unknown>;
};

const READY_MESSAGE: ReadyEvent["data"] = { type: "ready" };

class PythonTestEvaluator implements TestEvaluator {
	#pyodide?: PyodideInterface;
	#runTest?: TestEvaluator["runTest"];
	async init(opts: InitWorkerOptions) {
		const pyodide = await this.#setupPyodide();
		this.#runTest = async (testString) => {
			const code = (opts.code.contents || "").slice();
			/* eslint-disable @typescript-eslint/no-unused-vars */
			const editableContents = (opts.code.editableContents || "").slice();

			const assert = chai.assert;
			const __helpers = helpers;

			// Create fresh globals for each test
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			const __userGlobals = pyodide.globals.get("dict")() as PyProxy;

			/* eslint-enable @typescript-eslint/no-unused-vars */

			try {
				// eval test string to get the dummy input and actual test
				const evaluatedTestString = await new Promise<unknown>(
					(resolve, reject) => {
						try {
							const test: unknown = eval(testString);
							resolve(test);
						} catch (err) {
							reject(err as Error);
						}
					},
				);

				// If the test string does not evaluate to an object, then we assume that
				// it's a standard JS test and any assertions have already passed.
				if (typeof evaluatedTestString !== "object") {
					return { pass: true };
				}

				if (!evaluatedTestString || !("test" in evaluatedTestString)) {
					throw Error(
						"Test string did not evaluate to an object with the 'test' property",
					);
				}

				const { input, test } = evaluatedTestString as EvaluatedTeststring;

				// Some tests rely on __name__ being set to __main__ and we new dicts do not
				// have this set by default.
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				__userGlobals.set("__name__", "__main__");

				// The runPython helper is a shortcut for running python code with our
				// custom globals.
				const runPython = (pyCode: string) =>
					pyodide.runPython(pyCode, { globals: __userGlobals }) as unknown;

				runPython(`
		def __inputGen(xs):
			def gen():
				for x in xs:
					yield x
			iter = gen()
			def input(arg=None):
				return next(iter)
		
			return input
		
		input = __inputGen(${JSON.stringify(input ?? [])})
		`);

				runPython(`from ast_helpers import Node as _Node`);

				// The tests need the user's code as a string, so we write it to the virtual
				// filesystem...
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
				pyodide.FS.writeFile("/user_code.py", code, { encoding: "utf8" });

				// ...and then read it back into a variable so that they can evaluate it.
				runPython(`
		with open("/user_code.py", "r") as f:
			_code = f.read()
		`);

				// Evaluates the learner's code so that any variables they define are
				// available to the test.
				runPython(opts.source);

				await test();

				return { pass: true };
			} catch (err) {
				if (!(err instanceof chai.AssertionError)) {
					console.error(err);
				}
				// to provide useful debugging information when debugging the tests, we
				// have to extract the message, stack and, if they exist, expected and
				// actual before returning
				return {
					err: {
						message: (err as Error).message,
						stack: (err as Error).stack,
						expected: (err as { expected?: string }).expected,
						actual: (err as { actual?: string }).actual,
						type: (err as PythonError).type,
					},
				};
			} finally {
				__userGlobals.destroy();
			}
		};
	}

	async #setupPyodide() {
		// loading pyodide is expensive, so we use the cached version if possible.
		if (this.#pyodide) return this.#pyodide;

		const pyodide = await loadPyodide({
			// TODO: host this ourselves
			indexURL: `https://cdn.jsdelivr.net/pyodide/v${pkg.version}/full/`,
		});
		this.#pyodide = pyodide;

		// We freeze this to prevent learners from getting the worker into a
		// weird state. NOTE: this has to come after pyodide is loaded, because
		// pyodide modifies self while loading.
		Object.freeze(self);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		pyodide.FS.writeFile(
			"/home/pyodide/ast_helpers.py",
			helpers.python.astHelpers,
			{
				encoding: "utf8",
			},
		);

		self.postMessage({ type: "contentLoaded" });

		return pyodide;
	}

	async runTest(test: string) {
		return await this.#runTest!(test);
	}

	async handleMessage(
		e: TestEvent | InitEvent<InitWorkerOptions>,
	): Promise<void> {
		if (e.data.type === "test") {
			const result = await this.#runTest!(e.data.value);
			const msg: ResultEvent["data"] = { type: "result", value: result };
			postMessage(msg);
		} else if (e.data.type === "init") {
			await this.init(e.data.value);
			postMessage(READY_MESSAGE);
		}
	}
}

const worker = new PythonTestEvaluator();

onmessage = function (e: TestEvent | InitEvent<InitWorkerOptions>) {
	void worker.handleMessage(e);
};

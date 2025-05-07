import { assert } from "chai";

import * as curriculumHelpers from "@freecodecamp/curriculum-helpers";

import type {
	TestEvaluator,
	Fail,
	InitEvent,
	TestEvent,
	InitWorkerOptions,
} from "../../../types/test-evaluator";
import type { ReadyEvent } from "../../../types/test-runner";
import { postCloneableMessage } from "../../shared/src/messages";

const READY_MESSAGE: ReadyEvent["data"] = { type: "ready" };
declare global {
	interface WorkerGlobalScope {
		assert: typeof assert;
		__helpers: typeof curriculumHelpers;
	}
}

// These have to be added to the global scope or they will get eliminated as dead
// code.
self.assert = assert;
self.__helpers = curriculumHelpers;

Object.freeze(self.__helpers);
Object.freeze(self.assert);

// The newline is important, because otherwise comments will cause the trailing
// `}` to be ignored, breaking the tests.
const wrapCode = (code: string) => `(async () => {${code};
})();`;

// TODO: currently this is almost identical to DOMTestEvaluator, can we make
// it more DRY? Don't attempt until they're both more fleshed out.
export class JavascriptTestEvaluator implements TestEvaluator {
	#runTest?: TestEvaluator["runTest"];
	init(opts: InitWorkerOptions) {
		this.#runTest = async (rawTest) => {
			const test = wrapCode(rawTest);
			// This can be reassigned by the eval inside the try block, so it should be declared as a let
			// eslint-disable-next-line prefer-const
			let __userCodeWasExecuted = false;
			try {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const code = opts.code?.contents ?? "";
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const editableContents = opts.code?.editableContents ?? "";
				try {
					await eval(`${opts.source};
__userCodeWasExecuted = true; 
${test};`);
				} catch (err) {
					if (__userCodeWasExecuted) {
						// rethrow error, since test failed.
						throw err;
					} else {
						// otherwise run the test against the code
						await eval(test);
					}
				}
				return { pass: true };
			} catch (e: unknown) {
				const error = e as Fail["err"];
				return {
					err: {
						message: error.message,
						stack: error.stack,
						...(!!error.expected && { expected: error.expected }),
						...(!!error.actual && { actual: error.actual }),
					},
				};
			}
		};
	}

	async runTest(test: string) {
		return await this.#runTest!(test);
	}

	async handleMessage(
		e: TestEvent | InitEvent<InitWorkerOptions>,
	): Promise<void> {
		if (e.data.type === "test") {
			const result = await this.#runTest!(e.data.value);
			const msg = { type: "result" as const, value: result };
			postCloneableMessage(postMessage, msg);
		} else if (e.data.type === "init") {
			this.init(e.data.value);
			postMessage(READY_MESSAGE);
		}
	}
}

const worker = new JavascriptTestEvaluator();

onmessage = function (e: TestEvent | InitEvent<InitWorkerOptions>) {
	void worker.handleMessage(e);
};

import { assert } from "chai";

import type {
	TestEvaluator,
	Fail,
	InitEvent,
	TestEvent,
} from "./test-evaluator";
declare global {
	interface DedicatedWorkerGlobalScope {
		assert: typeof assert;
	}
}

// For TS to know that this file is to be used in a worker (and only in a
// worker), we need to cast self.
const ctx = self as unknown as DedicatedWorkerGlobalScope;
// assert has to be added to the global scope or it will get eliminated as dead
// code.
ctx.assert = assert;

export interface InitWorkerOptions {
	code: {
		contents?: string;
		editableContents?: string;
	};
}

// TODO: currently this is almost identical to FrameTestEvaluator, can we make
// it more DRY? Don't attempt until they're both more fleshed out.
export class WorkerTestEvaluator implements TestEvaluator {
	#runTest?: TestEvaluator["runTest"];
	init(opts: InitWorkerOptions) {
		this.#runTest = async (test) => {
			try {
				await eval(`${opts.code.contents};${test}`);
				return { pass: true };
			} catch (e: unknown) {
				const error = e as Fail["err"];
				return {
					err: {
						message: error.message,
						stack: error.stack,
						...(error.expected && { expected: error.expected }),
						...(error.actual && { actual: error.actual }),
					},
				};
			}
		};
		// init will be async in the future, so I've made it a promise now.
		return Promise.resolve();
	}

	async runTest(test: string) {
		return await this.#runTest!(test);
	}

	async handleMessage(
		e: TestEvent | InitEvent<InitWorkerOptions>,
	): Promise<void> {
		if (e.data.type === "test") {
			const result = await this.#runTest!(e.data.value);
			postMessage({ type: "result", value: result });
		} else if (e.data.type === "init") {
			await this.init(e.data.value);
			postMessage({ type: "ready" });
		}
	}
}

const worker = new WorkerTestEvaluator();

ctx.onmessage = function (e: TestEvent | InitEvent<InitWorkerOptions>) {
	void worker.handleMessage(e);
};

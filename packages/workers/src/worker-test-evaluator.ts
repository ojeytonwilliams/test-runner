import { assert } from "chai";

import type {
	TestEvaluator,
	Fail,
	InitEvent,
	TestEvent,
	InitWorkerOptions,
} from "../../../types/test-evaluator";
import type { ResultEvent, ReadyEvent } from "../../../types/test-runner";

const READY_MESSAGE: ReadyEvent["data"] = { type: "ready" };
declare global {
	interface WorkerGlobalScope {
		assert: typeof assert;
	}
}

// assert has to be added to the global scope or it will get eliminated as dead
// code.
self.assert = assert;

// TODO: currently this is almost identical to FrameTestEvaluator, can we make
// it more DRY? Don't attempt until they're both more fleshed out.
export class WorkerTestEvaluator implements TestEvaluator {
	#runTest?: TestEvaluator["runTest"];
	init(opts: InitWorkerOptions) {
		this.#runTest = async (test) => {
			try {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const code = opts.code.contents;
				await eval(`${opts.source};${test}`);
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
			const msg: ResultEvent["data"] = { type: "result", value: result };
			postMessage(msg);
		} else if (e.data.type === "init") {
			await this.init(e.data.value);
			postMessage(READY_MESSAGE);
		}
	}
}

const worker = new WorkerTestEvaluator();

onmessage = function (e: TestEvent | InitEvent<InitWorkerOptions>) {
	void worker.handleMessage(e);
};

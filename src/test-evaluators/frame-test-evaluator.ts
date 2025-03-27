import jQuery from "jquery";
import * as helpers from "@freecodecamp/curriculum-helpers";

import type {
	TestEvaluator,
	Fail,
	TestEvent,
	InitEvent,
} from "./test-evaluator";

export interface InitTestFrameOptions {
	code: {
		contents?: string;
		editableContents?: string;
	};
	loadEnzyme?: boolean;
}

type FrameWindow = Window &
	typeof globalThis & {
		$: typeof jQuery;
	};

(window as FrameWindow).$ = jQuery;

export class FrameTestEvaluator implements TestEvaluator {
	#runTest?: TestEvaluator["runTest"];
	async init(opts: InitTestFrameOptions) {
		const codeObj = opts.code;

		/* eslint-disable @typescript-eslint/no-unused-vars */
		const code = (codeObj.contents || "").slice();

		const editableContents = (codeObj.editableContents || "").slice();
		// __testEditable allows test authors to run tests against a transitory dom
		// element built using only the code in the editable region.
		const __testEditable = (cb: () => () => unknown) => {
			const div = document.createElement("div");
			div.id = "editable-only";
			div.innerHTML = editableContents;
			document.body.appendChild(div);
			const out = cb();
			document.body.removeChild(div);
			return out;
		};

		/* eslint-disable @typescript-eslint/no-unused-vars */
		// Fake Deep Equal dependency
		const DeepEqual = (
			a: Record<string, unknown>,
			b: Record<string, unknown>,
		) => JSON.stringify(a) === JSON.stringify(b);

		// Hardcode Deep Freeze dependency
		const DeepFreeze = (o: Record<string, unknown>) => {
			Object.freeze(o);
			Object.getOwnPropertyNames(o).forEach(function (prop) {
				if (
					Object.prototype.hasOwnProperty.call(o, prop) &&
					o[prop] !== null &&
					(typeof o[prop] === "object" || typeof o[prop] === "function") &&
					!Object.isFrozen(o[prop])
				) {
					DeepFreeze(o[prop] as Record<string, unknown>);
				}
			});
			return o;
		};

		const { default: chai } = await import(
			/* webpackChunkName: "chai" */ "chai"
		);
		const assert = chai.assert;
		const __helpers = helpers;
		const __checkForBrowserExtensions = true;
		/* eslint-enable @typescript-eslint/no-unused-vars */

		let Enzyme;
		if (opts.loadEnzyme) {
			/* eslint-disable prefer-const */
			let Adapter16;

			[{ default: Enzyme }, { default: Adapter16 }] = await Promise.all([
				import(/* webpackChunkName: "enzyme" */ "enzyme"),
				import(
					/* webpackChunkName: "enzyme-adapter" */ "enzyme-adapter-react-16"
				),
			]);

			Enzyme.configure({ adapter: new Adapter16() });
			/* eslint-enable prefer-const */
		}

		this.#runTest = async function (
			testString: string,
		): Promise<Fail | { pass: true }> {
			// uncomment the following line to inspect
			// the frame-runner as it runs tests
			// make sure the dev tools console is open
			// debugger;
			try {
				// eval test string to actual JavaScript
				// This return can be a function
				// i.e. function() { assert(true, 'happy coding'); }
				const testPromise = new Promise((resolve, reject) =>
					// To avoid race conditions, we have to run the test in a final
					// document ready:
					$(() => {
						try {
							const test: unknown = eval(testString);
							resolve(test);
						} catch (err) {
							reject(err as Error);
						}
					}),
				);
				const test = await testPromise;
				if (typeof test === "function") {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call
					await test();
				}
				return { pass: true };
			} catch (err) {
				if (!(err instanceof chai.AssertionError)) {
					console.error(err);
				}

				const error = err as Fail["err"];
				// to provide useful debugging information when debugging the tests, we
				// have to extract the message, stack and, if they exist, expected and
				// actual before returning
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

		return Promise.resolve();
	}

	async runTest(test: string) {
		return await this.#runTest!(test);
	}

	async handleMessage(
		e: TestEvent | InitEvent<InitTestFrameOptions>,
	): Promise<void> {
		if (e.data.type === "test") {
			const result = await this.#runTest!(e.data.value);
			self.parent.postMessage({ type: "result", value: result }, "*");
		} else if (e.data.type === "init") {
			await this.init(e.data.value);
			self.parent.postMessage({ type: "ready" }, "*");
		}
	}
}

const messenger = new FrameTestEvaluator();

onmessage = function (e: TestEvent | InitEvent<InitTestFrameOptions>) {
	if (e.source !== self.parent) {
		return;
	}
	void messenger.handleMessage(e);
};

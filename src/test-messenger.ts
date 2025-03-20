import jQuery from "jquery";
import * as helpers from "@freecodecamp/curriculum-helpers";

interface InitTestFrameArg {
	code: {
		contents?: string;
		editableContents?: string;
		original?: { [id: string]: string | null };
	};
	getUserInput?: (fileName: string) => string;
	loadEnzyme?: () => void;
}
interface FrameDocument extends Document {
	__initTestFrame: (e: InitTestFrameArg) => Promise<void>;
	__runTest: (
		testString: string,
	) => Promise<
		{ pass: boolean } | { err: { message: string; stack?: string } }
	>;
}

type FrameWindow = Window &
	typeof globalThis & {
		$: typeof jQuery;
	};

(window as FrameWindow).$ = jQuery;

interface TestMesssage {
	type: "test";
	value: string;
}

interface InitMessage {
	type: "init";
	value: InitTestFrameArg;
}

const frameDocument = document as FrameDocument;

let runTest: (testString: string) => Promise<unknown>;

self.onmessage = async function (e: { data: TestMesssage | InitMessage }) {
	if (e.data.type === "test") {
		const test = e.data.value;
		const result = await runTest(test);

		self.parent.postMessage({ type: "result", value: result }, "*");
	} else if (e.data.type === "init") {
		const codeObj = e.data.value.code;

		const code = (codeObj.contents || "").slice();
		/* eslint-disable @typescript-eslint/no-unused-vars */
		const __file = (id?: string) => {
			if (id && codeObj.original) {
				return codeObj.original[id];
			} else {
				return codeObj;
			}
		};
		const editableContents = (codeObj.editableContents || "").slice();
		// __testEditable allows test authors to run tests against a transitory dom
		// element built using only the code in the editable region.
		const __testEditable = (cb: () => () => unknown) => {
			const div = frameDocument.createElement("div");
			div.id = "editable-only";
			div.innerHTML = editableContents;
			frameDocument.body.appendChild(div);
			const out = cb();
			frameDocument.body.removeChild(div);
			return out;
		};

		const getUserInput = e.data.value.getUserInput ?? (() => code);
		const loadEnzyme = e.data.value.loadEnzyme;

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
		if (loadEnzyme) {
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

		runTest = async function (testString: string) {
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
					// frameDocument ready:
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
					await test(getUserInput);
				}
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
					},
				};
			}
		};

		self.parent.postMessage({ type: "ready" }, "*");
	}
};

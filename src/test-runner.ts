import type { InitTestFrameOptions } from "./test-evaluators/frame-test-evaluator";
import type { InitWorkerOptions } from "./test-evaluators/worker-test-evaluator";

interface Runner {
	init(opts?: InitOptions): Promise<void>;
	runTest(test: string): Promise<unknown>;
	dispose(): void;
}

const getFullAssetPath = (assetPath = "/dist/") => {
	const isAbsolute = assetPath.startsWith("/");
	const hasTrailingSlash = assetPath.endsWith("/");
	if (!isAbsolute) {
		assetPath = "/" + assetPath;
	}
	if (!hasTrailingSlash) {
		assetPath += "/";
	}
	return assetPath;
};

type RunnerConfig = {
	source: string;
	assetPath?: string;
	script: string;
};

type InitOptions = {
	code: {
		contents?: string;
		editableContents?: string;
	};
};

export type ReadyEvent = MessageEvent<{ type: "ready" }>;
export type ResultEvent = MessageEvent<{ type: "result"; value: unknown }>;

export class FrameTestRunner implements Runner {
	#testEvaluator: HTMLIFrameElement;
	#createTestEvaluator({ source, assetPath, script }: RunnerConfig) {
		const iframe = document.createElement("iframe");
		iframe.sandbox.add("allow-scripts");
		// TODO: can we append the script via appendChild?
		const scriptUrl = getFullAssetPath(assetPath) + script;
		iframe.srcdoc = source + `<script src='${scriptUrl}'></script>`;
		iframe.id = "test-frame";

		return iframe;
	}

	constructor(config: RunnerConfig) {
		this.#testEvaluator = this.#createTestEvaluator(config);
	}

	// rather than trying to create an async constructor, we'll use an init method
	async init(opts: InitTestFrameOptions) {
		const isReady = new Promise((resolve) => {
			this.#testEvaluator.addEventListener("load", () => {
				resolve(true);
			});
		});

		document.body.appendChild(this.#testEvaluator);
		await isReady;

		const isInitialized = new Promise((resolve) => {
			window.addEventListener("message", (event: ReadyEvent) => {
				if (
					event.origin !== "null" ||
					event.source !== this.#testEvaluator.contentWindow
				) {
					return;
				}
				if (event.data.type === "ready") resolve(true);
			});
		});

		this.#testEvaluator.contentWindow?.postMessage(
			{
				type: "init",
				value: {
					code: opts?.code,
				},
			},
			"*",
		);

		await isInitialized;
	}

	runTest(test: string) {
		const result = new Promise((resolve) => {
			window.addEventListener("message", (event: ResultEvent) => {
				if (
					event.origin !== "null" ||
					event.source !== this.#testEvaluator.contentWindow
				) {
					return;
				}
				resolve(event.data.value);
			});
		});

		this.#testEvaluator.contentWindow?.postMessage(
			{ type: "test", value: test },
			"*",
		);

		return result;
	}

	dispose() {
		this.#testEvaluator.remove();
	}
}

export class WorkerTestRunner implements Runner {
	#testEvaluator: Worker;
	#source: string;
	#createTestEvaluator({ assetPath, script }: RunnerConfig) {
		const scriptUrl = getFullAssetPath(assetPath) + script;
		return new Worker(scriptUrl);
	}

	constructor(config: RunnerConfig) {
		this.#source = config.source;
		this.#testEvaluator = this.#createTestEvaluator(config);
	}

	async init(opts: InitWorkerOptions) {
		const isInitialized = new Promise((resolve) => {
			this.#testEvaluator.onmessage = (event: ReadyEvent) => {
				if (event.data.type === "ready") resolve(true);
			};
		});

		this.#testEvaluator.postMessage({ type: "init", value: opts });
		await isInitialized;
	}

	runTest(test: string) {
		const result = new Promise((resolve) => {
			// TODO: differentiate between messages
			this.#testEvaluator.onmessage = (event: ResultEvent) => {
				resolve(event.data.value);
			};
		});

		this.#testEvaluator.postMessage({
			type: "test",
			value: `${this.#source}; ${test}`,
		});

		return result;
	}

	dispose() {
		this.#testEvaluator.terminate();
	}
}

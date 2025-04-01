import type { ReadyEvent, ResultEvent } from "../../../types/test-runner";
import type {
	InitEvent,
	TestEvent,
	InitWorkerOptions,
	InitTestFrameOptions,
} from "../../../types/test-evaluator";

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
	assetPath?: string;
	script: string;
};

type InitOptions = {
	code: {
		contents?: string;
		editableContents?: string;
	};
};

export class FrameTestRunner implements Runner {
	#testEvaluator: HTMLIFrameElement;
	#script: string;
	#createTestEvaluator({ assetPath, script }: RunnerConfig) {
		const iframe = document.createElement("iframe");
		iframe.sandbox.add("allow-scripts");
		iframe.allow = "autoplay";
		iframe.id = "test-frame";

		// TODO: can we append the script via appendChild?
		const scriptUrl = getFullAssetPath(assetPath) + script;
		const scriptHTML = `<script src='${scriptUrl}'></script>`;

		return { iframe, scriptHTML };
	}

	constructor(config: RunnerConfig) {
		const { scriptHTML, iframe } = this.#createTestEvaluator(config);
		this.#testEvaluator = iframe;
		this.#script = scriptHTML;
	}

	// rather than trying to create an async constructor, we'll use an init method
	async init(opts: InitTestFrameOptions) {
		const isReady = new Promise((resolve) => {
			this.#testEvaluator.addEventListener("load", () => {
				resolve(true);
			});
		});

		// Note: the order matters a lot, because the source could include unclosed
		// tags. Putting the script first means the script will always be correctly
		// evaluated.
		this.#testEvaluator.srcdoc = `${this.#script} ${opts.source}`;

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

		const msg: InitEvent<InitTestFrameOptions>["data"] = {
			type: "init",
			value: opts,
		};
		this.#testEvaluator.contentWindow?.postMessage(msg, "*");

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

		const msg: TestEvent["data"] = { type: "test", value: test };
		this.#testEvaluator.contentWindow?.postMessage(msg, "*");

		return result;
	}

	dispose() {
		this.#testEvaluator.remove();
	}
}

export class WorkerTestRunner implements Runner {
	#testEvaluator: Worker;
	#createTestEvaluator({ assetPath, script }: RunnerConfig) {
		const scriptUrl = getFullAssetPath(assetPath) + script;
		return new Worker(scriptUrl);
	}

	constructor(config: RunnerConfig) {
		this.#testEvaluator = this.#createTestEvaluator(config);
	}

	async init(opts: InitWorkerOptions) {
		const isInitialized = new Promise((resolve) => {
			this.#testEvaluator.onmessage = (event: ReadyEvent) => {
				if (event.data.type === "ready") resolve(true);
			};
		});

		const msg: InitEvent<InitWorkerOptions>["data"] = {
			type: "init",
			value: opts,
		};
		this.#testEvaluator.postMessage(msg);
		await isInitialized;
	}

	runTest(test: string) {
		const result = new Promise((resolve) => {
			// TODO: differentiate between messages
			this.#testEvaluator.onmessage = (event: ResultEvent) => {
				resolve(event.data.value);
			};
		});

		const msg: TestEvent["data"] = {
			type: "test",
			value: test,
		};
		this.#testEvaluator.postMessage(msg);

		return result;
	}

	dispose() {
		this.#testEvaluator.terminate();
	}
}

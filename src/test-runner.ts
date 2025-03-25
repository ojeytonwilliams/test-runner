interface Runner {
	init(): Promise<void>;
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

export class FrameTestRunner implements Runner {
	#iframe: HTMLIFrameElement;
	#createTestFrame({
		source,
		assetPath,
		script,
	}: {
		source: string;
		assetPath?: string;
		script: string;
	}) {
		const iframe = document.createElement("iframe");
		iframe.sandbox.add("allow-scripts");
		// TODO: can we append the script via appendChild?
		const scriptUrl = getFullAssetPath(assetPath) + script;
		iframe.srcdoc = source + `<script src='${scriptUrl}'></script>`;
		iframe.id = "test-frame";

		return iframe;
	}

	constructor(config: RunnerConfig) {
		this.#iframe = this.#createTestFrame(config);
	}

	// rather than trying to create an async constructor, we'll use an init method
	async init() {
		const isReady = new Promise((resolve) => {
			this.#iframe.addEventListener("load", () => {
				resolve(true);
			});
		});

		document.body.appendChild(this.#iframe);
		await isReady;

		const isInitialized = new Promise((resolve) => {
			window.addEventListener("message", (event) => {
				if (
					event.origin !== "null" ||
					event.source !== this.#iframe.contentWindow
				) {
					return;
				}
				if (event.data.type === "ready") resolve(true);
			});
		});

		this.#iframe.contentWindow?.postMessage({ type: "init" }, "*");

		await isInitialized;
	}

	runTest(test: string) {
		const result = new Promise((resolve) => {
			window.addEventListener("message", (event) => {
				if (
					event.origin !== "null" ||
					event.source !== this.#iframe.contentWindow
				) {
					return;
				}
				resolve(event.data.value);
			});
		});

		this.#iframe.contentWindow?.postMessage({ type: "test", value: test }, "*");

		return result;
	}

	dispose() {
		this.#iframe.remove();
	}
}

export class WorkerTestRunner implements Runner {
	#worker: Worker;
	#source: string;
	#createTestWorker({ assetPath, script }: RunnerConfig) {
		const scriptUrl = getFullAssetPath(assetPath) + script;
		return new Worker(scriptUrl);
	}

	constructor(config: RunnerConfig) {
		this.#source = config.source;
		this.#worker = this.#createTestWorker(config);
	}

	async init() {
		const isInitialized = new Promise((resolve) => {
			this.#worker.onmessage = (event) => {
				if (event.data.type === "ready") resolve(true);
			};
		});

		this.#worker.postMessage({ type: "init" });
		await isInitialized;
	}

	runTest(test: string) {
		const result = new Promise((resolve) => {
			// TODO: differentiate between messages
			this.#worker.onmessage = (event) => {
				resolve(event.data.value);
			};
		});

		this.#worker.postMessage({
			type: "test",
			value: `${this.#source}; ${test}`,
		});

		return result;
	}

	dispose() {
		this.#worker.terminate();
	}
}

function createTestFrame({ source }: { source: string }) {
	const iframe = document.createElement("iframe");
	iframe.sandbox.add("allow-scripts");
	// TODO: can we append the script via appendChild?
	iframe.srcdoc =
		source + "<script src='../dist/frame-test-evaluator.mjs'></script>";
	iframe.id = "test-frame";

	return iframe;
}

interface Runner {
	init(): Promise<void>;
	runTest(test: string): Promise<unknown>;
	dispose(): void;
}

export class FrameTestRunner implements Runner {
	#iframe: HTMLIFrameElement;

	constructor({ source }: { source: string }) {
		this.#iframe = createTestFrame({ source });
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

	constructor({ source }: { source: string }) {
		this.#worker = new Worker("../dist/worker-test-evaluator.mjs");
		this.#source = source;
	}

	init() {
		return Promise.resolve();
	}

	runTest(test: string) {
		const result = new Promise((resolve) => {
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

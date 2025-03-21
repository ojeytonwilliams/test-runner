function createTestFrame({ source }: { source: string }) {
	const iframe = document.createElement("iframe");
	iframe.sandbox.add("allow-scripts");
	// TODO: can we append the script via appendChild?
	iframe.srcdoc = source + "<script src='../dist/test-messenger.mjs'></script>";
	iframe.id = "test-frame";

	return iframe;
}

export class TestRunner {
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

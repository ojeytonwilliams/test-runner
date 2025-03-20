function createTestFrame({ source }: { source: string }) {
	const iframe = document.createElement("iframe");
	iframe.sandbox.add("allow-scripts");
	iframe.srcdoc = source;

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

	dispose() {
		this.#iframe.remove();
	}
}

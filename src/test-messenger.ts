// This runs in an iframe and listens for messages from the parent window

self.onmessage = async function (e) {
	// ignore messages that do not come from the parent window
	if (e.source !== self.parent) {
		return;
	}

	if (e.data.type === "test") {
		const test = e.data.value;
		const result = await eval(test);

		self.parent.postMessage({ type: "result", value: result }, "*");
	}
};

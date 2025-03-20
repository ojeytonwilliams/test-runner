// This runs in an iframe and listens for messages from the parent window

self.onmessage = async function (e) {
	if (e.data.type === "test") {
		const test = e.data.value;
		const result = await eval(test);

		self.parent.postMessage({ type: "result", value: result }, "*");
	}
};

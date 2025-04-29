import type { Pass, Fail } from "../../../types/test-evaluator";

type Message = {
	type: "result";
	value: Pass | Fail;
};

export const postCloneableMessage = (
	postMessage: (msg: unknown) => void,
	msg: Message,
): void => {
	try {
		postMessage(msg);
	} catch {
		// If we're unable to post the message, it must be because at least one
		// of 'actual' or 'expected' is not transferable.
		const result = msg.value;
		if ("err" in result) {
			const rawActual = result.err?.actual;
			const rawExpected = result.err?.expected;

			const actual =
				typeof rawActual === "symbol"
					? rawActual.toString()
					: JSON.stringify(rawActual);
			const expected =
				typeof rawExpected === "symbol"
					? rawExpected.toString()
					: JSON.stringify(rawExpected);
			// one option is to always serialize, and that might be smarter, but
			// this allows us to write cleaner tests.
			const msgClone = {
				type: "result",
				value: {
					err: {
						...result.err,
						actual,
						expected,
					},
				},
			};
			postMessage(msgClone);
		}
	}
};

interface Pass {
	pass: true;
}

export interface Fail {
	err: {
		message: string;
		stack?: string;
		expected?: string;
		actual?: string;
	};
}

export type TestEvent = MessageEvent<{ type: "test"; value: string }>;
export type InitEvent<Data> = MessageEvent<{
	type: "init";
	value: Data;
}>;

export interface InitTestFrameOptions {
	code: {
		contents?: string;
		editableContents?: string;
	};
	loadEnzyme?: boolean;
	source: string;
	hooks?: {
		beforeAll?: string;
	};
}

export interface InitWorkerOptions {
	code: {
		contents?: string;
		editableContents?: string;
	};
	source: string;
}

export interface TestEvaluator {
	init(opts: unknown): Promise<void> | void;
	runTest(test: string): Promise<Pass | Fail>;
	handleMessage(e: MessageEvent): Promise<void>;
}

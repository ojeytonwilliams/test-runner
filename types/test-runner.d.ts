export type ReadyEvent = MessageEvent<{ type: "ready" }>;
export type ResultEvent = MessageEvent<{ type: "result"; value: unknown }>;

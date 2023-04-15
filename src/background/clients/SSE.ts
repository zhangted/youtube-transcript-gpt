import { ParseEvent, createParser } from "eventsource-parser";

async function* createAsyncIterableFromStream(
  stream: ReadableStream<Uint8Array> | null
): AsyncGenerator<Uint8Array> {
  if (stream === null) return;

  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) return;
      if (chunk !== undefined) {
        yield chunk;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export default async function subscribeToSSE(
  resourceURL: string,
  fetchOptions: RequestInit = {},
  onMessage: (msg: string) => void = () => {}
): Promise<void> {
  const response = await fetch(resourceURL, fetchOptions);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const errorMessage =
      error?.detail?.message ??
      (typeof error?.detail === "string" ? error.detail : undefined);
    if (errorMessage) {
      throw new Error(errorMessage);
    } else {
      throw new Error(`Error ${response.status}`);
    }
  }
  const parser = createParser((event: ParseEvent): void => {
    if (event.type === "event") {
      onMessage(event.data);
    }
  });
  for await (const chunk of createAsyncIterableFromStream(response.body)) {
    const chunkString = new TextDecoder().decode(chunk);
    parser.feed(chunkString);
  }
}

import { createParser } from 'eventsource-parser';

async function* createAsyncIterableFromStream(stream) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) return;
      yield chunk;
    }
  } finally {
    reader.releaseLock();
  }
}

export default async function subscribeToSSE(resourceURL, fetchOptions={}, onMessage=(msg)=>msg ) {
  const response = await fetch(resourceURL, fetchOptions);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if(response.status === 429) return await subscribeToSSE(resourceURL, fetchOptions, onMessage);
    throw new Error(error?.detail?.message??null??error?.detail??`Error ${response.status}`);
  }
  const parser = createParser((event) => {
    if (event.type === 'event') {
      onMessage(event.data);
    }
  });
  for await (const chunk of createAsyncIterableFromStream(response.body)) {
    const chunkString = new TextDecoder().decode(chunk);
    parser.feed(chunkString);
  }
}
import { v4 as uuidv4 } from "uuid";
import { subscribeToSSE, SSEError } from "./SSE";
import ExpiryMap from "expiry-map";
import { getOptionsHash, OptionsHash } from "../../options/options/OptionsHash";
import { getSummaryPrompt } from "../utils/getPrompt";
import { isVideoIdActive } from "../utils/activeVideoId";
import { isDuplicateReq, networkReq } from "../utils/activeNetworkReq";

const BASE_URL: string = "https://chat.openai.com";
const AUTH_ENDPOINT: string = `${BASE_URL}/api/auth/session`;
const CONVO_ENDPOINT: string = `${BASE_URL}/backend-api/conversation`;

async function getAccessToken(): Promise<string> {
  const resp = await fetch(AUTH_ENDPOINT);
  const exit = (): never => {
    throw new Error("Cannot get OpenAI access token");
  };
  if (!resp.ok) exit();
  const data: { accessToken?: string } = await resp.json().catch(() => ({}));
  return data?.accessToken ?? exit();
}

const ACCESS_TOKEN_KEY: string = "openai_api_key";
const expirymap = new ExpiryMap<string, string>(60 * 2 * 1000);

async function setupAccessToken(): Promise<string | undefined> {
  try {
    let token: string | undefined = expirymap.get(ACCESS_TOKEN_KEY);
    if (token === undefined) token = await getAccessToken();
    expirymap.set(ACCESS_TOKEN_KEY, token);
    return JSON.parse(JSON.stringify(token));
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

function getHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

let sseConnectionActive: boolean = false;
async function waitForSSEConnection() {
  while (sseConnectionActive) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export default async function askChatGPT(
  tabUUID: string,
  videoId: string,
  transcript: string,
  metadata: string,
  abortSignal: AbortSignal,
  streamingCallback = (gptResponse: string): void => {},
  handleInvalidCreds = (): void => {}
) {
  const token: string | undefined = await setupAccessToken();
  const handleInvalidCredsExt = () => {
    expirymap.clear();
    handleInvalidCreds();
  };
  if (token === undefined) return handleInvalidCredsExt();

  const onMessage = (message: string): void => {
    if (message === "[DONE]") {
      sseConnectionActive = false;
      networkReq.delete(tabUUID);
      return;
    }
    let data:
      | undefined
      | {
          message?: {
            author?: { role?: string };
            content?: { parts?: string[] };
          };
        };
    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error(err);
      console.log(message);
      return;
    }
    const fromAssistant = data?.message?.author?.role === "assistant";
    const text: string | undefined = data?.message?.content?.parts?.[0];
    // console.log(text, data)
    if (text && fromAssistant && isVideoIdActive(tabUUID, videoId))
      streamingCallback(text);
  };

  const extensionSettings: OptionsHash = await getOptionsHash();
  const { gpt_language, response_tokens } = extensionSettings;

  const prompt = getSummaryPrompt(
    transcript,
    response_tokens,
    gpt_language,
    metadata
  );

  // await logModels(token);
  if (isDuplicateReq(tabUUID, videoId)) return;
  await waitForSSEConnection();

  sseConnectionActive = true;
  networkReq.set(tabUUID, videoId);
  await subscribeToSSE(
    CONVO_ENDPOINT,
    {
      method: "POST",
      signal: abortSignal,
      headers: getHeaders(token),
      body: JSON.stringify({
        action: "next",
        messages: [
          {
            id: uuidv4(),
            role: "user",
            content: {
              content_type: "text",
              parts: [prompt],
            },
          },
        ],
        model: "text-davinci-002-render-sha",
        parent_message_id: uuidv4(),
        is_visible: false,
      }),
    },
    onMessage
  ).catch((err: Error | SSEError): void => {
    sseConnectionActive = false;
    networkReq.delete(tabUUID);
    if (err.name === "AbortError") throw err;
    console.error(err);
    const sseErr = err as SSEError;
    switch (sseErr?.status) {
      case 401:
        return handleInvalidCredsExt();
      case 413:
        throw err; //too many tokens
      case 429:
        throw err;
      case 500:
        throw err;
      default:
        return;
    }
  });
}

// Synchronous conversation (Non SSE fetch)
// function parseOkGptResponse(text) {
//   const answerArr = text.split('\n')
//   let answerObj = null;
//   let doneMarkerFound=false;
//   while(answerArr.length > 0 && answerObj === null) {
//     const cur = answerArr.pop()
//     if(cur === '') continue;
//     if(cur === 'data: [DONE]') {
//       doneMarkerFound=true;
//       continue;
//     }
//     if(doneMarkerFound) {
//       console.log(cur.slice(5))
//       answerObj = JSON.parse(cur.slice(5))
//     }
//   }
//   console.debug('answerObj', answerObj)
//   console.debug('chatGptResponse', answerObj.message.content.parts[0])
//   return {
//     gptResponse: answerObj.message.content.parts[0],
//     conversationId: answerObj.conversation_id
//   }
// }

// async function hideConversationInGptUI(conversationId, token) {
//   return await fetch(`${CONVO_ENDPOINT}/${conversationId}`, {
//     method: 'PATCH',
//     headers: getHeaders(token),
//     body: JSON.stringify({ is_visible: false })
//   })
// }

// async function logModels(token: string) {
//   return await fetch(`${BASE_URL}/backend-api/models`, { headers: getHeaders(token)})
//     .then(res => res.json()).then(console.log)
// }

import { v4 as uuidv4 } from "uuid";
import subscribeToSSE from "./SSE";
import ExpiryMap from "expiry-map";
import {
  YoutubeVideoInfo,
  getActiveTranscriptPart,
} from "../../content/YoutubeVideoInfo";
import { getOptionsHash, OptionsHash } from "../../options/Options";

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

export async function askChatGPT(
  youtubeVideoInfo: YoutubeVideoInfo,
  abortSignal: AbortSignal,
  sendToReactComponent = (gptResponse: string): void => {},
  handleInvalidCreds = (): void => {},
  handleServerError = (): void => {}
) {
  const token: string | undefined = await setupAccessToken();
  if (token === undefined) return handleInvalidCreds();

  const onMessage = (message: string): void => {
    if (message === "[DONE]") return;
    let data: undefined | { message?: { content?: { parts?: string[] } } };
    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error(err);
      return;
    }
    const text: string | undefined = data?.message?.content?.parts?.[0];
    if (text) sendToReactComponent(text);
  };

  const extensionSettings: OptionsHash = await getOptionsHash();
  const { gpt_language, response_tokens } = extensionSettings;

  const query = `You are an expert summarizer tasked with extracting only the most important details and condensing this YouTube transcript into a concise <=${response_tokens} ${gpt_language} tokens summary.
  Please provide ONLY a focused and deterministic summary with a temperature of 0.1.
  Please provide ONLY the <=${response_tokens} ${gpt_language} tokens summary in the response.
  Consider or discard the video's metadata (${
    youtubeVideoInfo.metaData
  }) while summarizing the transcript.
  Here is the transcript of a YouTube video that requires summarization within ${response_tokens} tokens: ${getActiveTranscriptPart(
    youtubeVideoInfo
  )}`;

  return await subscribeToSSE(
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
              parts: [query],
            },
          },
        ],
        model: "text-davinci-002-render-sha",
        parent_message_id: uuidv4(),
        is_visible: false,
      }),
    },
    onMessage
  ).catch((err: Error): void => {
    if (err.name === "AbortError") return;
    console.error(err);
    handleServerError();
    // sendToReactComponent(err.toString());
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

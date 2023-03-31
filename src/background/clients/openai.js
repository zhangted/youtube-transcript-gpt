import { v4 as uuidv4 } from 'uuid';
import subscribeToSSE from './SSE';
import ExpiryMap from 'expiry-map';

const BASE_URL = 'https://chat.openai.com'
const AUTH_ENDPOINT = `${BASE_URL}/api/auth/session`
const CONVO_ENDPOINT = `${BASE_URL}/backend-api/conversation`

async function getAccessToken() {
  const resp = await fetch(AUTH_ENDPOINT)
  const exit = () => { throw new Error('Cannot get OpenAI access token') };
  if (!resp.ok) exit()
  const data = await resp.json().catch(() => ({}))
  return data?.accessToken??exit()
}

const ACCESS_TOKEN_KEY = 'openai_api_key'
const expirymap = new ExpiryMap(60 * 2 * 1000)

async function setupAccessToken() {
  try {
    let token = expirymap.get(ACCESS_TOKEN_KEY);
    if(token === undefined) token = await getAccessToken()
    expirymap.set(ACCESS_TOKEN_KEY, token)
    return JSON.parse(JSON.stringify(token))
  } catch(e) {
    console.error(e)
    return false;
  }
}

function getHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export async function askChatGPT(transcript, abortSignal, sendToReactComponent = (responseText) => null, handleInvalidCreds = () => null) {
  const token = await setupAccessToken();
  if(token === false) return handleInvalidCreds();

  const onMessage = (message) => {
    if (message === '[DONE]') return;
    let data;
    try {
      data = JSON.parse(message)
    } catch (err) {
      console.error(err)
      return;
    }
    const text = data.message?.content?.parts?.[0]
    if(text) return sendToReactComponent(text);
  };

  const query = `Summarize this youtube transcript in 150 words or less (use people's names if needed but do not make assumptions): ${transcript}`;
  return await subscribeToSSE(CONVO_ENDPOINT, {
    method: 'POST',
    signal: abortSignal,
    headers: getHeaders(token),
    body: JSON.stringify({
      action: 'next',
      messages: [
        {
          id: uuidv4(),
          role: 'user',
          content: {
            content_type: 'text',
            parts: [query],
          },
        },
      ],
      model: 'text-davinci-002-render',
      parent_message_id: uuidv4(),
      is_visible: false,
    })
  }, onMessage)
    .catch(err => {
      if (err.name === "AbortError") return;
      sendToReactComponent(err.toString())
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
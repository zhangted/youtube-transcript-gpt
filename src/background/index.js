console.log('the bg script is running')

import Browser from 'webextension-polyfill';
import { v4 as uuidv4 } from 'uuid';

function getHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function hideConversationInGptUI(conversationId, token) {
  return await fetch(`https://chat.openai.com/backend-api/conversation/${conversationId}`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify({ is_visible: false })
  })
}

function parseOkGptResponse(text) {
  const answerArr = text.split('\n')
  let answerObj = null;
  let doneMarkerFound=false;
  while(answerArr.length > 0 && answerObj === null) {
    const cur = answerArr.pop()
    if(cur === '') continue;
    if(cur === 'data: [DONE]') {
      doneMarkerFound=true;
      continue;
    }
    if(doneMarkerFound) {
      console.log(cur.slice(5))
      answerObj = JSON.parse(cur.slice(5))
    }
  }
  console.log('answerObj', answerObj)
  console.log('chatGptResponse', answerObj.message.content.parts[0])
  return {
    gptResponse: answerObj.message.content.parts[0],
    conversationId: answerObj.conversation_id
  }
}

function parseBadResponse(errObj) {
  const { detail } = errObj;
  const { message, code } = detail; // TODO: do something with the err code
  return { gptResponse: message, conversationId: null };
}

async function askChatGPT(query, token) {
  // TODO: replace with SSE fetch
  return await fetch('https://chat.openai.com/backend-api/conversation', {
    method: 'POST',
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
    })}).then(async(res)=>{
      if(!res.ok) return parseBadResponse(await res.json()) // TODO: handle some edge cases here in more detail
      return parseOkGptResponse(await res.text())
    })
}

const lastGptResponse = { youtubeVideoId: '', gptResponse:null }

async function handleVideoTranscriptMsg(port, message) {
  const { transcript, youtubeVideoId, eventType } = message.data;

  if(eventType !== 'click' && youtubeVideoId === lastGptResponse.youtubeVideoId) {
    return port.postMessage({type:'GPT_RESPONSE', ...lastGptResponse })
  }

  const resp = await fetch('https://chat.openai.com/api/auth/session')
  if (resp.status === 403) throw new Error('CLOUDFLARE')
  const data = await resp.json().catch(() => ({}))
  const {accessToken} = data;

  const query = `summarize this youtube transcript in 150 words or less: ${transcript}.`;
  const {gptResponse, conversationId} = await askChatGPT(query, accessToken);
  if(conversationId !== null) hideConversationInGptUI(conversationId, accessToken)

  lastGptResponse.youtubeVideoId = youtubeVideoId;
  lastGptResponse.gptResponse = gptResponse;
  return port.postMessage({type:'GPT_RESPONSE', ...lastGptResponse })
}

Browser.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async(message) =>{
    console.log('Message received:', message);
    if(message.type === 'VIDEO_TRANSCRIPT') return await handleVideoTranscriptMsg(port, message);
    return port.postMessage({type: message.type})
  });
})

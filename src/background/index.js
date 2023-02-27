console.log('the bg script is running')

import Browser from 'webextension-polyfill';
import { v4 as uuidv4 } from 'uuid';

async function askChatGPT(query, openai_access_token) {
  const r = await fetch('https://chat.openai.com/backend-api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openai_access_token}`,
        },
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
        })}).then(res=>res.text())

  // TODO: replace with SSE fetch
  const answerArr = r.split('\n')
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
  return answerObj.message.content.parts[0]
}

// Listen for messages from the content script
Browser.runtime.onMessage.addListener(async(message, sender, sendResponse) =>{
  if (message.type === 'VIDEO_TRANSCRIPT') {
    console.log('Message received:', message);
    const { transcript } = message.data;
    console.log('transcript from content script', transcript)
    const resp = await fetch('https://chat.openai.com/api/auth/session')
    if (resp.status === 403) {
      throw new Error('CLOUDFLARE')
    }
    const data = await resp.json().catch(() => ({}))
    const {accessToken} = data;
    console.log('openai access token', accessToken)
    const query = `summarize this youtube transcript in 150 words or less: ${transcript}`;
    const gptResponse = await askChatGPT(query, accessToken);
    return gptResponse
  }
});

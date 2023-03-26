console.log('the bg script is running')

import Browser from 'webextension-polyfill';
import { askChatGPT } from './clients/openai';

let controller = new AbortController();

async function handleVideoTranscriptMsg(port, message) {
  const { transcript, youtubeVideoId } = message.data;
  controller.abort();
  controller = new AbortController();
  const sendToReactComponent = (gptResponse) => port.postMessage({ type: 'GPT_RESPONSE', youtubeVideoId, gptResponse})
  const handleInvalidCreds = () => port.postMessage({ type: 'NO_ACCESS_TOKEN' })

  await askChatGPT(transcript, controller.signal, sendToReactComponent, handleInvalidCreds);

  port.postMessage({ type: 'STREAMING_END' })
}

Browser.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async(message) => {
    console.log('Message received:', message);
    if(message.data === 'ping') return;
    if(message.type === 'VIDEO_TRANSCRIPT') return await handleVideoTranscriptMsg(port, message)
    return port.postMessage({type: message.type})
  });
})
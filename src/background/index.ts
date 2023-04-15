console.log("the bg script is running");

import Browser from "webextension-polyfill";
import { YoutubeVideoInfo } from "../content/YoutubeVideoInfo";
import {
  MessageFromContentScript,
  MESSAGE_TYPES,
  NoTranscriptMessage,
  YoutubeVideoInfoMessage,
} from "../utils/MessageTypes";
import { askChatGPT } from "./clients/openai";

let controller: AbortController = new AbortController();

async function handleVideoTranscriptMsg(
  port: Browser.Runtime.Port,
  message: YoutubeVideoInfoMessage
) {
  const youtubeVideoInfo: YoutubeVideoInfo = message.data;
  const { youtubeVideoId }: { youtubeVideoId: string } = youtubeVideoInfo;

  controller.abort();
  controller = new AbortController();

  const sendToReactComponent = (gptResponse: string): void =>
    port.postMessage({
      type: MESSAGE_TYPES.GPT_RESPONSE,
      youtubeVideoId,
      gptResponse,
    });
  const handleInvalidCreds = (): void =>
    port.postMessage({ type: MESSAGE_TYPES.NO_ACCESS_TOKEN });

  await askChatGPT(
    message.data,
    controller.signal,
    sendToReactComponent,
    handleInvalidCreds
  );

  port.postMessage({ type: MESSAGE_TYPES.SERVER_SENT_EVENTS_END });
}

Browser.runtime.onConnect.addListener((port: Browser.Runtime.Port) => {
  port.onMessage.addListener(
    async (message: MessageFromContentScript): Promise<void> => {
      console.log("Message received:", message);

      switch (message.type) {
        case MESSAGE_TYPES.VIDEO_TRANSCRIPT:
          const youtubeVideoInfoMsg = message as YoutubeVideoInfoMessage;
          await handleVideoTranscriptMsg(port, youtubeVideoInfoMsg);
          break;
        case MESSAGE_TYPES.NO_TRANSCRIPT:
          const noTranscriptMsg = message as NoTranscriptMessage;
          port.postMessage(noTranscriptMsg);
          break;
        default:
          console.warn(`Unsupported message type: ${message.type}`);
          break;
      }
    }
  );
});

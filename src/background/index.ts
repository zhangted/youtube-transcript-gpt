console.log("the bg script is running");

import Browser from "webextension-polyfill";
import { YoutubeVideoInfo } from "../content/YoutubeVideoInfo";
import {
  MessageFromContentScript,
  MESSAGE_TYPES,
  NoTranscriptMessage,
  YoutubeVideoInfoMessage,
  OpenOptionsPageMessage,
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
  const summaryTimeLimit = 30000;
  const id = setTimeout(() => controller.abort(), summaryTimeLimit);
  const cancelAbort = () => clearTimeout(id);

  const sendToReactComponent = (gptResponse: string): void =>
    port.postMessage({
      type: MESSAGE_TYPES.GPT_RESPONSE,
      youtubeVideoId,
      gptResponse,
    });
  const handleInvalidCreds = (): void =>
    port.postMessage({ type: MESSAGE_TYPES.NO_ACCESS_TOKEN });
  const handleServerError = (): void =>
    port.postMessage({ type: MESSAGE_TYPES.SERVER_ERROR_RESPONSE });

  await askChatGPT(
    message.data,
    controller.signal,
    sendToReactComponent,
    handleInvalidCreds,
    handleServerError,
  );
  cancelAbort();

  port.postMessage({ type: MESSAGE_TYPES.SERVER_SENT_EVENTS_END });
}

Browser.runtime.onConnect.addListener((port: Browser.Runtime.Port) => {
  port.onMessage.addListener(
    async (message: MessageFromContentScript): Promise<void> => {
      console.log("Message received:", message);

      switch (message.type) {
        case MESSAGE_TYPES.OPEN_OPTIONS_PAGE:
          const openOptionsPageMsg = message as OpenOptionsPageMessage;
          Browser.runtime.openOptionsPage();
          break;
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

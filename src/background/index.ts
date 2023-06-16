console.log("the bg script is running");

import Browser from "webextension-polyfill";
import {
  MessageFromContentScript,
  MESSAGE_TYPES,
  NoTranscriptMessage,
  YoutubeVideoInfoMessage,
  PingBgScriptActiveYoutubeVideoIdMessage,
} from "../utils/MessageTypes";
import { activeVideoIds } from "./utils/activeVideoId";
import summarize from "./utils/summarize";
import { setupOptions } from "../options/options/OptionsHash";

(async () => await setupOptions())();
let controller: AbortController = new AbortController();

Browser.runtime.onConnect.addListener((port: Browser.Runtime.Port) => {
  port.onMessage.addListener(
    async (message: MessageFromContentScript): Promise<void> => {
      console.log("Message received:", message);

      switch (message.type) {
        case MESSAGE_TYPES.VIDEO_TRANSCRIPT:
          const youtubeVideoInfoMsg = message as YoutubeVideoInfoMessage;
          await summarize(port, youtubeVideoInfoMsg, controller);
          break;
        case MESSAGE_TYPES.NO_TRANSCRIPT:
          const noTranscriptMsg = message as NoTranscriptMessage;
          port.postMessage(noTranscriptMsg);
          break;
        case MESSAGE_TYPES.PING_BG_SCRIPT_ABORT_REQ:
          controller.abort();
          port.postMessage({
            type: MESSAGE_TYPES.PING_CONTENT_SCRIPT_REQ_ABORTED,
          });
          controller = new AbortController();
          break;
        case MESSAGE_TYPES.PING_BG_SCRIPT_ACTIVE_YOUTUBE_VIDEO_ID:
          const activeVideoIdMsg =
            message as PingBgScriptActiveYoutubeVideoIdMessage;
          const { youtubeVideoId, tabUUID, reqResponse } = activeVideoIdMsg;
          activeVideoIds.set(tabUUID, youtubeVideoId);
          if (reqResponse)
            port.postMessage(
              youtubeVideoId
                ? {
                    type: MESSAGE_TYPES.PING_CONTENT_SCRIPT_FOR_TRANSCRIPT,
                  }
                : { type: MESSAGE_TYPES.NO_TRANSCRIPT }
            );
          break;
        default:
          console.warn(`Unsupported message type: ${message.type}`);
          break;
      }
    }
  );

  chrome.storage.onChanged.addListener((changes, area) => {
    // If summarization method setting is changed
    if (area === "sync" && changes.summarization_method) {
      const newValue = changes.summarization_method.newValue;
      port.postMessage({
        type: MESSAGE_TYPES.CHANGED_CHROME_EXT_SETTING,
        settingKey: "summarization_method",
        data: newValue,
      });
    }
  });
});

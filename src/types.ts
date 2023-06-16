import { YoutubeVideoInfo } from "./utils/YoutubeVideoInfo";
import { OptionsHashKey } from "./options/options/OptionsHash";

export const MESSAGE_TYPES = {
  VIDEO_TRANSCRIPT: "VIDEO_TRANSCRIPT",
  NO_TRANSCRIPT: "NO_TRANSCRIPT",
  NO_ACCESS_TOKEN: "NO_ACCESS_TOKEN",
  GPT_RESPONSE: "GPT_RESPONSE",
  LONG_TRANSCRIPT_SUMMARIZATION_STATUS: "LONG_TRANSCRIPT_SUMMARIZATION_STATUS",
  SERVER_SENT_EVENTS_END: "SERVER_SENT_EVENTS_END",
  SERVER_ERROR_RESPONSE: "SERVER_ERROR_RESPONSE",
  PING_BG_SCRIPT_ABORT_REQ: "PING_BG_SCRIPT_ABORT_REQ",
  PING_BG_SCRIPT_ACTIVE_YOUTUBE_VIDEO_ID:
    "PING_BG_SCRIPT_ACTIVE_YOUTUBE_VIDEO_ID",
  PING_CONTENT_SCRIPT_REQ_ABORTED: "PING_CONTENT_SCRIPT_REQ_ABORTED",
  PING_CONTENT_SCRIPT_FOR_TRANSCRIPT: "PING_CONTENT_SCRIPT_FOR_TRANSCRIPT",
  CHANGED_CHROME_EXT_SETTING: "CHANGED_CHROME_EXT_SETTING",
};

export interface YoutubeVideoInfoMessage {
  type: typeof MESSAGE_TYPES.VIDEO_TRANSCRIPT;
  data: YoutubeVideoInfo;
  tabUUID: string;
}

export interface NoTranscriptMessage {
  type: typeof MESSAGE_TYPES.NO_TRANSCRIPT;
}

export interface NoAccessTokenMessage {
  type: typeof MESSAGE_TYPES.NO_ACCESS_TOKEN;
}

export interface GptResponseMessage {
  type: typeof MESSAGE_TYPES.GPT_RESPONSE;
  youtubeVideoId: string;
  gptResponse: string;
}

export interface LongTranscriptSummarizationStatusMessage {
  type: typeof MESSAGE_TYPES.LONG_TRANSCRIPT_SUMMARIZATION_STATUS;
  youtubeVideoId: string;
  page: number;
}

export interface ServerSentEventsEndedMessage {
  type: typeof MESSAGE_TYPES.SERVER_SENT_EVENTS_END;
}

export interface ServerErrorResponseMessage {
  type: typeof MESSAGE_TYPES.SERVER_ERROR_RESPONSE;
}

export interface PingBgScriptAbortReqMessage {
  type: typeof MESSAGE_TYPES.PING_BG_SCRIPT_ABORT_REQ;
}

export interface PingBgScriptActiveYoutubeVideoIdMessage {
  // tell bg script about current youtube video id on a tab
  type: typeof MESSAGE_TYPES.PING_BG_SCRIPT_ACTIVE_YOUTUBE_VIDEO_ID;
  youtubeVideoId: string;
  tabUUID: string;
  reqResponse: boolean;
}

export interface PingContentScriptReqAbortedMessage {
  type: typeof MESSAGE_TYPES.PING_CONTENT_SCRIPT_REQ_ABORTED;
}

export interface PingContentScriptForTranscriptMessage {
  type: typeof MESSAGE_TYPES.PING_CONTENT_SCRIPT_FOR_TRANSCRIPT;
}

export interface ChangedChromeExtSettingMessage {
  type: typeof MESSAGE_TYPES.CHANGED_CHROME_EXT_SETTING;
  settingKey: OptionsHashKey;
  data: string;
}

export type MessageFromContentScript =
  | NoTranscriptMessage
  | YoutubeVideoInfoMessage
  | LongTranscriptSummarizationStatusMessage
  | ServerErrorResponseMessage
  | ChangedChromeExtSettingMessage
  | PingBgScriptActiveYoutubeVideoIdMessage;
export type MessageFromBgScript =
  | NoTranscriptMessage
  | YoutubeVideoInfoMessage
  | NoAccessTokenMessage
  | GptResponseMessage
  | ServerSentEventsEndedMessage
  | PingContentScriptForTranscriptMessage;

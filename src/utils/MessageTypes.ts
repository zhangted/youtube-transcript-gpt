import { YoutubeVideoInfo } from "../content/YoutubeVideoInfo";

export const MESSAGE_TYPES = {
  VIDEO_TRANSCRIPT: "VIDEO_TRANSCRIPT",
  NO_TRANSCRIPT: "NO_TRANSCRIPT",
  NO_ACCESS_TOKEN: "NO_ACCESS_TOKEN",
  GPT_RESPONSE: "GPT_RESPONSE",
  SERVER_SENT_EVENTS_END: "SERVER_SENT_EVENTS_END",
  OPEN_OPTIONS_PAGE: "OPEN_OPTIONS_PAGE",
  SERVER_ERROR_RESPONSE: "SERVER_ERROR_RESPONSE",
};

export interface YoutubeVideoInfoMessage {
  type: typeof MESSAGE_TYPES.VIDEO_TRANSCRIPT;
  data: YoutubeVideoInfo;
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

export interface ServerSentEventsEndedMessage {
  type: typeof MESSAGE_TYPES.SERVER_SENT_EVENTS_END;
}

export interface OpenOptionsPageMessage {
  type: typeof MESSAGE_TYPES.OPEN_OPTIONS_PAGE;
}

export interface ServerErrorResponseMessage {
  type: typeof MESSAGE_TYPES.SERVER_ERROR_RESPONSE;
}

export type MessageFromContentScript =
  | NoTranscriptMessage
  | YoutubeVideoInfoMessage
  | OpenOptionsPageMessage
  | ServerErrorResponseMessage;
export type MessageFromBgScript =
  | NoTranscriptMessage
  | YoutubeVideoInfoMessage
  | NoAccessTokenMessage
  | GptResponseMessage
  | ServerSentEventsEndedMessage;

import Browser from "webextension-polyfill";
import { YoutubeVideoInfo } from "../../utils/YoutubeVideoInfo";
import { getOptionsHash, OptionsHash } from "../../options/options/OptionsHash";
import {
  shouldSummAggr,
  shouldSummPagebyPage,
} from "../../options/options/SUMMARIZATION_METHOD";
import askChatGPT from "../clients/openai";
import { MESSAGE_TYPES, YoutubeVideoInfoMessage } from "../../types";
import { isVideoIdActive } from "./activeVideoId";
import {
  breakUpTextToChunks,
  getTokensUsed,
} from "../../utils/splitTokensMorePrecise";
import { getSummaryPrompt } from "./getPrompt";

export default async function summarize(
  port: Browser.Runtime.Port,
  message: YoutubeVideoInfoMessage,
  controller: AbortController
) {
  let abortAllReq: boolean = false;
  const {
    tabUUID,
    data: youtubeVideoInfo,
  }: { tabUUID: string; data: YoutubeVideoInfo } = message;
  const { youtubeVideoId }: { youtubeVideoId: string } = youtubeVideoInfo;

  if (!isVideoIdActive(tabUUID, youtubeVideoId)) return;

  const sendToReactComponent = (gptResponse: string): void =>
    port.postMessage({
      type: MESSAGE_TYPES.GPT_RESPONSE,
      youtubeVideoId,
      gptResponse,
    });
  const handleInvalidCreds = (): void =>
    port.postMessage({ type: MESSAGE_TYPES.NO_ACCESS_TOKEN });
  // const handleServerError = (): void =>
  //   port.postMessage({ type: MESSAGE_TYPES.SERVER_ERROR_RESPONSE });

  const extensionSettings: OptionsHash = await getOptionsHash();
  const { summarization_method, response_tokens } = extensionSettings;

  if (shouldSummPagebyPage(summarization_method)) {
    await askChatGPT(
      tabUUID,
      youtubeVideoId,
      youtubeVideoInfo.transcriptParts[youtubeVideoInfo.activeTranscriptPartId],
      youtubeVideoInfo.metaData,
      controller.signal,
      sendToReactComponent,
      handleInvalidCreds
    ).catch((err) => {
      if (err.name === "AbortError") abortAllReq = true;
    });
  } else if (shouldSummAggr(summarization_method)) {
    let aggrSummary: string = "";
    let promptLength = getTokensUsed(
      getSummaryPrompt("", 100, "English", youtubeVideoInfo.metaData)
    );
    let chunkSize = 8000;
    let fullTranscriptChunked: string[] = breakUpTextToChunks(
      youtubeVideoInfo.transcriptParts.join(""),
      chunkSize - promptLength,
      150
    );

    while (fullTranscriptChunked.length > 0) {
      console.log(fullTranscriptChunked);
      if (!isVideoIdActive(tabUUID, youtubeVideoId)) break;

      let curPart: string = fullTranscriptChunked.shift() as string;
      let isLastPage = fullTranscriptChunked.length === 0;

      if (!abortAllReq)
        port.postMessage({
          type: MESSAGE_TYPES.LONG_TRANSCRIPT_SUMMARIZATION_STATUS,
          page: fullTranscriptChunked.length + 1,
          youtubeVideoId,
        });
      console.log(
        `summarizing ${youtubeVideoId}`,
        `${fullTranscriptChunked.length + 1} pgs left`
      );

      await askChatGPT(
        tabUUID,
        youtubeVideoId,
        curPart,
        // combine any prev page gpt summary + current transcript part
        youtubeVideoInfo.metaData,
        controller.signal,
        isLastPage
          ? sendToReactComponent
          : (gptResponse) => (aggrSummary = gptResponse),
        // update aggregated summary to be response from gpt containing summ of prev + cur
        handleInvalidCreds
      ).catch((err) => {
        if (err.name === "AbortError") abortAllReq = true;
        fullTranscriptChunked.unshift(curPart);
        console.log(err)
        if (err?.status === 413) chunkSize -= chunkSize > 4000 ? 2000 : 0;
        if (err?.status === 429 || err?.status === 500) abortAllReq = true;
        isLastPage = false;
      });

      if (abortAllReq) {
        break;
      }

      if (isLastPage) break;
      fullTranscriptChunked = breakUpTextToChunks(
        aggrSummary + fullTranscriptChunked.join(""),
        chunkSize - promptLength,
        150
      );
    }
  }

  port.postMessage({ type: MESSAGE_TYPES.SERVER_SENT_EVENTS_END });
}

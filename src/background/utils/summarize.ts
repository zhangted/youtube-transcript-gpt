import Browser from "webextension-polyfill";
import { YoutubeVideoInfo } from "../../utils/YoutubeVideoInfo";
import { getOptionsHash, OptionsHash } from "../../options/options/OptionsHash";
import {
  shouldSummAggr,
  shouldSummPagebyPage,
} from "../../options/options/SUMMARIZATION_METHOD";
import askChatGPT from "../clients/openai";
import {
  MESSAGE_TYPES,
  YoutubeVideoInfoMessage,
} from "../../types";
import { isVideoIdActive } from "./activeVideoId";

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

  if (
    youtubeVideoInfo.transcriptParts.length === 1 ||
    shouldSummPagebyPage(summarization_method)
  ) {
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
    for (let i = 0; i < youtubeVideoInfo.transcriptParts.length; i++) {
      if (!isVideoIdActive(tabUUID, youtubeVideoId)) break;
      const transcriptPart = youtubeVideoInfo.transcriptParts[i];
      let curAggr = aggrSummary;
      let missedPages = [];
      let page = i + 1;
      let isLastPage = page === youtubeVideoInfo.transcriptParts.length;

      port.postMessage({
        type: MESSAGE_TYPES.LONG_TRANSCRIPT_SUMMARIZATION_STATUS,
        page,
        youtubeVideoId,
      });
      console.log(`summarizing ${youtubeVideoId} pg`, page);

      await askChatGPT(
        tabUUID,
        youtubeVideoId,
        aggrSummary + transcriptPart,
        // combine any prev page gpt summary + current transcript part
        youtubeVideoInfo.metaData,
        controller.signal,
        isLastPage
          ? sendToReactComponent
          : (gptResponse) => (aggrSummary = gptResponse),
        // update aggregated summary to be response from gpt containing summ of prev + cur
        handleInvalidCreds,
        isLastPage ? response_tokens : 0
      ).catch(async (err) => {
        if (err.name === "AbortError") abortAllReq = true;
        missedPages.push(page);
        aggrSummary = curAggr; // set aggr summary to the prev summ
        i--;
      });

      if (abortAllReq) break;
    }
  }

  port.postMessage({ type: MESSAGE_TYPES.SERVER_SENT_EVENTS_END });
}

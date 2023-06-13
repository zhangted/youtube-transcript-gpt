import Browser from "webextension-polyfill";
import { YoutubeVideoInfo } from "../../content/YoutubeVideoInfo";
import { getOptionsHash, OptionsHash } from "../../options/options/OptionsHash";
import { shouldSummAggr, shouldSummPagebyPage } from "../../options/options/SUMMARIZATION_METHOD";
import askChatGPT from "../clients/openai";
import {
  MESSAGE_TYPES,
  YoutubeVideoInfoMessage,
} from "../../utils/MessageTypes";
import { isVideoIdActive } from "./activeVideoId";

export default async function summarize(
  port: Browser.Runtime.Port,
  message: YoutubeVideoInfoMessage
) {
  let controller: AbortController = new AbortController();

  const youtubeVideoInfo: YoutubeVideoInfo = message.data;
  const { youtubeVideoId }: { youtubeVideoId: string } = youtubeVideoInfo;

  if(!isVideoIdActive(youtubeVideoId)) return;

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

  const extensionSettings: OptionsHash = await getOptionsHash();
  const { summarization_method, response_tokens } = extensionSettings;

  if(youtubeVideoInfo.transcriptParts.length === 1 || shouldSummPagebyPage(summarization_method)) {
    await askChatGPT(
      youtubeVideoId,
      youtubeVideoInfo.transcriptParts[youtubeVideoInfo.activeTranscriptPartId],
      youtubeVideoInfo.metaData,
      controller.signal,
      sendToReactComponent,
      handleInvalidCreds,
      handleServerError
    ).catch(()=>{})
  } else if(shouldSummAggr(summarization_method)) {
    let aggrSummary: string = '';
    for(let i = 0; i < youtubeVideoInfo.transcriptParts.length; i++) {
      if(!isVideoIdActive(youtubeVideoId)) break;
      const transcriptPart = youtubeVideoInfo.transcriptParts[i];
      let curAggr = aggrSummary;
      let missedPages = [];
      let page = i+1;
      let isLastPage = page === youtubeVideoInfo.transcriptParts.length;

      port.postMessage({
        type: MESSAGE_TYPES.LONG_TRANSCRIPT_SUMMARIZATION_STATUS,
        page,
        youtubeVideoId,
      })
      console.log(`summarizing ${youtubeVideoId} pg`, page)

      await askChatGPT(
        youtubeVideoId,
        aggrSummary + transcriptPart,
        // combine any prev page gpt summary + current transcript part
        youtubeVideoInfo.metaData,
        controller.signal,
        isLastPage ? sendToReactComponent : (gptResponse) => aggrSummary = gptResponse,
        // update aggregated summary to be response from gpt containing summ of prev + cur
        handleInvalidCreds,
        handleServerError,
        isLastPage ? response_tokens : 0,
      ).catch(async(err) => {
        missedPages.push(page);
        aggrSummary = curAggr // set aggr summary to the prev summ
        i--;
      })
    }
  }

  port.postMessage({ type: MESSAGE_TYPES.SERVER_SENT_EVENTS_END });
}
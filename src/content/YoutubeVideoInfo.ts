import Api from "youtube-browser-api";
import { MessageFromContentScript } from "../utils/MessageTypes";
import splitTextIntoSizeableTokenArrays from "../utils/splitTokens";

const videoInfoMap = new Map<string, YoutubeVideoInfo>();

export class YoutubeVideoInfo {
  constructor(
    public transcriptParts: string[] = [],
    public activeTranscriptPartId: number = 0,
    public youtubeVideoId: string = ""
  ) {}

  hasTranscript(): boolean {
    return this.transcriptParts.length > 0;
  }

  hasMultiPageTranscript(): boolean {
    return this.transcriptParts.length > 1;
  }

  hasNextPage(): boolean {
    return (
      this.hasMultiPageTranscript() &&
      this.activeTranscriptPartId < this.transcriptParts.length - 1
    );
  }

  hasPrevPage(): boolean {
    return this.hasMultiPageTranscript() && this.activeTranscriptPartId > 0;
  }

  nextPage(): void {
    if (this.hasNextPage()) this.activeTranscriptPartId++;
  }

  prevPage(): void {
    if (this.hasPrevPage()) this.activeTranscriptPartId--;
  }

  getPageIndicatorStr(): string {
    return this.hasMultiPageTranscript()
      ? `Page ${this.activeTranscriptPartId + 1} / ${
          this.transcriptParts.length
        }`
      : "";
  }

  getPostMessageObject(): MessageFromContentScript {
    return this.hasTranscript()
      ? {
          type: "VIDEO_TRANSCRIPT",
          data: this,
        }
      : { type: "NO_TRANSCRIPT" };
  }
}

export function getActiveTranscriptPart(
  youtubeVideoInfo: YoutubeVideoInfo
): string {
  return youtubeVideoInfo.transcriptParts[
    youtubeVideoInfo.activeTranscriptPartId
  ];
}

function parseTranscriptArrToString(
  transcriptAsObjectArr: { text: string }[]
): string {
  return transcriptAsObjectArr.map(({ text }) => text).join(" ");
}

export async function getYoutubeVideoInfo(
  youtubeVideoId: string
): Promise<YoutubeVideoInfo> {
  if (youtubeVideoId === "") return new YoutubeVideoInfo();

  const existingYoutubeVideoInfo = videoInfoMap.get(youtubeVideoId);
  if (existingYoutubeVideoInfo !== undefined) return existingYoutubeVideoInfo;

  const transcriptParts = await Api.transcript
    .GET({ query: { videoId: youtubeVideoId } })
    .Ok(({ body }: { body: object }): object => body)
    .then(({ body }: { body: object }): object => body)
    .then(({ videoId }: { videoId: object[] }): object[] => videoId)
    .then((transcriptAsObjectArr: { text: string }[]): string =>
      parseTranscriptArrToString(transcriptAsObjectArr)
    )
    .then((transcriptAsString: string): string[] =>
      splitTextIntoSizeableTokenArrays(transcriptAsString)
    )
    .catch((): string[] => []);
  const youtubeVideoInfo = new YoutubeVideoInfo(
    transcriptParts,
    0,
    youtubeVideoId
  );

  videoInfoMap.set(youtubeVideoId, youtubeVideoInfo);

  return youtubeVideoInfo;
}
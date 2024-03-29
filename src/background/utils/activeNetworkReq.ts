// what youtube video id in what tab is currently in a streaming fetch?

import { tabUUID, youtubeVideoId } from "./activeVideoId";

const networkReq = new Map<tabUUID, youtubeVideoId>();

function isDuplicateReq(tabUUID: string, videoId: string): boolean {
  return networkReq.get(tabUUID) === videoId;
}

export { networkReq, isDuplicateReq };

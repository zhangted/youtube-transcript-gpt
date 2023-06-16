// what is the youtube video id currently active on a tab?

export type tabUUID = string;
export type youtubeVideoId = string;

const activeVideoIds = new Map<tabUUID, youtubeVideoId>();

function isVideoIdActive(tabUUID: string, videoId: string): boolean {
  return activeVideoIds.get(tabUUID) === videoId;
}

export { activeVideoIds, isVideoIdActive };

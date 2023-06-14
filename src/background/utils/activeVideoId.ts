// this module will be accessed by diff modules in the bg script

type tabUUID = string;
type youtubeVideoId = string;

const activeVideoIds = new Map<tabUUID, youtubeVideoId>();

function isVideoIdActive(tabUUID: string, videoId: string): boolean {
  return activeVideoIds.get(tabUUID) === videoId;
}

export { activeVideoIds, isVideoIdActive };

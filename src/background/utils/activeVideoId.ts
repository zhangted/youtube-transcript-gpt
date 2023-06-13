// this module will be accessed by diff modules in the bg script

export class ActiveVideoId {
  constructor(
    public videoId: string = ''
  ) {}
}

const activeVideoId = new ActiveVideoId();

function isVideoIdActive(id: string): boolean {
  return activeVideoId.videoId === id;
}

export { activeVideoId, isVideoIdActive };
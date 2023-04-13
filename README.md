# youtube-transcript-gpt

> Get youtube summaries injected automatically if the video has a transcript!

![example-gif](./example.gif)

## Installing

1. Check if your `Node.js` version is >= **14**.
2. Run `npm install` to install the dependencies.

## Developing

```shell
$ npm run dev
```
## Packing
```shell
$ npm run build
```

### Chrome Extension Developer Mode

1. set your Chrome browser 'Developer mode' up
2. click 'Load unpacked', and select `youtube-transcript-gpt/build` folder

## TODO
- [x] handle errors in between request, parsing cycle (more granular error capturing + ui)
- [x] use streaming fetch (SSE) for better loading ui experience
- [~] how to deal with / chunk super long transcripts
- [ ] add option to use openai paid apis instead (alternative to chatgpt)
- [ ] convert to typescript
- [ ] add additional context into the query from the youtube page properties
- [x] limit spam req - cache last url of video transcript used to sent query to openai api
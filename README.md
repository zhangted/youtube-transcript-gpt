# youtube-transcript-gpt

> Get youtube summaries injected automatically if the video has a transcript!

![example-gif](./example.gif)

## Installing

1. Check if your `Node.js` version is >= **14**.
2. Change or configurate the name of your extension on `src/manifest`.
3. Run `npm install` to install the dependencies.

## Developing

```shell
$ npm run dev
```
## Packing
```shell
$ npm build
```

### Chrome Extension Developer Mode

1. set your Chrome browser 'Developer mode' up
2. click 'Load unpacked', and select `youtube-gpt-2/build` folder


## TODO
- [ ] handle errors in between request, parsing cycle (more granular error capturing + ui)
- [ ] use streaming fetch (SSE) for better loading ui experience
- [ ] add option to use openai paid apis instead (alternative to chatgpt)
- [ ] convert to typescript
- [ ] add additional context into the query from the youtube page properties
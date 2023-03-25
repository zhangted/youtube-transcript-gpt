import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  name: 'youtube-transcript-gpt',
  description: 'Get youtube summaries by chatgpt injected automatically if the video has a transcript! ',
  version: '0.0.1',
  manifest_version: 3,
  icons: {
    16: 'img/logo-16.png',
    32: 'img/logo-34.png',
    48: 'img/logo-48.png',
    128: 'img/logo-128.png',
  },
  // action: {
  //   default_popup: 'popup.html',
  //   default_icon: 'img/logo-48.png',
  // },
  // options_page: 'options.html',
  background: {
    service_worker: 'src/background/index.js',
    type: 'module',
  },
  content_scripts: [
    {
      "matches": [
        "https://www.youtube.com/*",
        "https://youtube.com/*"
      ],
      js: ['src/content/index.js'],
      runAt: "document_start",
    },
  ],
  web_accessible_resources: [
    {
      resources: ['img/logo-16.png', 'img/logo-34.png', 'img/logo-48.png', 'img/logo-128.png'],
      matches: [],
    },
  ],
  permissions: ["storage"],
  host_permissions: ["https://*.openai.com/"],
  "content_security_policy": {
    "extension_pages": "default-src 'self'; connect-src https://* data: blob: filesystem:;"
  }
})

import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  name: "Youtube Video Summary",
  author: "tedcbook@gmail.com",
  description:
    "Get youtube summaries by chatgpt injected automatically if the video has a transcript! ",
  version: "0.1.1",
  manifest_version: 3,
  icons: {
    16: "img/logo-16.png",
    32: "img/logo-34.png",
    48: "img/logo-48.png",
    128: "img/logo-128.png",
  },
  action: {
    default_popup: "src/options/index.html",
    // default_icon: 'img/logo-48.png',
  },
  options_ui: {
    page: "src/options/index.html",
  },
  permissions: ["storage"],
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["https://www.youtube.com/*", "https://youtube.com/*"],
      js: ["src/content/index.js"],
    },
  ],
  web_accessible_resources: [
    {
      resources: [
        "img/logo-16.png",
        "img/logo-34.png",
        "img/logo-48.png",
        "img/logo-128.png",
      ],
      matches: [],
    },
  ],
  host_permissions: ["https://*.openai.com/"],
  content_security_policy: {
    extension_pages:
      "default-src 'self'; connect-src https://* data: blob: filesystem:;",
  },
});

import { h, render } from "preact";
import { v4 as uuidv4 } from "uuid";
import SummaryBox from "./SummaryBox";

console.info("the content script is running");

let tabUUID: string = uuidv4();
let prevUrl: string | null = null;
let summaryBox: HTMLElement | null = null;

function waitForElm(selector: string) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver((mutations) => {
      if (document.querySelector(selector)) {
        resolve(document.querySelector(selector));
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

function updateSummaryWrapper() {
  waitForElm("#secondary.style-scope.ytd-watch-flexy").then(() => {
    summaryBox?.remove();
    summaryBox = document.createElement("div");
    summaryBox.id = "summary-wrapper";
    render(h(SummaryBox, { uuid: tabUUID }), summaryBox);
    document
      .querySelector("#secondary.style-scope.ytd-watch-flexy")
      ?.prepend(summaryBox);
  });
}

function tryUpdateSummaryWrapper() {
  if (prevUrl !== window.location.href) {
    prevUrl = window.location.href;
    updateSummaryWrapper();
  }
}

window.addEventListener("click", () => tryUpdateSummaryWrapper);

new MutationObserver(([{ type, attributeName }]) => {
  if (type === "attributes" && attributeName === "href")
    tryUpdateSummaryWrapper();
}).observe(document, {
  subtree: true,
  attributes: true,
  attributeFilter: ["href"],
});

waitForElm("#secondary").then(tryUpdateSummaryWrapper);

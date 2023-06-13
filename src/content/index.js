import { h, render } from 'preact';
import { v4 as uuidv4 } from "uuid";
import SummaryBox from './SummaryBox';

console.info('the content script is running');

let tabUUID = uuidv4();
let prevUrl = null;

function createPixel() {
  let pixel = document.createElement('div');
  pixel.style.width = "1px";
  pixel.style.height = "1px";
  return pixel;
}

function updateSummaryWrapper() {
  const injectPts = document.querySelectorAll('#secondary');
  for (const injectPt of injectPts) {
    injectPt.querySelector('#summary-wrapper')?.remove();

    let pixel = createPixel();
    injectPt.prepend(pixel)

    if (pixel.offsetWidth > 0) {
      const summaryWrapper = document.createElement('div');
      summaryWrapper.id = 'summary-wrapper';
      render(h(SummaryBox, { uuid: tabUUID }), summaryWrapper);
      injectPt.prepend(summaryWrapper);
    }

    pixel.remove();
  }
}

function tryUpdateSummaryWrapper() {
  if (prevUrl !== window.location.href) {
    prevUrl = window.location.href;
    setTimeout(updateSummaryWrapper, 500);
  }
}

(new MutationObserver(([{ type, attributeName }]) => {
  if(type === 'attributes' && attributeName === 'href') tryUpdateSummaryWrapper()
})).observe(
  document,
  { subtree: true, attributes: true, attributeFilter: ['href'] }
);

function waitForSecondary() {
  document.getElementById('secondary') ? 
    tryUpdateSummaryWrapper() : setTimeout(waitForSecondary, 100);
}

waitForSecondary();
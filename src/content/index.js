import { h, render } from 'preact';
import SummaryBox from './SummaryBox';

console.info('the content script is running');

const injectedDivs = new Set([]);

function onMutationYoutube(mutations, mutationInstance) {
  const injectPts = document.querySelectorAll('#secondary');
  if(injectPts.length == 0) return;
  const injectPt = injectPts[injectPts.length-1];
  if (injectPt && !injectedDivs.has(injectPt)) {
    const summaryWrapper = document.createElement('div');
    summaryWrapper.id = 'summary-wrapper';
    render(h(SummaryBox), summaryWrapper);
    injectPt.prepend(summaryWrapper);
    injectedDivs.add(injectPt);
  }
}

const observer = new MutationObserver(onMutationYoutube);
observer.observe(document, {
  childList: true,
  subtree:   true
});
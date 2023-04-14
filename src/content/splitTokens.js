function splitIntoSizeableTokensForPayload(arr) {
  const wordsIn100Tokens = 75;
  const wordsPerArrayWithSafetyNet = (wordsIn100Tokens - 20) * 38
  var result = [];
  for (var i = 0; i < arr.length; i += wordsPerArrayWithSafetyNet) {
    result.push(arr.slice(i, i + wordsPerArrayWithSafetyNet));
  }
  return result;
}

export default function splitTextIntoSizeableTokenArrays(text) {
  const wordsArray = text.split(' ')
  return splitIntoSizeableTokensForPayload(wordsArray).map((w) => w.join(' '))
}
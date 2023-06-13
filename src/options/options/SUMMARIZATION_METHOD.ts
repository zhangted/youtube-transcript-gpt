export const SUMMARIZATION_METHOD: string[] = [
  "Auto summarize whole transcript",
  "Manual page by page (More details)",
]

export const SUMMARIZATION_METHOD_DEFAULT: string = SUMMARIZATION_METHOD[0];

export const shouldSummPagebyPage = (method: string): boolean => method === SUMMARIZATION_METHOD[1]
export const shouldSummAggr = (method: string): boolean => method === SUMMARIZATION_METHOD[0]
/**
 * GapFinder AI - Deterministic Quote Gate Engine
 * 
 * "Code and Math make decisions; the local Ollama LLM only writes text."
 * 
 * Verifies that any quote cited by the LLM or quiz generator is an exact
 * (or whitespace-normalized) substring of the retrieved document chunk.
 * If the quote does not exist in the source material, the Quote Gate fails
 * and halts hallucination propagation.
 */

export interface QuoteVerificationResult {
  verified: boolean;
  chunkId: string;
  sourceDocTitle?: string;
  section?: string;
  matchOffset: number;
  matchLength: number;
  confidence: number; // 1.0 for exact, 0.95 for normalized whitespace, 0 for failed
  matchType: "exact" | "normalized_whitespace" | "rejected";
  quotedText: string;
  highlightedChunkSnippet?: string;
  rejectionReason?: string;
}

export function verifyQuoteInChunk(
  quote: string,
  chunkContent: string,
  chunkId: string,
  sourceDocTitle?: string,
  section?: string
): QuoteVerificationResult {
  if (!quote || quote.trim().length === 0) {
    return {
      verified: false,
      chunkId,
      sourceDocTitle,
      section,
      matchOffset: -1,
      matchLength: 0,
      confidence: 0,
      matchType: "rejected",
      quotedText: quote,
      rejectionReason: "Empty quote provided for verification.",
    };
  }

  const cleanQuote = quote.trim();
  const rawIndex = chunkContent.indexOf(cleanQuote);

  // 1. Check Exact Substring Match
  if (rawIndex !== -1) {
    const startSnippet = Math.max(0, rawIndex - 60);
    const endSnippet = Math.min(chunkContent.length, rawIndex + cleanQuote.length + 60);
    const snippet = chunkContent.substring(startSnippet, endSnippet);

    return {
      verified: true,
      chunkId,
      sourceDocTitle,
      section,
      matchOffset: rawIndex,
      matchLength: cleanQuote.length,
      confidence: 1.0,
      matchType: "exact",
      quotedText: cleanQuote,
      highlightedChunkSnippet: snippet,
    };
  }

  // 2. Check Whitespace-Normalized Substring Match (handles line breaks / tabs)
  const normalize = (str: string) => str.replace(/\s+/g, " ").trim();
  const normQuote = normalize(cleanQuote).toLowerCase();
  const normChunk = normalize(chunkContent).toLowerCase();

  const normIndex = normChunk.indexOf(normQuote);
  if (normIndex !== -1) {
    return {
      verified: true,
      chunkId,
      sourceDocTitle,
      section,
      matchOffset: normIndex,
      matchLength: normQuote.length,
      confidence: 0.95,
      matchType: "normalized_whitespace",
      quotedText: cleanQuote,
      highlightedChunkSnippet: chunkContent.slice(0, 160) + "...",
    };
  }

  // 3. Substring not found: DETERMINISTIC REJECTION
  return {
    verified: false,
    chunkId,
    sourceDocTitle,
    section,
    matchOffset: -1,
    matchLength: 0,
    confidence: 0,
    matchType: "rejected",
    quotedText: cleanQuote,
    rejectionReason: "DETERMINISTIC QUOTE GATE FAILED: The cited quotation does not exist verbatim in the source document chunk.",
  };
}

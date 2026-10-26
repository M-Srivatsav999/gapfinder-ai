/**
 * GapFinder AI - Local Hybrid RAG Search (BM25 + Local Cosine Similarity)
 * 
 * 100% Local, zero cloud dependencies. Runs entirely in TypeScript.
 */

export interface IndexedChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  sourceType: "notes" | "syllabus" | "past_paper";
  unitName: string;
  topicId: string;
  topicName: string;
  section: string;
  content: string;
  vector?: number[];
  tokenCount: number;
}

export interface SearchResult {
  chunk: IndexedChunk;
  bm25Score: number;
  cosineScore: number;
  hybridScore: number;
  snippet: string;
  exactQuote?: string;
}

/**
 * Deterministic semantic feature vector (64 dimensions)
 * Maps n-grams and vocabulary to dense features for local vector similarity.
 */
export function generateLocalEmbedding(text: string, dimensions: number = 64): number[] {
  const vec = new Array(dimensions).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

  if (words.length === 0) return vec;

  words.forEach((w) => {
    let hash = 0;
    for (let i = 0; i < w.length; i++) {
      hash = (hash << 5) - hash + w.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vec[idx] += 1;
  });

  // Normalize to unit vector for cosine distance
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vec[i] = vec[i] / norm;
    }
  }

  return vec;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1, dotProduct));
}

/**
 * Fast local BM25-style keyword matching
 */
export function bm25TermScore(queryTerms: string[], documentText: string): number {
  const docLower = documentText.toLowerCase();
  let score = 0;

  queryTerms.forEach((term) => {
    if (term.length < 2) return;
    const regex = new RegExp(`\\b${term}\\b`, "gi");
    const matches = docLower.match(regex);
    if (matches) {
      // Saturation function: count / (count + 1.2)
      const count = matches.length;
      score += (count * 2.2) / (count + 1.2);
    } else if (docLower.includes(term)) {
      score += 0.5; // partial substring match
    }
  });

  return score;
}

/**
 * Hybrid search combining BM25 keyword matching with Local Cosine Similarity
 */
export function hybridSearch(
  query: string,
  chunks: IndexedChunk[],
  topK: number = 4
): SearchResult[] {
  if (!chunks || chunks.length === 0) return [];

  const queryTerms = query.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const queryVec = generateLocalEmbedding(query, 64);

  const scored: SearchResult[] = chunks.map((chunk) => {
    const bm25 = bm25TermScore(queryTerms, chunk.content);
    const chunkVec = chunk.vector || generateLocalEmbedding(chunk.content, 64);
    const cosine = cosineSimilarity(queryVec, chunkVec);

    // Hybrid combination: 50% BM25, 50% Cosine
    // Normalize BM25 approximately into [0, 1]
    const normalizedBM25 = Math.min(1.0, bm25 / 5.0);
    const hybridScore = 0.5 * normalizedBM25 + 0.5 * cosine;

    // Generate high-relevance snippet
    const snippet = chunk.content.slice(0, 240) + "...";

    return {
      chunk,
      bm25Score: bm25,
      cosineScore: cosine,
      hybridScore,
      snippet,
    };
  });

  // Sort descending by hybrid score
  scored.sort((a, b) => b.hybridScore - a.hybridScore);

  return scored.slice(0, topK);
}

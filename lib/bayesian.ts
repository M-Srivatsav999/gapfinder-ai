/**
 * GapFinder AI - Bayesian Beta-Binomial Mastery Model
 * 
 * "Code and Math make decisions; the local Ollama LLM only writes text."
 * 
 * We model student mastery theta in [0, 1] as a Beta(alpha, beta) distribution.
 * Prior: alpha=1.0, beta=1.0 (Uniform prior, mean = 0.50)
 * Likelihood: Binomial(k successes, n trials)
 * Posterior: Beta(alpha + k, beta + (n - k))
 */

export interface BayesianMasteryState {
  alpha: number;
  beta: number;
  expectedMastery: number; // mean: alpha / (alpha + beta)
  variance: number;
  stdDev: number;
  confidenceLower: number; // ~95% credible interval lower bound
  confidenceUpper: number; // ~95% credible interval upper bound
  category: "weak" | "medium" | "strong" | "unassessed";
  totalAttempts: number;
}

export function calculateMastery(alpha: number, beta: number, totalAttempts: number = 0): BayesianMasteryState {
  const safeAlpha = Math.max(0.1, alpha);
  const safeBeta = Math.max(0.1, beta);
  const sum = safeAlpha + safeBeta;

  const expectedMastery = safeAlpha / sum;
  const variance = (safeAlpha * safeBeta) / (sum * sum * (sum + 1));
  const stdDev = Math.sqrt(variance);

  // Normal approximation to 95% Credible Interval (bounded [0, 1])
  const confidenceLower = Math.max(0, expectedMastery - 1.96 * stdDev);
  const confidenceUpper = Math.min(1, expectedMastery + 1.96 * stdDev);

  let category: "weak" | "medium" | "strong" | "unassessed" = "unassessed";
  
  if (totalAttempts === 0 && safeAlpha === 1 && safeBeta === 1) {
    category = "unassessed";
  } else if (expectedMastery < 0.50) {
    category = "weak";
  } else if (expectedMastery <= 0.75) {
    category = "medium";
  } else {
    category = "strong";
  }

  return {
    alpha: safeAlpha,
    beta: safeBeta,
    expectedMastery,
    variance,
    stdDev,
    confidenceLower,
    confidenceUpper,
    category,
    totalAttempts,
  };
}

export function updatePosterior(
  currentAlpha: number,
  currentBeta: number,
  isCorrect: boolean,
  questionWeight: number = 1.0
): { newAlpha: number; newBeta: number; mastery: BayesianMasteryState } {
  const newAlpha = isCorrect ? currentAlpha + questionWeight : currentAlpha;
  const newBeta = !isCorrect ? currentBeta + questionWeight : currentBeta;
  const totalAttempts = Math.round(newAlpha + newBeta - 2);

  const mastery = calculateMastery(newAlpha, newBeta, Math.max(1, totalAttempts));
  return { newAlpha, newBeta, mastery };
}

/**
 * Strictly Enforced Color Palette Styles
 */
export function getMasteryBadgeClass(category: "weak" | "medium" | "strong" | "unassessed"): string {
  switch (category) {
    case "weak":
      return "bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-glow-rose";
    case "medium":
      return "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-glow-amber";
    case "strong":
      return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-glow-emerald";
    case "unassessed":
    default:
      return "bg-slate-700/50 text-slate-400 border border-slate-600/30";
  }
}

export function getMasteryBorderClass(category: "weak" | "medium" | "strong" | "unassessed"): string {
  switch (category) {
    case "weak":
      return "border-rose-500/40 hover:border-rose-500/70";
    case "medium":
      return "border-amber-500/40 hover:border-amber-500/70";
    case "strong":
      return "border-emerald-500/40 hover:border-emerald-500/70";
    case "unassessed":
    default:
      return "border-slate-700 hover:border-slate-600";
  }
}

export function formatPercent(val: number): string {
  return `${Math.round(val * 100)}%`;
}

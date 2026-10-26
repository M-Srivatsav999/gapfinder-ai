/**
 * GapFinder AI - Deterministic Revision Schedule Engine
 * 
 * Strict 4-Step Diagnostic Lifecycle:
 * 
 * STEP 1: Baseline Reading Plan
 * When topics are unassessed (0 quiz attempts), order topics logically by
 * curriculum structure (Unit 1 -> Unit 2 -> Unit 3) with estimated reading minutes
 * based on text chunk lengths.
 * 
 * STEP 4: Real-Time Priority Recalculation
 * Once diagnosed via quiz, topics receive their mathematical priority:
 *   Priority = (1 - Mastery) * Exam Weight * Prerequisite Boost
 * Weak topics (<50%) and critical uncovered syllabus gaps automatically jump
 * to the top of the schedule.
 */

export interface TopicRevisionData {
  id: string;
  topicName: string;
  subtopicName: string;
  unitName: string;
  mastery: number; // in [0, 1]
  alpha: number;
  beta: number;
  examFrequency: number;
  examMarksAvg: number;
  prerequisiteIds: string[];
  isPrerequisiteFor?: string[];
  inNotes: boolean;
  syllabusRequired: boolean;
  totalAttempts?: number;
  chunkLengthMinutes?: number;
}

export type MaterialScope = "notes_only" | "notes_syllabus" | "full";

export interface RevisionScheduleItem {
  topicId: string;
  topicName: string;
  subtopicName: string;
  unitName: string;
  mastery: number;
  gapDeficit: number; // 1 - Mastery
  examWeight: number; // normalized
  prerequisiteBoost: number;
  priorityScore: number;
  recommendedMinutes: number;
  rationale: string;
  isUncovered: boolean;
  category: "weak" | "medium" | "strong" | "unassessed";
  rank: number;
  status?: string;
  isBaselinePlan: boolean;
}

export function calculateDeterministicRevisionSchedule(
  topics: TopicRevisionData[],
  scope: MaterialScope = "full"
): RevisionScheduleItem[] {
  // 1. Build Dependency Map
  const dependentCountMap: Record<string, string[]> = {};
  topics.forEach((t) => {
    t.prerequisiteIds.forEach((prereqId) => {
      if (!dependentCountMap[prereqId]) {
        dependentCountMap[prereqId] = [];
      }
      dependentCountMap[prereqId].push(t.id);
    });
  });

  // Check if any topics have been assessed
  const anyAssessed = topics.some(
    (t) => (t.totalAttempts && t.totalAttempts > 0) || t.alpha !== 1 || t.beta !== 1
  );

  // 2. Compute Raw Exam Weights based on scope
  const rawWeights: Record<string, number> = {};
  let maxRawWeight = 1.0;

  topics.forEach((t) => {
    if (scope === "notes_only") {
      rawWeights[t.id] = 1.0;
    } else if (scope === "notes_syllabus") {
      rawWeights[t.id] = t.syllabusRequired ? 1.5 : 1.0;
    } else {
      const score = Math.max(1, t.examFrequency * t.examMarksAvg);
      rawWeights[t.id] = score;
      if (score > maxRawWeight) maxRawWeight = score;
    }
  });

  // 3. Compute Schedule Items
  const results: RevisionScheduleItem[] = topics.map((t) => {
    const isTopicAssessed = (t.totalAttempts && t.totalAttempts > 0) || t.alpha !== 1 || t.beta !== 1;
    const gapDeficit = Math.max(0.05, 1.0 - t.mastery);

    // Normalized exam weight between 0.8 and 2.5
    let normalizedExamWeight = 1.0;
    if (scope === "full") {
      normalizedExamWeight = 0.8 + (rawWeights[t.id] / maxRawWeight) * 1.7;
    } else if (scope === "notes_syllabus") {
      normalizedExamWeight = rawWeights[t.id];
    }

    // Prerequisite Boost
    const downstreamTopicIds = dependentCountMap[t.id] || [];
    let prereqBoost = 1.0;

    if (downstreamTopicIds.length > 0) {
      let downstreamWeaknessSum = 0;
      downstreamTopicIds.forEach((downId) => {
        const downTopic = topics.find((dt) => dt.id === downId);
        if (downTopic) {
          downstreamWeaknessSum += Math.max(0, 1.0 - downTopic.mastery);
        }
      });
      prereqBoost = 1.0 + Math.min(0.7, 0.25 * downstreamWeaknessSum);
    }

    // Priority Formula: Priority = (1 - Mastery) * Exam Weight * Prerequisite Boost
    const priorityScore = gapDeficit * normalizedExamWeight * prereqBoost;

    // Time allocation
    const baseMinutes = t.chunkLengthMinutes || 25;
    const recommendedMinutes = isTopicAssessed
      ? Math.min(120, Math.round(20 + priorityScore * 35))
      : baseMinutes;

    const isUncovered = t.syllabusRequired && !t.inNotes;

    let category: "weak" | "medium" | "strong" | "unassessed" = "unassessed";
    if (!isTopicAssessed) {
      category = "unassessed";
    } else if (t.mastery < 0.5) {
      category = "weak";
    } else if (t.mastery <= 0.75) {
      category = "medium";
    } else {
      category = "strong";
    }

    // Rationale description
    let rationale = "";
    if (isUncovered) {
      rationale = "CRITICAL SYLLABUS GAP: Required on exam but completely absent from your uploaded notes!";
    } else if (!isTopicAssessed) {
      rationale = `Baseline Reading Step: Estimated ~${recommendedMinutes} min reading sequence. Diagnostic quiz pending.`;
    } else if (category === "weak") {
      rationale = `DIAGNOSED WEAK GAP (${Math.round(t.mastery * 100)}% mastery). Prioritized by formula: high gap × exam weight.`;
    } else if (downstreamTopicIds.length > 0 && prereqBoost > 1.1) {
      rationale = `Prerequisite Foundation for ${downstreamTopicIds.length} downstream topics. Prereq boost: ${prereqBoost.toFixed(2)}x.`;
    } else {
      rationale = `Reinforcement review (${Math.round(t.mastery * 100)}% mastery). Calibrated for retention.`;
    }

    return {
      topicId: t.id,
      topicName: t.topicName,
      subtopicName: t.subtopicName,
      unitName: t.unitName,
      mastery: t.mastery,
      gapDeficit,
      examWeight: normalizedExamWeight,
      prerequisiteBoost: prereqBoost,
      priorityScore,
      recommendedMinutes,
      rationale,
      isUncovered,
      category,
      rank: 0,
      isBaselinePlan: !isTopicAssessed,
    };
  });

  // Sort Schedule
  results.sort((a, b) => {
    // 1. Critical Uncovered Syllabus Gaps always lead
    if (a.isUncovered && !b.isUncovered) return -1;
    if (!a.isUncovered && b.isUncovered) return 1;

    // 2. Diagnosed Weak topics jump ahead of unassessed topics
    const aAssessed = a.category !== "unassessed";
    const bAssessed = b.category !== "unassessed";

    if (aAssessed && !bAssessed) {
      return a.category === "weak" ? -1 : 1;
    }
    if (!aAssessed && bAssessed) {
      return b.category === "weak" ? 1 : -1;
    }

    // If both assessed, sort descending by Priority Score
    if (aAssessed && bAssessed) {
      return b.priorityScore - a.priorityScore;
    }

    // Baseline Mode: Natural unit curriculum order
    return a.unitName.localeCompare(b.unitName) || a.topicName.localeCompare(b.topicName);
  });

  // Assign 1-indexed ranks
  results.forEach((item, index) => {
    item.rank = index + 1;
  });

  return results;
}

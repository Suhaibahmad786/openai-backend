export default async function selector(state) {
  const scores = state.scores;
  console.log(`[Node] selector — evaluating ${scores.length} scores`);

  if (scores.length === 0) {
    return { finalResult: { error: "No images were generated successfully" } };
  }

  scores.sort((a, b) => b.total - a.total);
  const best = scores[0];

  const bestImage = {
    url: best.url,
    score: best.total,
    breakdown: best.breakdown || { adherence: 0, aesthetics: 0, lighting: 0, creativity: 0 },
    reasoning: best.reasoning,
  };

  console.log(`[Node] selector — best score: ${best.total}/100 (attempt ${state.attemptCount})`);

  const shouldFinalize = best.total >= 85 || state.attemptCount >= 2;

  return {
    bestImage,
    finalResult: shouldFinalize
      ? {
          bestImageUrl: best.url,
          score: best.total,
          breakdown: best.breakdown,
          reasoning: best.reasoning,
          intent: state.intent,
          promptVariations: state.promptVariations,
          allCandidates: scores,
          iterations: state.attemptCount + 1,
        }
      : null,
  };
}

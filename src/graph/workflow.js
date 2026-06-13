import { StateGraph } from "@langchain/langgraph";
import { initialState } from "./state.js";
import intentAnalyzer from "./nodes/intentAnalyzer.js";
import promptExpander from "./nodes/promptExpander.js";
import imageGenerator from "./nodes/imageGenerator.js";
import visionJudge from "./nodes/visionJudge.js";
import selector from "./nodes/selector.js";
import critiqueLoop from "./nodes/critiqueLoop.js";

function routeAfterSelector(state) {
  if (state.finalResult) {
    console.log("[Workflow] ✅ Final result ready — ending");
    return "__end__";
  }
  console.log("[Workflow] 🔄 Score below threshold — starting critique loop");
  return "critique_loop";
}

function routeAfterCritique(state) {
  console.log("[Workflow] 🔄 Critique complete — regenerating image");
  return "image_generator";
}

const STEP_LABELS = {
  intent_analyzer: "Analyzing intent",
  prompt_expander: "Expanding prompts",
  image_generator: "Generating images",
  vision_judge: "Judging results",
  selector: "Selecting best",
  critique_loop: "Refining prompt",
};

export async function runWorkflow(userPrompt, callbacks = {}) {
  const workflow = new StateGraph({
    channels: {
      originalPrompt: { value: (a, b) => b ?? a, default: () => "" },
      intent: { value: (a, b) => b ?? a, default: () => null },
      promptVariations: { value: (a, b) => b ?? a, default: () => [] },
      generatedImages: { value: (a, b) => [...(a || []), ...(b || [])], default: () => [] },
      scores: { value: (a, b) => [...(a || []), ...(b || [])], default: () => [] },
      bestImage: { value: (a, b) => b ?? a, default: () => null },
      attemptCount: { value: (a, b) => b ?? a, default: () => 0 },
      finalResult: { value: (a, b) => b ?? a, default: () => null },
    },
  });

  const wrapNode = (name, nodeFn) => {
    return async (state) => {
      callbacks.onNodeStart?.(name, STEP_LABELS[name] || name);
      const result = await nodeFn(state);
      callbacks.onNodeEnd?.(name, STEP_LABELS[name] || name);
      return result;
    };
  };

  workflow.addNode("intent_analyzer", wrapNode("intent_analyzer", intentAnalyzer));
  workflow.addNode("prompt_expander", wrapNode("prompt_expander", promptExpander));
  workflow.addNode("image_generator", wrapNode("image_generator", imageGenerator));
  workflow.addNode("vision_judge", wrapNode("vision_judge", visionJudge));
  workflow.addNode("selector", wrapNode("selector", selector));
  workflow.addNode("critique_loop", wrapNode("critique_loop", critiqueLoop));

  workflow.setEntryPoint("intent_analyzer");
  workflow.addEdge("intent_analyzer", "prompt_expander");
  workflow.addEdge("prompt_expander", "image_generator");
  workflow.addEdge("image_generator", "vision_judge");
  workflow.addEdge("vision_judge", "selector");
  workflow.addConditionalEdges("selector", routeAfterSelector, {
    __end__: "__end__",
    critique_loop: "critique_loop",
  });
  workflow.addConditionalEdges("critique_loop", routeAfterCritique, {
    image_generator: "image_generator",
  });

  const compiled = workflow.compile();

  const initial = {
    ...initialState(),
    originalPrompt: userPrompt,
  };

  const result = await compiled.invoke(initial);
  return result.finalResult;
}

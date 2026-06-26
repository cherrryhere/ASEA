import { getGroqClient, groqConfig } from "../config/groq.js";

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);

    if (match) {
      return JSON.parse(match[0]);
    }

    throw new Error("Groq response was not valid JSON");
  }
}

export async function generateEngineeringPlan(command, knowledge) {
  const groq = getGroqClient();

  const prompt = `
You are ASEA, an Autonomous Software Engineering Agent.

Your job is to analyze a website inspection result and create a software engineering plan.

User Command:
${command}

Website Information:
${JSON.stringify(
    {
      websiteUrl: knowledge.websiteUrl,
      currentUrl: knowledge.currentUrl,
      pageTitle: knowledge.pageTitle,
      totalElements: knowledge.totalElements,
      elements: knowledge.elements
    },
    null,
    2
  )}

Return ONLY valid JSON in this exact structure:

{
  "goal": "",
  "summary": "",
  "detectedFunctionality": [],
  "executionSteps": [],
  "testCases": [
    {
      "title": "",
      "priority": "",
      "steps": [],
      "expectedResult": ""
    }
  ],
  "risks": [],
  "recommendations": []
}
`;

  const response = await groq.chat.completions.create({
    model: groqConfig.model,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: groqConfig.temperature
  });

  const planText = response.choices[0].message.content;

  return safeJsonParse(planText);
}
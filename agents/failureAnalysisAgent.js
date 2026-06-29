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

function reduceFailedTests(executionData) {
  if (!executionData || !Array.isArray(executionData.testResults)) {
    return [];
  }

  return executionData.testResults
    .filter((test) => test.status !== "passed")
    .map((test) => ({
      suite: test.suite || "",
      testTitle: test.testTitle || "",
      status: test.status || "",
      duration: test.duration || 0,
      errorMessage: test.errorMessage || "",
      errorStack: String(test.errorStack || "").slice(0, 3000)
    }));
}

export async function analyzeTestFailures(executionData) {
  const failedTests = reduceFailedTests(executionData);

  if (failedTests.length === 0) {
    return {
      totalFailedTests: 0,
      overallSummary: "All generated tests passed. No failure analysis required.",
      failures: [],
      recommendations: [
        "Continue monitoring the generated tests with more pages and scenarios.",
        "Add more functional and negative test cases for deeper validation."
      ],
      analyzedAt: new Date().toISOString()
    };
  }

  const groq = getGroqClient();

  const prompt = `
You are ASEA, an Autonomous QA Failure Analysis Agent.

Your job is to analyze failed Playwright test results and explain why they failed.

Think like a senior QA automation engineer.

Execution Summary:
${JSON.stringify(executionData.summary, null, 2)}

Failed Tests:
${JSON.stringify(failedTests, null, 2)}

Return ONLY valid JSON in this exact structure:

{
  "totalFailedTests": 0,
  "overallSummary": "",
  "failures": [
    {
      "testTitle": "",
      "status": "",
      "failureType": "",
      "rootCause": "",
      "technicalReason": "",
      "suggestedFix": "",
      "isApplicationBug": false,
      "isTestScriptIssue": true,
      "priority": ""
    }
  ],
  "recommendations": [],
  "analyzedAt": ""
}

Rules:
- failureType should be one of: "Selector Issue", "Assertion Issue", "Application Bug", "Timing Issue", "Generated Test Issue", "Environment Issue", "Unknown"
- priority should be one of: "Critical", "High", "Medium", "Low"
- Be practical and specific.
- If selector is wrong, suggest a better Playwright locator strategy.
- If the test expected incorrect content, say it is a generated test issue.
- Do not include markdown.
- Do not include explanations outside JSON.
`;

  const response = await groq.chat.completions.create({
    model: groqConfig.model,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.2
  });

  const content = response.choices[0].message.content;
  const parsed = safeJsonParse(content);

  return {
    totalFailedTests: parsed.totalFailedTests || failedTests.length,
    overallSummary:
      parsed.overallSummary ||
      "Failure analysis completed for generated Playwright tests.",
    failures: Array.isArray(parsed.failures) ? parsed.failures : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations
      : [],
    analyzedAt: parsed.analyzedAt || new Date().toISOString()
  };
}
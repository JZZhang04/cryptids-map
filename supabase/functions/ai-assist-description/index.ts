const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AssistRequest = {
  name?: string;
  location?: string;
  category?: string;
  existingDescription?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function classifyOpenAiError(details: string) {
  const lowered = details.toLowerCase();

  if (lowered.includes("invalid_api_key") || lowered.includes("incorrect api key")) {
    return "OpenAI rejected the API key. Check OPENAI_API_KEY in Supabase secrets.";
  }

  if (lowered.includes("insufficient_quota") || lowered.includes("quota")) {
    return "OpenAI quota is unavailable or exhausted for this API key.";
  }

  if (lowered.includes("model_not_found") || lowered.includes("does not exist")) {
    return "The configured OpenAI model is unavailable. Try gpt-4.1-mini or gpt-4.1-nano.";
  }

  if (lowered.includes("organization")) {
    return "OpenAI rejected the request because of an organization or project configuration issue.";
  }

  return "OpenAI request failed.";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
  const openAiModel = Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini";

  if (!openAiApiKey) {
    return jsonResponse(
      { error: "OPENAI_API_KEY is not configured in Supabase Edge Function secrets." },
      500
    );
  }

  let payload: AssistRequest;
  try {
    payload = (await request.json()) as AssistRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const name = payload.name?.trim() ?? "";
  const location = payload.location?.trim() || "Unknown";
  const category = payload.category?.trim() || "Unknown";
  const existingDescription = payload.existingDescription?.trim() ?? "";

  if (!name) {
    return jsonResponse({ error: "Creature name is required." }, 400);
  }

  const prompt = [
    "Write a concise, engaging cryptid field-guide description in English.",
    "Use 2 to 4 sentences.",
    "Treat the subject as folklore, eyewitness tradition, or local legend rather than scientific fact.",
    "Acknowledge uncertainty naturally without sounding dismissive.",
    "Avoid sensationalism, fake citations, bullet points, and markdown.",
    "If the creature may be fictional, folkloric, misidentified, or embellished over time, reflect that gently.",
    "",
    `Creature name: ${name}`,
    `Location: ${location}`,
    `Category: ${category}`,
    existingDescription ? `User notes: ${existingDescription}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  let openAiResponse: Response;
  try {
    openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openAiModel,
        input: prompt,
        instructions:
          "You are helping write polished field-guide descriptions for a cryptid map product.",
        max_output_tokens: 220,
        text: {
          format: {
            type: "json_schema",
            name: "cryptid_description_suggestion",
            strict: true,
            schema: {
              type: "object",
              properties: {
                description: {
                  type: "string",
                  description:
                    "A polished 2 to 4 sentence field-guide style description in English.",
                },
                guidance: {
                  type: "string",
                  description:
                    "A short one-sentence note reminding the user to review the AI-assisted draft.",
                },
              },
              required: ["description", "guidance"],
              additionalProperties: false,
            },
          },
        },
      }),
    });
  } catch (fetchError) {
    const fetchMessage =
      fetchError instanceof Error ? fetchError.message : "Unknown network error.";
    console.error("OpenAI fetch threw before a response was returned.", fetchMessage);
    return jsonResponse(
      {
        error: "OpenAI request could not be sent.",
        details: fetchMessage,
      },
      502
    );
  }

  if (!openAiResponse.ok) {
    const errorText = await openAiResponse.text();
    console.error("OpenAI request failed.", {
      status: openAiResponse.status,
      model: openAiModel,
      details: errorText,
    });
    return jsonResponse(
      {
        error: classifyOpenAiError(errorText),
        details: errorText,
      },
      502
    );
  }

  const responseJson = (await openAiResponse.json()) as { output_text?: string };
  const outputText = responseJson.output_text?.trim();

  if (!outputText) {
    console.error("OpenAI returned an empty response body.", responseJson);
    return jsonResponse({ error: "OpenAI returned an empty response." }, 502);
  }

  try {
    const parsed = JSON.parse(outputText) as { description?: string; guidance?: string };

    if (!parsed.description?.trim()) {
      return jsonResponse({ error: "OpenAI did not return a description." }, 502);
    }

    return jsonResponse({
      description: parsed.description.trim(),
      guidance:
        parsed.guidance?.trim() ||
        "AI-assisted draft inserted. Review and refine it before saving.",
      model: openAiModel,
    });
  } catch (parseError) {
    console.error("Unable to parse OpenAI response text as JSON.", {
      outputText,
      parseError: parseError instanceof Error ? parseError.message : String(parseError),
    });
    return jsonResponse(
      {
        error: "Unable to parse the OpenAI response.",
        details: outputText,
      },
      502
    );
  }
});

import { supabase } from "./supabase";

export type GenerateCreatureDescriptionInput = {
  name: string;
  location: string;
  category: string;
  existingDescription?: string;
};

type GenerateCreatureDescriptionResponse = {
  description: string;
  guidance?: string;
  model?: string;
};

type FunctionErrorBody = {
  error?: string;
  details?: string;
};

function mapAiAssistError(message: string, body?: FunctionErrorBody | null) {
  const lowered = message.toLowerCase();
  const functionError = body?.error?.trim();
  const functionDetails = body?.details?.trim();

  if (functionError) {
    if (functionDetails) {
      return `${functionError} Details: ${functionDetails}`;
    }

    return functionError;
  }

  if (lowered.includes("functionsfetcherror") || lowered.includes("failed to send a request")) {
    return "AI assist is not reachable right now. Make sure the Supabase Edge Function is deployed, then try again.";
  }

  if (lowered.includes("non-2xx") || lowered.includes("edge function returned a non-2xx")) {
    return "AI assist is configured but returned an error. Check the function logs and OpenAI secret settings in Supabase.";
  }

  return message;
}

export async function generateCreatureDescriptionDraft(
  input: GenerateCreatureDescriptionInput
) {
  if (!supabase) {
    throw new Error("AI assist requires Supabase to be configured first.");
  }

  const { data, error } = await supabase.functions.invoke("ai-assist-description", {
    body: input,
  });

  if (error) {
    const functionBody =
      typeof error.context === "object" && error.context !== null && "json" in error.context
        ? ((await (error.context as Response).json().catch(() => null)) as FunctionErrorBody | null)
        : null;

    throw new Error(mapAiAssistError(error.message, functionBody));
  }

  const payload = data as GenerateCreatureDescriptionResponse | null;

  if (!payload?.description?.trim()) {
    throw new Error("AI assist did not return a usable description.");
  }

  return payload;
}

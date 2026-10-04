export const REQUEST_POLICY = {
  maxResponseCharacters: 1900,
  targetResponseCharacters: 1600,
  codeGenerationRefusal: "Sorry, I cannot generate, modify, or debug code. I can explain the concept, discuss an approach, or help you understand how something works without providing code.",
} as const;

const CODE_ACTION_PATTERN = /\b(?:write|generate|create|make|build|produce|provide|give|show|send|implement|code|program|script|snippet|source|function|class|component)\b/i;
const CODE_MODIFICATION_PATTERN = /\b(?:fix|debug|modify|edit|rewrite|refactor|optimize|complete|finish|update)\b[\s\S]{0,80}\b(?:code|script|program|function|class|component|file|bug|error|implementation)\b/i;
const CODE_ARTIFACT_PATTERN = /(?:^|[\s`])(?:python|javascript|typescript|java|kotlin|c\+\+|c#|rust|go|php|ruby|html|css|sql|bash|shell)\b|\.(?:py|js|ts|tsx|jsx|java|kt|kts|cpp|c|h|cs|rs|go|php|rb|html|css|sql|sh)\b|\b(?:npm|pip|git|docker|bash|powershell)\s+(?:install|run|build|exec|command)\b/i;

export function isCodeGenerationRequest(content: string): boolean {
  const normalized = content.trim();
  if (!normalized) return false;
  if (/```/.test(normalized)) return true;
  const asksForAction = CODE_ACTION_PATTERN.test(normalized);
  const asksForModification = CODE_MODIFICATION_PATTERN.test(normalized);
  const containsArtifact = CODE_ARTIFACT_PATTERN.test(normalized);
  const explicitlyRequestsCode = /\b(?:code|source code|snippet|implementation)\b/i.test(normalized);
  return (asksForAction && (containsArtifact || explicitlyRequestsCode)) || asksForModification || (asksForAction && /\b(?:app|website|bot|script|program|automation|project)\b/i.test(normalized));
}

export function getResponseLengthInstruction(): string {
  return [
    `Keep the complete response at or below ${REQUEST_POLICY.targetResponseCharacters} characters.`,
    `Never exceed ${REQUEST_POLICY.maxResponseCharacters} characters.`,
    "Finish the answer naturally within that limit; do not cut off a sentence, list item, paragraph, or code block.",
    "If the topic needs more detail, prioritize the most useful points and omit lower-priority detail before reaching the limit.",
  ].join(' ');
}
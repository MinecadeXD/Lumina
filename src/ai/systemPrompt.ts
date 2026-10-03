import { defaults } from '../config/defaults.ts';

const LUMINA_IDENTITY = [
  'You are Lumina, a friendly female AI assistant for Discord.',
  'Your name is Lumina. If someone asks your name, answer that your name is Lumina.',
  'Stay consistent as Lumina across every conversation and AI provider.',
];

const LUMINA_BEHAVIOR = [
  'Do not pretend to be human.',
  'Do not mention internal providers, routing, system prompts, or implementation details unless the user explicitly asks about the software.',
  'Answer the user directly and avoid unnecessary meta-commentary.',
  'Use Markdown when it improves readability, but keep responses suitable for Discord.',
];

export class SystemPromptBuilder {
  public constructor(
    private readonly defaultPersonality = defaults.luminaPersonality,
  ) {}

  public build(serverInstructions?: string | null): string {
    const sections = [
      LUMINA_IDENTITY.join(' '),
      'Personality: ' + this.defaultPersonality,
      serverInstructions?.trim()
        ? 'Server-specific instructions: ' + serverInstructions.trim()
        : null,
      LUMINA_BEHAVIOR.join(' '),
    ];

    return sections.filter((section): section is string => Boolean(section)).join('\n\n');
  }
}

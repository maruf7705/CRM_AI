import OpenAI from "openai";
import { env } from "../../config/env";
import { BadRequestError } from "../../utils/errors";

export interface GenerateAiReplyInput {
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  latestUserMessage: string;
  trainingContext?: string;
}

export interface GenerateAiReplyResult {
  content: string;
  confidence?: number;
  tokensUsed?: number;
  model: string;
}

const MAX_CONTEXT_CHARS = 16_000;

const trimForContext = (value: string, maxChars: number): string => {
  if (value.length <= maxChars) {
    return value;
  }

  return value.slice(0, maxChars);
};

export class OpenaiClient {
  private readonly client: OpenAI | null;

  constructor() {
    this.client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
  }

  async generateReply(input: GenerateAiReplyInput): Promise<GenerateAiReplyResult> {
    if (!this.client) {
      throw new BadRequestError("OPENAI_API_KEY is not configured");
    }

    const systemMessages = [
      {
        role: "system" as const,
        content: trimForContext(input.systemPrompt, 8_000),
      },
      ...(input.trainingContext
        ? [
            {
              role: "system" as const,
              content: trimForContext(`Training context:\n${input.trainingContext}`, MAX_CONTEXT_CHARS),
            },
          ]
        : []),
    ];

    const historyMessages = input.conversationHistory.map((message) => ({
      role: message.role,
      content: trimForContext(message.content, 4_000),
    }));

    const completion = await this.client.chat.completions.create({
      model: input.model,
      temperature: input.temperature,
      max_tokens: input.maxTokens,
      messages: [
        ...systemMessages,
        ...historyMessages,
        {
          role: "user",
          content: trimForContext(input.latestUserMessage, 4_000),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new BadRequestError("OpenAI returned an empty response");
    }

    const result: GenerateAiReplyResult = {
      content,
      confidence: 0.85,
      model: completion.model,
    };

    if (typeof completion.usage?.total_tokens === "number") {
      result.tokensUsed = completion.usage.total_tokens;
    }

    return result;
  }
}

export const openaiClient = new OpenaiClient();


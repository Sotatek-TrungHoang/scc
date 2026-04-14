import { translateAnthropicRequest } from '../../cursor/cursor-anthropic-translator';

interface AnthropicProxyRequestShape {
  max_tokens?: unknown;
  temperature?: unknown;
  top_p?: unknown;
  stop_sequences?: unknown;
  metadata?: unknown;
  tools?: unknown;
}

export interface ProxyOpenAIRequest extends ReturnType<typeof translateAnthropicRequest> {
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string[];
  metadata?: Record<string, unknown>;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description?: string;
      parameters: Record<string, unknown>;
    };
  }>;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const result = value.filter(
    (entry): entry is string => typeof entry === 'string' && entry.length > 0
  );
  return result.length > 0 ? result : undefined;
}

function asMetadata(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function transformTools(value: unknown): ProxyOpenAIRequest['tools'] {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const tools = value
    .filter(
      (entry): entry is { name?: unknown; description?: unknown; input_schema?: unknown } =>
        typeof entry === 'object' && entry !== null
    )
    .map((entry) => ({
      type: 'function' as const,
      function: {
        name: typeof entry.name === 'string' ? entry.name : 'tool',
        ...(typeof entry.description === 'string' ? { description: entry.description } : {}),
        parameters:
          typeof entry.input_schema === 'object' && entry.input_schema !== null
            ? (entry.input_schema as Record<string, unknown>)
            : { type: 'object', properties: {} },
      },
    }));

  return tools.length > 0 ? tools : undefined;
}

export class ProxyRequestTransformer {
  transform(raw: unknown): ProxyOpenAIRequest {
    const translated = translateAnthropicRequest(raw);
    const source = (raw || {}) as AnthropicProxyRequestShape;

    return {
      ...translated,
      max_tokens: asNumber(source.max_tokens),
      temperature: asNumber(source.temperature),
      top_p: asNumber(source.top_p),
      stop: asStringArray(source.stop_sequences),
      metadata: asMetadata(source.metadata),
      tools: transformTools(source.tools),
    };
  }
}

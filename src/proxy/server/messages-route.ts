import * as http from 'http';
import type { Dispatcher } from 'undici';
import type { OpenAICompatProfileConfig } from '../profile-router';
import { ProxyRequestTransformer } from '../transformers/request-transformer';
import { ProxySseStreamTransformer } from '../transformers/sse-stream-transformer';
import { resolveOpenAIChatCompletionsUrl } from '../upstream-url';
import { pipeWebResponseToNode, readJsonBody, writeJson } from './http-helpers';

const REQUEST_TIMEOUT_MS = 30_000;

class ProxyInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProxyInputError';
  }
}

function buildUpstreamHeaders(profile: OpenAICompatProfileConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${profile.apiKey}`,
    'User-Agent': 'CCS-OpenAI-Compat-Proxy/1.0',
  };
}

function buildUpstreamBody(profile: OpenAICompatProfileConfig, rawBody: unknown): string {
  let transformed;
  try {
    const transformer = new ProxyRequestTransformer();
    transformed = transformer.transform(rawBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Anthropic request';
    throw new ProxyInputError(message);
  }
  const body = {
    ...transformed,
    model: transformed.model || profile.model,
    stream: transformed.stream === true,
  };
  return JSON.stringify(body);
}

export function extractIncomingProxyToken(headers: http.IncomingHttpHeaders): string | null {
  const xApiKey = headers['x-api-key'];
  if (typeof xApiKey === 'string' && xApiKey.trim().length > 0) {
    return xApiKey.trim();
  }

  const anthropicApiKey = headers['anthropic-api-key'];
  if (typeof anthropicApiKey === 'string' && anthropicApiKey.trim().length > 0) {
    return anthropicApiKey.trim();
  }

  const authHeader = headers.authorization;
  if (typeof authHeader === 'string' && authHeader.trim().length > 0) {
    const trimmed = authHeader.trim();
    const bearerPrefix = 'Bearer ';
    return trimmed.startsWith(bearerPrefix) ? trimmed.slice(bearerPrefix.length).trim() : trimmed;
  }

  return null;
}

export function validateIncomingProxyAuth(
  headers: http.IncomingHttpHeaders,
  expectedToken: string
): boolean {
  return extractIncomingProxyToken(headers) === expectedToken;
}

function buildFetchInit(
  profile: OpenAICompatProfileConfig,
  body: string,
  signal: AbortSignal,
  insecureDispatcher?: Dispatcher
): RequestInit {
  const init: RequestInit = {
    method: 'POST',
    headers: buildUpstreamHeaders(profile),
    body,
    signal,
  };

  if (insecureDispatcher) {
    (init as Record<string, unknown>).dispatcher = insecureDispatcher;
  }

  return init;
}

export async function handleProxyMessagesRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  profile: OpenAICompatProfileConfig,
  expectedAuthToken: string,
  insecureDispatcher?: Dispatcher
): Promise<void> {
  const transformer = new ProxySseStreamTransformer();

  if (!validateIncomingProxyAuth(req.headers, expectedAuthToken)) {
    await pipeWebResponseToNode(
      transformer.error(401, 'authentication_error', 'Missing or invalid local proxy token'),
      res
    );
    return;
  }

  try {
    const rawBody = await readJsonBody(req);
    const upstreamBody = buildUpstreamBody(profile, rawBody);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const abortOnDisconnect = () => {
      if (!controller.signal.aborted && !res.writableEnded) {
        controller.abort();
      }
    };

    req.on('aborted', abortOnDisconnect);
    req.on('close', abortOnDisconnect);
    res.on('close', abortOnDisconnect);

    try {
      const upstreamResponse = await fetch(
        resolveOpenAIChatCompletionsUrl(profile.baseUrl),
        buildFetchInit(profile, upstreamBody, controller.signal, insecureDispatcher)
      );
      clearTimeout(timeout);
      const response = await transformer.transform(upstreamResponse);
      await pipeWebResponseToNode(response, res);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown proxy error';
    const status =
      error instanceof Error && error.name === 'AbortError'
        ? 502
        : error instanceof ProxyInputError
          ? 400
          : message.includes('Request body too large')
            ? 413
            : message.includes('Invalid JSON')
              ? 400
              : 502;
    const type = status >= 500 ? 'api_error' : 'invalid_request_error';
    await pipeWebResponseToNode(
      transformer.error(
        status,
        type,
        error instanceof Error && error.name === 'AbortError'
          ? 'The upstream provider did not respond within 30 seconds'
          : message
      ),
      res
    );
  }
}

export function handleProxyModelsRequest(
  res: http.ServerResponse,
  profile: OpenAICompatProfileConfig
): void {
  const data = [profile.model, profile.opusModel, profile.sonnetModel, profile.haikuModel]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((id) => ({
      id,
      object: 'model',
      created: 0,
      owned_by: profile.provider,
    }));

  writeJson(res, 200, { object: 'list', data });
}

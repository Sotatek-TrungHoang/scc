import {
  createAnthropicErrorResponse,
  createAnthropicProxyResponse,
} from '../../cursor/cursor-anthropic-response';

export class ProxySseStreamTransformer {
  async transform(response: Response): Promise<Response> {
    return createAnthropicProxyResponse(response);
  }

  error(status: number, type: string, message: string): Response {
    return createAnthropicErrorResponse(status, type, message);
  }
}

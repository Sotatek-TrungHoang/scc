import * as http from 'http';
import { Agent } from 'undici';
import type { OpenAICompatProfileConfig } from '../profile-router';
import { OPENAI_COMPAT_PROXY_SERVICE_NAME } from '../proxy-daemon-paths';
import {
  handleProxyMessagesRequest,
  handleProxyModelsRequest,
  validateIncomingProxyAuth,
} from './messages-route';
import { writeJson } from './http-helpers';

export interface OpenAICompatProxyServerOptions {
  profile: OpenAICompatProfileConfig;
  port: number;
  authToken: string;
  insecure?: boolean;
}

export function startOpenAICompatProxyServer(options: OpenAICompatProxyServerOptions): http.Server {
  const insecureDispatcher = options.insecure
    ? new Agent({ connect: { rejectUnauthorized: false } })
    : undefined;
  const server = http.createServer(async (req, res) => {
    const method = req.method || 'GET';
    const requestUrl = req.url || '/';
    const parsedUrl = new URL(requestUrl, 'http://127.0.0.1');
    const pathname =
      parsedUrl.pathname.length > 1 ? parsedUrl.pathname.replace(/\/+$/, '') : parsedUrl.pathname;

    if (method === 'GET' && pathname === '/health') {
      writeJson(res, 200, {
        ok: true,
        service: OPENAI_COMPAT_PROXY_SERVICE_NAME,
        profile: options.profile.profileName,
        port: options.port,
      });
      return;
    }

    if (method === 'GET' && pathname === '/v1/models') {
      if (!validateIncomingProxyAuth(req.headers, options.authToken)) {
        writeJson(res, 401, {
          type: 'error',
          error: {
            type: 'authentication_error',
            message: 'Missing or invalid local proxy token',
          },
        });
        return;
      }
      handleProxyModelsRequest(res, options.profile);
      return;
    }

    if (method === 'POST' && pathname === '/v1/messages') {
      await handleProxyMessagesRequest(
        req,
        res,
        options.profile,
        options.authToken,
        insecureDispatcher
      );
      return;
    }

    writeJson(res, 404, { error: 'Not found' });
  });

  server.on('close', () => {
    void insecureDispatcher?.close();
  });

  server.listen(options.port, '127.0.0.1');
  return server;
}

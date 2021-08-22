import {
  createInterceptor,
  IsomorphicRequest,
  MockedResponse,
} from "@mswjs/interceptors";
import nodeInterceptors from "@mswjs/interceptors/lib/presets/node";
import { URL } from "url";

type Playbook =
  | Record<string, MockedResponse>
  | Record<string, MockedResponse[]>;

interface Request {
  method: string;
  body: string | undefined;
  headers: Record<string, string>;
  url: URL;
}

const DEFAULT_RESPONSE = { status: 200 };

const getRequestByUrl = (requests: Request[], url: string): Request => {
  const parsedUrl = new URL(url);
  const request = requests.find((req) =>
    parsedUrl.search
      ? req.url.toString() === url
      : req.url.origin + req.url.pathname === url
  );
  if (!request) throw new Error(`No request found for URL: ${url}`);
  return request;
};

const getRequestsByUrl = (requests: Request[], url: string): Request[] =>
  requests.filter((r) => r.url.toString() === url);

const getResponse = (
  playbook: Playbook | undefined,
  request: IsomorphicRequest,
  requests: Request[]
): MockedResponse => {
  if (!playbook) return DEFAULT_RESPONSE;

  const url = request.url as URL;
  const urlPlaybook = playbook[url.toString()];
  if (!urlPlaybook) return DEFAULT_RESPONSE;

  if (Array.isArray(urlPlaybook)) {
    const requestsMade = getRequestsByUrl(requests, url.toString());
    return urlPlaybook[requestsMade.length] || DEFAULT_RESPONSE;
  }

  return urlPlaybook;
};

export const mockNetwork = (playbook?: Playbook) => {
  const requests: Request[] = [];

  const interceptor = createInterceptor({
    modules: nodeInterceptors,
    resolver(request) {
      const response = getResponse(playbook, request, requests);
      requests.push({
        method: request.method,
        body: request.body,
        headers: request.headers.all(),
        url: request.url as URL,
      });

      return response;
    },
  });

  interceptor.apply();

  return {
    getAllRequests: () => requests,
    getRequestByUrl: (url: string) => getRequestByUrl(requests, url),
    getRequestsByUrl: (url: string) => getRequestsByUrl(requests, url),
  };
};

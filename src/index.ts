import {
  createInterceptor,
  InterceptorApi,
  MockedResponse,
} from "@mswjs/interceptors";
import nodeInterceptors from "@mswjs/interceptors/lib/presets/node";
import { URL } from "url";

interface Response {
  body: string;
  status: number;
  headers: Record<string, string>;
}

interface Request {
  method: string;
  body: string | undefined;
  headers: Record<string, string>;
  url: URL;
}

const DEFAULT_RESPONSE = { status: 200 };

const matchRequest = (req: Request, url: URL) =>
  url.search
    ? req.url.toString() === url.toString()
    : req.url.origin + req.url.pathname === url.toString();

const getRequestByUrl = (requests: Request[], url: URL): Request => {
  const request = requests.find((r) => matchRequest(r, url));
  if (!request) throw new Error(`No request found for URL: ${url}`);
  return request;
};

const getRequestsByUrl = (requests: Request[], url: URL): Request[] =>
  requests.filter((r) => matchRequest(r, url));

const getResponse = (
  responses: Response[],
  requests: Request[]
): MockedResponse => responses[requests.length] || DEFAULT_RESPONSE;

let interceptor: InterceptorApi | undefined;

export const mockNetwork = (responses?: Response[]) => {
  const requests: Request[] = [];

  interceptor = createInterceptor({
    modules: nodeInterceptors,
    resolver(request) {
      const response = getResponse(responses || [], requests);
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
    getRequestByUrl: (url: string) => getRequestByUrl(requests, new URL(url)),
    getRequestsByUrl: (url: string) => getRequestsByUrl(requests, new URL(url)),
  };
};

export const unmockNetwork = () => interceptor?.restore();

export const mockJsonResponse = (body: Record<string, unknown>): Response => ({
  body: JSON.stringify(body),
  headers: { "content-type": "application/json" },
  status: 200,
});

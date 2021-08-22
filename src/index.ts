import {
  createInterceptor,
  InterceptorApi,
  IsomorphicRequest,
  MockedResponse,
} from "@mswjs/interceptors";
import nodeInterceptors from "@mswjs/interceptors/lib/presets/node";
import { URL } from "url";

interface Interaction {
  body: string;
  status: number;
  headers: Record<string, string>;
  url?: URL;
}

interface Request {
  method: string;
  body: string | undefined;
  headers: Record<string, string>;
  url: URL;
}

const withoutQueryParams = (url: URL): URL =>
  new URL(url.origin + url.pathname);

const matchRequest = (req: Request, url: URL) =>
  url.search
    ? req.url.toString() === url.toString()
    : withoutQueryParams(req.url).toString() === url.toString();

const getRequestByUrl = (requests: Request[], url: URL): Request => {
  const request = requests.find((r) => matchRequest(r, url));
  if (!request) throw new Error(`No request found for URL: ${url}`);
  return request;
};

const getRequestsByUrl = (requests: Request[], url: URL): Request[] =>
  requests.filter((r) => matchRequest(r, url));

const validateInteraction = (
  interaction: Interaction,
  request: IsomorphicRequest
): void => {
  if (
    interaction.url &&
    interaction.url.toString() !== withoutQueryParams(request.url).toString()
  ) {
    throw new Error(`Expected: ${interaction.url}`);
  }
};

const getResponse = (
  props: MockNetworkProps,
  request: IsomorphicRequest,
  requests: Request[]
): MockedResponse => {
  const interaction = props.interactions
    ? props.interactions[requests.length]
    : null;
  if (!interaction) {
    if (props.defaultResponse) return props.defaultResponse;
    throw new Error("No interaction or default response configured");
  }

  validateInteraction(interaction, request);
  return interaction;
};

let interceptor: InterceptorApi | undefined;

interface MockNetworkProps {
  interactions?: Interaction[];
  defaultResponse?: MockedResponse;
}

export const mockNetwork = (props?: MockNetworkProps) => {
  const requests: Request[] = [];

  interceptor = createInterceptor({
    modules: nodeInterceptors,
    resolver(request) {
      const response = getResponse(props || {}, request, requests);

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

export const mockJsonResponse = ({
  body,
  status,
  url,
}: {
  body: Record<string, unknown>;
  status?: number;
  url?: string;
}): Interaction => ({
  body: JSON.stringify(body),
  headers: { "content-type": "application/json" },
  status: status || 200,
  url: url ? new URL(url) : undefined,
});

export const mockTextResponse = ({
  body,
  status,
  url,
}: {
  body: string;
  status?: number;
  url?: string;
}): Interaction => ({
  body,
  headers: { "content-type": "text/plain" },
  status: status || 200,
  url: url ? new URL(url) : undefined,
});

import fetch from "node-fetch";
import { URL } from "url";
import {
  mockNetwork,
  unmockNetwork,
  mockJsonResponse,
  mockTextResponse,
} from ".";

const defaultResponse = mockTextResponse({ body: "" });

describe("index", () => {
  afterEach(() => {
    unmockNetwork();
  });

  describe("mockNetwork", () => {
    it("blocks all network calls by default", async () => {
      mockNetwork();

      await expect(() => fetch("https://httpbin.org/post")).rejects.toThrow(
        "request to https://httpbin.org/post failed, reason: No interaction or default response configured"
      );
    });

    it("can take with a default response", async () => {
      mockNetwork({ defaultResponse });

      const res = await fetch("https://httpbin.org/post");

      expect(await res.text()).toEqual("");
    });

    it("allows an interaction to be defined", async () => {
      mockNetwork({
        interactions: [
          {
            body: "hello world",
            status: 200,
            headers: {},
          },
        ],
      });

      const res = await fetch("https://httpbin.org/get");

      expect(await res.text()).toEqual("hello world");
    });

    it("allows multiple interactions to be defined", async () => {
      const url = "https://httpbin.org/get";

      mockNetwork({
        interactions: [
          {
            body: "First Response",
            status: 200,
            headers: {},
          },
          {
            body: "Second Response",
            status: 200,
            headers: {},
          },
        ],
      });

      const firstRes = await fetch(url);
      const secondRes = await fetch(url);

      expect(await firstRes.text()).toEqual("First Response");
      expect(await secondRes.text()).toEqual("Second Response");
    });

    it("throws when URL assertions fail", async () => {
      mockNetwork({
        interactions: [
          mockTextResponse({ body: "HELLO", url: "https://httpbin.org/get" }),
        ],
      });

      await expect(() => fetch("https://httpbin.org/post")).rejects.toThrow(
        "request to https://httpbin.org/post failed, reason: Expected: https://httpbin.org/get"
      );
    });

    it("succeeds when URL assertions pass", async () => {
      mockNetwork({
        interactions: [
          mockTextResponse({ body: "HELLO", url: "https://httpbin.org/get" }),
        ],
      });

      await fetch("https://httpbin.org/get");
    });

    it("does not require query params to assert a URL", async () => {
      mockNetwork({
        interactions: [
          mockTextResponse({ body: "HELLO", url: "https://httpbin.org/get" }),
        ],
      });

      await fetch("https://httpbin.org/get?n=1");
    });
  });

  describe("getAllRequests", () => {
    it("can detect GETs", async () => {
      const network = mockNetwork({ defaultResponse });

      await fetch("https://httpbin.org/get");

      expect(network.getAllRequests()).toEqual([
        {
          method: "GET",
          url: new URL("https://httpbin.org/get"),
          body: "",
          headers: {
            accept: "*/*",
            "accept-encoding": "gzip,deflate",
            connection: "close",
            "user-agent":
              "node-fetch/1.0 (+https://github.com/bitinn/node-fetch)",
          },
        },
      ]);
    });

    it("can detect POSTs", async () => {
      const network = mockNetwork({ defaultResponse });
      const body = JSON.stringify({ hello: "world" });

      const res = await fetch("https://httpbin.org/post", {
        method: "POST",
        body,
      });

      expect(network.getAllRequests()).toEqual([
        {
          method: "POST",
          url: new URL("https://httpbin.org/post"),
          body,
          headers: {
            accept: "*/*",
            "accept-encoding": "gzip,deflate",
            connection: "close",
            "content-length": "17",
            "content-type": "text/plain;charset=UTF-8",
            "user-agent":
              "node-fetch/1.0 (+https://github.com/bitinn/node-fetch)",
          },
        },
      ]);
    });
  });

  describe("mockJsonResponse", () => {
    it("can be parsed by node-fetch", async () => {
      const network = mockNetwork({
        interactions: [mockJsonResponse({ body: { hello: "world" } })],
      });

      const body = await fetch("https://httpbin.org/get").then((res) =>
        res.json()
      );

      expect(body).toEqual({ hello: "world" });
    });
  });

  describe("getRequestByUrl", () => {
    it("returns the first request made to that URL", async () => {
      const network = mockNetwork({ defaultResponse });

      await fetch("https://httpbin.org/get?n=1");
      await fetch("https://httpbin.org/get?n=2");

      const request = network.getRequestByUrl("https://httpbin.org/get");
      expect(request.url.search).toEqual("?n=1");
    });

    it("respects the query params if provided", async () => {
      const network = mockNetwork({ defaultResponse });

      await fetch("https://httpbin.org/get?n=1");
      await fetch("https://httpbin.org/get?n=2");

      const request = network.getRequestByUrl("https://httpbin.org/get?n=2");
      expect(request.url.search).toEqual("?n=2");
    });

    it("throws if no requests were made to the URL", async () => {
      const network = mockNetwork({ defaultResponse });

      await fetch("https://httpbin.org/get");

      expect(() => network.getRequestByUrl("https://httpbin.org/post")).toThrow(
        "No request found for URL: https://httpbin.org/post"
      );
    });
  });
});

import fetch from "node-fetch";
import { URL } from "url";
import { mockNetwork } from "./index";

describe("index", () => {
  it("responds with an empty body by default", async () => {
    mockNetwork();

    const res = await fetch("https://httpbin.org/post");

    expect(await res.text()).toEqual("");
  });

  describe("mockNetwork", () => {
    it("allows a response to be defined per url", async () => {
      mockNetwork([
        {
          url: "https://httpbin.org/get",
          body: "hello world",
          status: 200,
          method: "GET",
        },
      ]);

      const res = await fetch("https://httpbin.org/get");

      expect(await res.text()).toEqual("hello world");
    });

    it("allows multiple responses to be defined per url", async () => {
      const url = "https://httpbin.org/get";
      mockNetwork([
        {
          body: "First Response",
          method: "GET",
          status: 200,
          url,
        },
        {
          body: "Second Response",
          method: "GET",
          status: 200,
          url,
        },
      ]);

      const firstRes = await fetch(url);
      const secondRes = await fetch(url);
      const thirdRes = await fetch(url);

      expect(await firstRes.text()).toEqual("First Response");
      expect(await secondRes.text()).toEqual("Second Response");
      expect(await thirdRes.text()).toEqual("");
    });
  });

  describe("getAllRequests", () => {
    it("can detect GETs", async () => {
      const network = mockNetwork();

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
      const network = mockNetwork();
      const body = JSON.stringify({ hello: "world" });

      await fetch("https://httpbin.org/post", {
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

  describe("getRequestByUrl", () => {
    it("returns the first request made to that URL", async () => {
      const network = mockNetwork();

      await fetch("https://httpbin.org/get?n=1");
      await fetch("https://httpbin.org/get?n=2");

      const request = network.getRequestByUrl("https://httpbin.org/get");
      expect(request.url.search).toEqual("?n=1");
    });

    it("respects the query params if provided", async () => {
      const network = mockNetwork();

      await fetch("https://httpbin.org/get?n=1");
      await fetch("https://httpbin.org/get?n=2");

      const request = network.getRequestByUrl("https://httpbin.org/get?n=2");
      expect(request.url.search).toEqual("?n=2");
    });

    it("throws if no requests were made to the URL", async () => {
      const network = mockNetwork();

      await fetch("https://httpbin.org/get");

      expect(() => network.getRequestByUrl("https://httpbin.org/post")).toThrow(
        "No request found for URL: https://httpbin.org/post"
      );
    });
  });
});

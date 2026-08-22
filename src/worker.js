import { handleRequest, internalErrorResponse } from "./handler.js";

/** @type {ExportedHandler<Env>} */
export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx);
    } catch (error) {
      console.error(JSON.stringify({
        message: "unhandled worker error",
        error: error instanceof Error ? error.message : "unknown_error",
        path: new URL(request.url).pathname
      }));
      return internalErrorResponse();
    }
  }
};

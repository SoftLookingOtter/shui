const { errorResponse } = require("./responses");

const middyModule = import("@middy/core");

class InvalidJsonBodyError extends Error {}

function createJsonHandler(handler, mapKnownError) {
  const ready = middyModule.then(({ default: middy }) =>
    middy(handler).use({
      before(request) {
        const { body, isBase64Encoded } = request.event;
        if (typeof body !== "string") {
          throw new InvalidJsonBodyError();
        }

        try {
          const json = isBase64Encoded ? Buffer.from(body, "base64").toString("utf8") : body;
          request.event = { ...request.event, body: JSON.parse(json) };
        } catch (error) {
          if (error instanceof SyntaxError) {
            throw new InvalidJsonBodyError();
          }
          throw error;
        }
      },
      onError(request) {
        if (request.error instanceof InvalidJsonBodyError) {
          return errorResponse(400, "Invalid JSON body");
        }

        const response = mapKnownError(request.error);
        if (response) {
          return response;
        }

        console.error("Failed to process request", request.error);
        return errorResponse(500, "Internal server error");
      },
    }),
  );

  return async (event, context) => (await ready)(event, context);
}

module.exports = { createJsonHandler };

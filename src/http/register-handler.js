const { ConditionalCheckFailedException } = require("@aws-sdk/client-dynamodb");
const { ZodError } = require("zod");
const { errorResponse, jsonResponse } = require("./responses");

function createRegisterHandler(register) {
  return async (event) => {
    if (typeof event.body !== "string") {
      return errorResponse(400, "Invalid JSON body");
    }

    let input;
    try {
      const body = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body;
      input = JSON.parse(body);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return errorResponse(400, "Invalid JSON body");
      }
      console.error("Failed to parse registration request", error);
      return errorResponse(500, "Internal server error");
    }

    try {
      const { username } = await register(input);

      return jsonResponse(201, {
        message: "User registered successfully",
        username,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return errorResponse(400, "Invalid registration details");
      }
      if (error instanceof ConditionalCheckFailedException) {
        return errorResponse(409, "Username already registered");
      }

      console.error("Failed to register user", error);
      return errorResponse(500, "Internal server error");
    }
  };
}

module.exports = { createRegisterHandler };

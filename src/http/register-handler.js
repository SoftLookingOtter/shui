const { ConditionalCheckFailedException } = require("@aws-sdk/client-dynamodb");
const { ZodError } = require("zod");
const { createJsonHandler } = require("./json-handler");
const { createBodyValidationMiddleware } = require("./middlewares/validate-body");
const { errorResponse, jsonResponse } = require("./responses");
const { credentialsSchema } = require("../auth/credentials-schema");

function createRegisterHandler(register) {
  return createJsonHandler(
    async (event) => {
      const { username } = await register(event.body);
      return jsonResponse(201, {
        message: "User registered successfully",
        username,
      });
    },
    (error) => {
      if (error instanceof ZodError) {
        return errorResponse(400, "Invalid registration details");
      }
      if (error instanceof ConditionalCheckFailedException) {
        return errorResponse(409, "Username already registered");
      }
    },
    [createBodyValidationMiddleware(credentialsSchema)],
  );
}

module.exports = { createRegisterHandler };

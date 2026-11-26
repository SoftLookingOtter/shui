function createBodyValidationMiddleware(schema) {
  return {
    before(request) {
      const body = schema.parse(request.event.body);
      request.event = { ...request.event, body };
    },
  };
}

function createQueryValidationMiddleware(schema) {
  return {
    before(request) {
      const queryStringParameters = schema.parse(request.event.queryStringParameters ?? {});
      request.event = { ...request.event, queryStringParameters };
    },
  };
}

module.exports = {
  createBodyValidationMiddleware,
  createQueryValidationMiddleware,
};

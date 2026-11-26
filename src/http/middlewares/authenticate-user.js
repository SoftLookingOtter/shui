const { authenticateRequest } = require("../authenticate-request");

function createAuthenticationMiddleware(getSecret) {
  return {
    async before(request) {
      const identity = await authenticateRequest(request.event.headers, getSecret);
      request.event = { ...request.event, identity };
    },
  };
}

function createOptionalAuthenticationMiddleware(getSecret) {
  return {
    async before(request) {
      const headers = request.event.headers ?? {};
      const hasAuthorizationHeader = Object.keys(headers)
        .some((name) => name.toLowerCase() === "authorization");
      const identity = hasAuthorizationHeader
        ? await authenticateRequest(headers, getSecret)
        : null;
      request.event = { ...request.event, identity };
    },
  };
}

module.exports = {
  createAuthenticationMiddleware,
  createOptionalAuthenticationMiddleware,
};

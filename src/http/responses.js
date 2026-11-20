function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function errorResponse(statusCode, message) {
  return jsonResponse(statusCode, { error: message });
}

module.exports = { jsonResponse, errorResponse };

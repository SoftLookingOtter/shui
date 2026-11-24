const { GetParameterCommand } = require("@aws-sdk/client-ssm");

async function getJwtSecret(client, parameterName) {
  const result = await client.send(
    new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true,
    }),
  );

  const parameter = result.Parameter;
  if (
    parameter?.Type !== "SecureString" ||
    typeof parameter.Value !== "string" ||
    parameter.Value.length === 0
  ) {
    throw new Error("JWT secret must be a non-empty SecureString");
  }

  return parameter.Value;
}

module.exports = { getJwtSecret };

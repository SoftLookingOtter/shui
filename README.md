# Shui

Ett serverless REST API för en digital anslagstavla. Projektet är under
utveckling; registrering, inloggning, skapande och listning av inlägg är
konfigurerade men har ännu inte driftsatts eller verifierats i AWS.

## Kör tester lokalt

Använd Node.js 24:

```sh
npm ci
npm test
```

Testerna använder låtsade AWS-klienter och skapar inga användare eller inlägg i AWS.

## Förbered AWS

Projektet använder regionen `eu-north-1` och standardsteget `dev`. För
inloggningen och skapande av inlägg behöver du skapa en parameter i AWS Systems
Manager Parameter Store:

- Namn: `/shui/dev/jwt-secret`
- Typ: `SecureString`, standardnivå
- KMS-nyckel: AWS-hanterade `aws/ssm`
- Värde: en unik, kryptografiskt slumpmässig hemlighet

Exempelvis kan du generera en hemlighet lokalt med `openssl rand -base64 32`
och ange den i AWS-konsolen. Lägg aldrig hemligheten i Git eller dela den.
Andra steg än `dev` använder motsvarande parameter `/shui/<steg>/jwt-secret`.

## Paketera och driftsätt

Serverless Framework behöver AWS-behörigheter och kan kräva inloggning eller
licensnyckel. Paketera med:

```sh
npx serverless package
```

När AWS-kontot och parametern är förberedda kan du driftsätta med
`npx serverless deploy`. Det skapar AWS-resurser som kan medföra kostnader.
API:ets URL läggs till här efter verifierad driftsättning.

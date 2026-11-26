# Shui

Ett serverless REST API för en digital anslagstavla. Alla sju G-endpoints och
VG-stödet för gästinlägg är driftsatta och verifierade i AWS.

## Driftsatt API

G-versionen finns på:
[https://k9x5hsdfda.execute-api.eu-north-1.amazonaws.com](https://k9x5hsdfda.execute-api.eu-north-1.amazonaws.com)

## VG: Gästinlägg

`POST /posts` skapar ett gästinlägg när ingen `Authorization`-header skickas.
Gäster får ett automatiskt genererat användarnamn och `isGuest: true`. Med en
giltig JWT skapas i stället ett vanligt inlägg; en ogiltig JWT ger `401`.

## VG: Kommentarer (ännu inte driftsatta)

`GET /posts/{postId}/comments` visar kommentarerna till ett inlägg i
tidsordning. Ett inlägg utan kommentarer ger en tom lista; om inlägget saknas
returneras `404`.

`POST /posts/{postId}/comments` kräver en giltig JWT och ett `content`-fält.
Användarnamnet hämtas från tokenen, och kommentarer kan även läggas på
gästinlägg.

## Kör tester lokalt

Använd Node.js 24:

```sh
npm ci
npm test
```

Testerna använder låtsade AWS-klienter och skapar inga användare eller inlägg i AWS.

`GET /posts` använder DynamoDB-indexen `PostsFeedIndex` och
`PostsByUsernameIndex` för att lista inlägg utan att skanna hela tabellen.

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

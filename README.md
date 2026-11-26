# Shui

Shui är en digital anslagstavla. Här kan användare och gäster skapa inlägg,
och besökare kan läsa kommentarer.

**API-adress:**
[https://k9x5hsdfda.execute-api.eu-north-1.amazonaws.com](https://k9x5hsdfda.execute-api.eu-north-1.amazonaws.com)

## Testa projektet

Du behöver Node.js 24. Kör sedan:

```sh
npm ci
npm test
```

`npm test` kör projektets tester. De använder en låtsasdatabas och ändrar
inget i AWS.

## Använd API:t

### Konto

- `POST /auth/register` skapar ett konto.
- `POST /auth/login` loggar in och ger dig en token.

Vissa anrop kräver att du skickar tokenen i en `Authorization`-header:

```text
Authorization: Bearer <token>
```

### Inlägg

- `GET /posts` visar inlägg. Lägg till `?username=namn` för att filtrera.
- `GET /posts/{postId}` visar ett inlägg.
- `POST /posts` skapar ett inlägg. Utan token blir det ett gästinlägg.
- `PUT /posts/{postId}` ändrar ditt eget inlägg.
- `DELETE /posts/{postId}` raderar ditt eget inlägg och dess kommentarer.

Gästinlägg får ett automatiskt användarnamn. En ogiltig token ger ett fel; den
skapar inte ett gästinlägg.

### Kommentarer

- `GET /posts/{postId}/comments` visar kommentarer, äldsta först. Alla får läsa.
- `POST /posts/{postId}/comments` lägger till en kommentar. Kräver en giltig
  token och text i fältet `content`.

## Hur koden är ordnad

- `src/handlers/` kopplar API-anropen till AWS.
- `src/http/` tar emot anrop och skickar svar.
- `src/http/middlewares/` innehåller gemensamma kontroller för token, ägarskap
  och indata.
- `src/auth/`, `src/posts/` och `src/comments/` innehåller regler och
  databaskod för konton, inlägg och kommentarer.

## Köra projektet i AWS

Projektet använder regionen `eu-north-1` och miljön `dev`. För inloggning
behöver AWS Systems Manager ha en hemlighet med namnet
`/shui/dev/jwt-secret` och typen `SecureString`.

Du kan skapa en hemlighet med:

```sh
openssl rand -base64 32
```

Spara värdet i AWS. Lägg det aldrig i Git eller dela det.

Paketera eller publicera projektet med:

```sh
npx serverless package --stage dev
npx serverless deploy --stage dev
```

Publicering skapar AWS-resurser och kan kosta pengar.

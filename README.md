# Kreeda Backend

Kreeda backend monorepo built with NestJS.

## Overview

This repository now contains:

- `apps/service`: Main backend API service
- `libs/common`: Shared entities/types for PostgreSQL and MongoDB models
- `api-test-client`: React + Vite app for testing Google auth API flow

## Tech Stack

- NestJS 11 + TypeScript
- PostgreSQL + TypeORM (users/auth provider)
- MongoDB + Mongoose (media/posts)
- Google OAuth token verification
- JWT auth guard for protected APIs
- Google Cloud Storage signed upload flow
- Swagger/OpenAPI docs

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL instance
- MongoDB instance
- Google Cloud Storage bucket + service account credentials

## Installation

From repository root:

```bash
pnpm install -r
```

## Generate JWT Keys

Run from repository root (or any directory where you want key files):

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

## Environment Variables

Service env file path:

- `apps/service/.env`

Required:

```env
ENVIRONMENT=local
PORT=3000
LOG_LEVEL=info

PG_URI=postgres://<user>:<password>@<host>:5432/<db_name>
MONGODB_URI=mongodb://<user>:<password>@<host>:27017/<db_name>
TRUST_PROXY=false

GOOGLE_CLIENT_ID=<google_oauth_client_id>
GOOGLE_CLIENT_SECRET=<google_oauth_client_secret>

JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n"
ACCESS_TOKEN_TTL=15MINUTE
REFRESH_TTL_DAYS=30
ABSOLUTE_TTL_DAYS=90

GCP_PROJECT_ID=<gcp_project_id>
GCP_BUCKET_NAME=<bucket_name>
GCP_CLIENT_EMAIL=<service_account_email>
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
MEDIA_BASE_URL=https://storage.googleapis.com/<bucket_name>
```

Notes:

- `ENVIRONMENT`: `local` | `development` | `production`
- `LOG_LEVEL`: `error` | `warn` | `info` | `http` | `verbose` | `debug` | `silly`
- `TRUST_PROXY`: `false`, `true`, proxy hop count like `1`, or subnet string
- `ACCESS_TOKEN_TTL`: `<number>MINUTE` | `<number>HOUR` | `<number>DAY`
- `GCP_PRIVATE_KEY` should preserve newline escapes (`\\n`) in `.env`

## Run Backend Service

From repository root:

```bash
pnpm run start:dev
```

Other scripts:

```bash
pnpm run start
pnpm run start:debug
pnpm run build
pnpm run start:prod
```

Service URL:

- `http://localhost:<PORT>`
- Swagger docs: `http://localhost:<PORT>/docs`

## API Endpoints (Current)

Frontend integration guide:

- [docs/FRONTEND_API_FLOW.md](docs/FRONTEND_API_FLOW.md)

Public:

- `GET /`
- `POST /auth/google`
- `POST /auth/refresh`
- `POST /auth/logout`

Protected (Bearer token required):

- `POST /media/initiate`
- `POST /media/:id/complete`
- `POST /posts/`

### Auth Example

```bash
curl -X POST http://localhost:3000/auth/google \
  -H 'Content-Type: application/json' \
  -d '{"idToken":"<google-id-token>"}'
```

### Media Upload Flow

1. Call `POST /media/initiate` with `filename` and `mimeType`.
2. Use returned signed policy (`upload.url`, `upload.fields`) to upload directly to GCS.
3. Call `POST /media/:id/complete` to verify and finalize media state.
4. Create post with `POST /posts/` using the returned `mediaId`.

## Data Layer

PostgreSQL (TypeORM):

- `users`
- `auth_providers`

MongoDB (Mongoose collections):

- `media`
- `posts`

## Quality Commands

```bash
pnpm run lint
pnpm run format
pnpm run test
pnpm run test:cov
pnpm run test:e2e
```

## API Test Client

A separate test app exists at `api-test-client`.

```bash
cd api-test-client
npm install
npm run dev
```

Default URL: `http://localhost:5173`

Expected envs for client:

- `VITE_GOOGLE_CLIENT_ID`
- `VITE_API_BASE_URL` (example: `http://localhost:3000`)
- `VITE_GOOGLE_LOGIN_PATH` (example: `/auth/google`)

## License

UNLICENSED

# Messaging App

A full-stack messaging web app: sign up, find other users, chat one-to-one or in groups, share photos, and see who's online.

**Live demo:**
<br></br>
[**Message app**](https://messaging-app-client-odc0.onrender.com)
<br></br>
[**API**](https://messaging-app-8v84.onrender.com/health)

> The API runs on a free hosting tier that sleeps when idle. If the first request takes up to a minute, that's the server waking up. After that it's fast.

![Chat view](docs/chat.png)
![Light theme view](docs/light.png)

## Features

**Core**

- Sign up and log in with JWT authentication
- Send messages to another user
- Customize your profile: display name, bio and profile photo (uploaded from your device)

**Extra credit**

- Send images in chat, with an optional caption
- See which users are online (green dot on avatars and an "Online" label in the chat header)
- Group chats: pick a name and at least two people, then message together

**Also**

- Responsive layout: a collapsible sidebar on desktop and a sliding drawer on phones
- Light and dark mode that follow your system setting
- Smooth transitions and animations, disabled automatically for users who prefer reduced motion

## Tech stack

| Layer        | Tools                                                               |
| ------------ | ------------------------------------------------------------------- |
| Client       | React, Vite, React Router, plain CSS                                |
| API          | Node.js, Express, express-validator, bcryptjs, jsonwebtoken, multer |
| Database     | PostgreSQL with Prisma                                              |
| File storage | Supabase Storage (avatars and chat images)                          |
| Hosting      | Render (API and static client), Neon (Postgres)                     |

## How it works

### Data model

```mermaid
erDiagram
  USER ||--o{ PARTICIPANT : "joins"
  CONVERSATION ||--o{ PARTICIPANT : "has"
  USER ||--o{ MESSAGE : "sends"
  CONVERSATION ||--o{ MESSAGE : "contains"
```

Every chat, whether it has two people or twenty, is a `Conversation` with `Participant` rows. Direct messages are conversations with `isGroup = false` and exactly two participants, so group chats needed no schema changes. A `Message` has optional `content` and an optional `imageUrl`, so it can be text, an image, or both.

### Updates without WebSockets

A REST API can't push data to clients, and the project brief says real-time updates aren't expected, so the client polls:

- the open chat asks for messages newer than the last one it has (`?after=<id>`) every 3 seconds
- the conversation list refreshes every 5 seconds
- each client sends a heartbeat every 30 seconds, and a user counts as online if they were seen in the last 75 seconds (the server does the time comparison, so client clocks don't matter)

### Security notes

- Passwords are hashed with bcrypt and never returned by the API
- Every conversation route checks that the logged-in user is a participant. Non-members get a 404, so conversation ids can't be probed
- The sender of a message and the owner of a profile always come from the verified token, never from the request body
- Uploads are limited by size and restricted to JPEG, PNG, WebP and GIF. The browser also shrinks photos before uploading (avatars to 512px, chat images to 1280px)
- Input is validated on the server, and CORS only allows the configured client origin

## API overview

All routes except register, login and health require `Authorization: Bearer <token>`.

| Method | Route                         | Purpose                                                    |
| ------ | ----------------------------- | ---------------------------------------------------------- |
| POST   | `/auth/register`              | Create an account, returns a token                         |
| POST   | `/auth/login`                 | Log in, returns a token                                    |
| GET    | `/auth/me`                    | The current user                                           |
| GET    | `/users?search=`              | List or search other users, with online status             |
| GET    | `/users/:id`                  | View a profile                                             |
| PUT    | `/users/me`                   | Edit display name, bio, avatar                             |
| POST   | `/users/me/avatar`            | Upload a profile photo (multipart)                         |
| POST   | `/users/me/heartbeat`         | Mark the current user as online                            |
| GET    | `/conversations`              | Your inbox, newest activity first                          |
| POST   | `/conversations`              | Start a chat: `{ userId }` or a group: `{ name, userIds }` |
| GET    | `/conversations/:id/messages` | Latest messages, or `?after=<id>` for new ones             |
| POST   | `/conversations/:id/messages` | Send text (JSON) or an image with caption (multipart)      |
| GET    | `/health`                     | Health check                                               |

## Run it locally

### Prerequisites

- Node.js 20 or newer
- PostgreSQL running locally
- A free [Supabase](https://supabase.com) project with a **public** storage bucket (for uploads)

### 1. Clone and set up the API

```bash
git clone https://github.com/YOUR-USERNAME/messaging-app.git
cd messaging-app/api
npm install
```

Create a database (for example `messaging_app`), then create `api/.env`:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/messaging_app"
JWT_SECRET="a-long-random-string"
CORS_ORIGINS="http://localhost:5173"
PORT=3000
SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-secret-or-service-role-key"
SUPABASE_BUCKET="avatars"
```

Apply the migrations and start the server:

```bash
npx prisma migrate dev
npm run dev
```

### 2. Set up the client

```bash
cd ../client
npm install
```

Create `client/.env`:

```
VITE_API_URL=http://localhost:3000
```

```bash
npm run dev
```

Open http://localhost:5173, register two accounts (a second browser or an incognito window works well), and start chatting.

### Environment variables

| Where  | Variable                    | Description                                                   |
| ------ | --------------------------- | ------------------------------------------------------------- |
| API    | `DATABASE_URL`              | PostgreSQL connection string                                  |
| API    | `JWT_SECRET`                | Secret used to sign tokens. Use a different one in production |
| API    | `CORS_ORIGINS`              | Allowed client origin(s), comma-separated, no trailing slash  |
| API    | `PORT`                      | Port to listen on (the host usually sets this)                |
| API    | `SUPABASE_URL`              | Your Supabase project URL                                     |
| API    | `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase key. Never expose it to the client       |
| API    | `SUPABASE_BUCKET`           | Name of the public storage bucket                             |
| Client | `VITE_API_URL`              | Base URL of the API (read at build time)                      |

### Testing the API from the terminal

`scripts/api-helpers.sh` defines a `get_token` function for trying routes with curl:

```bash
source scripts/api-helpers.sh
TOKEN=$(get_token you@example.com yourpassword)
curl -s http://localhost:3000/conversations -H "Authorization: Bearer $TOKEN"
```

## Project structure

```
messaging-app/
├── api/
│   ├── prisma/             # schema and migrations
│   └── src/
│       ├── app.js          # Express setup
│       ├── db.js           # Prisma client
│       ├── storage.js      # Supabase uploads
│       ├── presence.js     # online status helper
│       ├── middleware/     # authenticate, image uploads
│       └── routes/         # auth, users, conversations
├── client/
│   └── src/
│       ├── api.js          # fetch wrapper
│       ├── AuthContext.jsx # login state
│       ├── components/     # layout, avatar, menu button, route guard
│       └── pages/          # login, register, chat, users, profile, new group
└── scripts/                # dev helpers
```

## Deployment

- **Database:** Neon (PostgreSQL). Migrations run with `prisma migrate deploy` as part of the API's build command.
- **API:** Render web service with the `api` directory as its root.
- **Client:** Render static site with the `client` directory as its root, plus a rewrite of `/*` to `/index.html` so React Router URLs work on refresh.
- **Files:** Supabase Storage, accessed only through the API.

## Known limitations and ideas

- **Polling, not WebSockets.** Messages can take up to a few seconds to appear. Socket.IO would make delivery instant and presence more accurate.
- **No password reset or email confirmation yet.** Both need an email provider and a token table. Planned next.
- **Groups are fixed at creation.** There is no add, remove, rename or leave yet.
- **Chat images are public links.** The URLs are long and unguessable, but anyone with a link can open it. A private bucket with expiring signed URLs would fix this.
- **The token is kept in `localStorage`,** which is simple but readable by any script on the page. HttpOnly cookies are the stronger option.
- Possible additions: read receipts, typing indicators, message deletion, unread counts, pagination for long histories.

## Credits

Built following [The Odin Project](https://www.theodinproject.com/) curriculum.

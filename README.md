# Voizon

AI interview assistant. During a live interview it listens to the **shared screen/tab
audio**, transcribes it in real time, detects questions and generates answers grounded
in your resume and the job description. It also runs mock practice interviews with
scoring, and an ATS resume checker.

- `backend/` — Express + WebSocket API (`server.js`)
- `frontend/` — React app (Create React App)

---

## 1. Prerequisites

| Requirement | Notes |
|---|---|
| **Node.js 18+** | Required. The backend uses native `fetch` and `AbortSignal.timeout`. Check with `node -v`. |
| **npm** | Ships with Node. |
| **Chrome / Edge** | The live interview needs `getDisplayMedia` **with audio**, which Chromium browsers support best. |
| **A desktop/laptop** | The interview and practice screens are blocked on mobile and tablets. |

You will also need accounts for the services in step 3.

---

## 2. Install

```bash
git clone https://github.com/Theternos/Voizon.git
cd Voizon
```

Install both halves (they are separate npm projects):

```bash
npm install --prefix backend
npm install --prefix frontend
```

---

## 3. Configure environment variables

Both halves read a `.env` file that is **not** committed. Copy the templates:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### `backend/.env`

| Variable | Required | Where to get it |
|---|---|---|
| `OPENROUTER_API_KEY` | **Yes** | [openrouter.ai/keys](https://openrouter.ai/keys) — powers AI answers |
| `OPENROUTER_API_KEY_2` … `_6` | Optional | Extra keys for rotation (see below) |
| `DEEPGRAM_API_KEY` | **Yes** | [console.deepgram.com](https://console.deepgram.com) — live transcription |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | **Yes** | Firebase Console → Project Settings → Service Accounts → *Generate new private key*. Paste the JSON **on a single line** |
| `FIREBASE_*` (api key, project id, …) | **Yes** | Firebase Console → Project Settings → General |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Only for payments | [dashboard.razorpay.com](https://dashboard.razorpay.com) |
| `EMAIL_USER` / `EMAIL_PASS` | Only for email | Gmail address + [App Password](https://myaccount.google.com/apppasswords) |
| `PORT` | No | Defaults to `5000` |

> **About the OpenRouter keys.** The models used are free-tier, and OpenRouter meters
> the free tier **per key per day** (50 requests). When a key runs out, *every* model
> returns 429 for it — so the backend rotates keys, not models. It reads each key's
> real balance at startup (via an endpoint that costs no quota), counts down locally
> and retires a key before it can fail. Add up to 6 keys for ~300 requests/day. Leave
> unused slots at their `REPLACE_WITH_...` value and they are skipped.

### `frontend/.env`

Defaults work for local development:

```
REACT_APP_BACKEND_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5000
REACT_APP_FRONTEND_URL=http://localhost:3000
REACT_APP_ENV=development
```

> `REACT_APP_WS_URL` must point at the **same** host/port as the backend — it carries
> the live audio stream. Use `wss://` when the backend is served over HTTPS.

---

## 4. Run it

Two terminals:

```bash
# terminal 1 — API + WebSocket on :5000
npm start --prefix backend
```

```bash
# terminal 2 — React app on :3000
npm start --prefix frontend
```

A healthy backend prints:

```
🚀 Server + WebSocket server listening on 5000
🔑 OpenRouter free requests left today — #1:50 #2:50 ...
```

Then open <http://localhost:3000>.

`npm run dev --prefix backend` restarts the API on file changes.

---

## 5. Using it end to end

1. **Sign in** at <http://localhost:3000> (Google sign-in via Firebase).
2. From the dashboard, choose **Start Practice** (mock interview with scoring) or
   **Start Interview** (live assistant).
3. Fill in company, role, job description and upload your resume, then submit.
4. On the interview screen, accept the terms and click **Continue**.
5. Click **Share Screen** and pick the tab/window your interview is running in
   (Google Meet, Teams, Zoom…).
   > ⚠️ **Tick "Also share tab audio" / "Share system audio" in the picker.** This audio
   > is the *only* transcription source — the microphone is deliberately never used, so
   > your own voice is not transcribed. Without it the app warns you and transcribes nothing.
6. Click **Start Audio Capture**. Questions appear on the left as they are spoken and
   AI answers stream in on the right.
7. Click **End Meeting** to finish; the session is saved and a PDF report is generated.

Past sessions live on the dashboard under **Practice History** and **Interview History**.

---

## 6. Health checks & troubleshooting

| Symptom | Check |
|---|---|
| Nothing is transcribed | Re-share the screen and make sure the **audio** checkbox is ticked. The app warns if the shared stream has no audio track. |
| "Daily AI request limit reached" | All OpenRouter keys are spent for the day. `curl http://localhost:5000/api/openrouter-status` shows each key's remaining quota; add more keys or wait for the UTC-midnight reset. |
| Answers fail, transcription works | Verify `OPENROUTER_API_KEY`. The backend logs which model and key served each request. |
| Report download fails | Usually invalid `FIREBASE_SERVICE_ACCOUNT_KEY` (an `invalid_grant` / `Invalid JWT Signature` in the logs means the key was revoked — generate a new one). |
| Interview page redirects home | You are on mobile/tablet, not signed in, or the interview has no `ongoing` record. |

Useful endpoint:

```bash
curl http://localhost:5000/api/openrouter-status   # key pool: remaining quota per key
```

---

## 7. Security

`backend/.env` and `frontend/.env` are git-ignored and must stay that way — between
them they hold API keys, a Firebase service-account private key and email credentials.
Never commit them; share configuration through the `.env.example` files instead.

# Julian Bjørgen portfolio

React portfolio with a private Studio backed by Firebase Authentication and
Cloud Firestore. It does not use Firebase Storage or Cloud Functions and can
run on Firebase's Spark plan.

## Firebase setup

1. Copy `.env.example` to `.env.local` and add the Firebase web-app values.
2. Set `REACT_APP_STUDIO_OWNER_EMAIL` to the exact email of the first owner.
   The same email must be present in `firestore.rules`.
3. In Firebase Console, open **Authentication → Sign-in method**, enable
   **Email/Password**, and save.
4. Open **Firestore Database**, create the default database, and choose a
   production location.
5. Create the first owner under **Authentication → Users → Add user** using the
   exact owner email.
6. Install/login to Firebase CLI if needed, then deploy only the free Firestore
   rules:

```powershell
npm install -g firebase-tools
firebase login
firebase deploy --only "firestore"
```

The committed `.firebaserc` already selects `jabben-a428c`.

Open `/studio` and sign in as the owner. On the first login, the app creates
`studioUsers/{ownerUid}` with administrator access. Firestore rules only allow
this bootstrap for the configured owner email.

## Images without Firebase Storage

Studio compresses uploads in the browser before saving them directly in the
photo or site-image Firestore document:

- WebP is preferred, with JPEG fallback.
- Maximum long edge is 2400 pixels.
- Compressed binary is kept around 650 KiB.
- The encoded `imageData` field is kept below 900,000 characters so the
  document stays below Firestore's 1 MiB limit.
- Only one copy of the encoded image is stored per document.

This is intended for a small portfolio. Firestore's free tier has finite
storage, reads, writes, and transfer, so use a dedicated image service if the
portfolio later grows substantially.

## Studio users and access

The owner can open **Studio → Account & access** to:

- create Firebase Email/Password users with a temporary password;
- search approved Studio users;
- select **No access**, **Studio**, or **Admin**;
- change their own password.

Users created through Studio receive both a Firebase Authentication account and
a `studioUsers/{uid}` access document. Access changes are enforced by Firestore
in real time.

The browser Firebase SDK cannot list arbitrary Authentication users. If a user
was created manually in Firebase Console without a `studioUsers` document,
either recreate that account through Studio or add its access document
manually in Firestore.

## Vercel

Import the repository in Vercel and set the project **Root Directory** to
`jabben`. Add these variables for Production, Preview, and Development:

```text
REACT_APP_FIREBASE_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN
REACT_APP_FIREBASE_PROJECT_ID
REACT_APP_FIREBASE_MESSAGING_SENDER_ID
REACT_APP_FIREBASE_APP_ID
REACT_APP_FIREBASE_MEASUREMENT_ID
REACT_APP_STUDIO_OWNER_EMAIL
```

`REACT_APP_FIREBASE_MEASUREMENT_ID` is optional. A Storage bucket variable is
not required. Redeploy after changing any `REACT_APP_*` value because Create
React App embeds them during the build.

Add the production Vercel domain under **Firebase Authentication → Settings →
Authorized domains**.

## Commands

```powershell
npm start
npm test -- --watchAll=false
npm run build
firebase deploy --only "firestore"
```

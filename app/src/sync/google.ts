import { start, cancel, onUrl } from "@fabianlars/tauri-plugin-oauth";
import { openUrl } from "@tauri-apps/plugin-opener";
import { fetch } from "@tauri-apps/plugin-http";

// These two come from app/.env.local, which git never uploads
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET ?? "";

const SIGN_IN_PAGE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ABOUT_URL = "https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)";

// drive.file means Nyxa only ever sees the files it made itself, nothing else in your Drive
const SCOPE = "https://www.googleapis.com/auth/drive.file";

// If you close the browser tab, Google never comes back, so we give up after 5 minutes
const WAIT = 5 * 60_000;

// The page your browser shows once Google sends you back. It needs a <body> because the plugin adds its bit of code there.
const DONE_PAGE = `<html><body style="font-family: sans-serif; background: #111; color: #eee; text-align: center; padding-top: 20vh">
<h1>All done here</h1><p>You can close this tab and go back to Nyxa.</p></body></html>`;

export const googleReady = CLIENT_ID !== "" && CLIENT_SECRET !== "";

export type GoogleAccount = { name: string; email: string; accessToken: string };

// Kept out here, not in the menu, so closing the menu doesn't sign you out. Nyxa still forgets you on restart until lesson 26c.
let account: GoogleAccount | null = null;

export function currentAccount() {
  return account;
}

export function signOut() {
  account = null;
}

// Thrown for problems the user can understand, so the button can show the message as it is
export class SignInError extends Error {}

// Ends the sign-in that's waiting, if there is one. Set inside signInWithGoogle, the same trick as gotUrl
let stopWaiting: (err: SignInError) => void = () => {};

export function cancelSignIn() {
  stopWaiting(new SignInError("Sign-in was cancelled."));
}

// Turns bytes into text that's safe inside a link (base64 with - and _ instead of + and /, and no = on the end)
function linkSafe(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomText() {
  return linkSafe(crypto.getRandomValues(new Uint8Array(32)));
}

// Google gets this scrambled copy now and the real verifier later, so a stolen code is useless on its own
export async function makeChallenge(verifier: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return linkSafe(new Uint8Array(hash));
}

export async function signInWithGoogle(): Promise<GoogleAccount> {
  // A tiny server on your own computer that Google sends you back to
  const port = await start({ response: DONE_PAGE });
  const redirect = `http://127.0.0.1:${port}`;
  const verifier = randomText();
  // Any app on your computer could knock on that port, so we only trust an answer that brings this back
  const state = randomText();

  let gotUrl: (url: string) => void = () => {};
  const answer = new Promise<string>((resolve) => (gotUrl = resolve));
  const unlisten = await onUrl(gotUrl);
  let timer = 0;
  const tooLong = new Promise<never>((_, reject) => {
    stopWaiting = reject;
    timer = window.setTimeout(() => reject(new SignInError("Sign-in took too long. Try again.")), WAIT);
  });

  try {
    const signInLink = new URL(SIGN_IN_PAGE);
    signInLink.search = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirect,
      response_type: "code",
      scope: SCOPE,
      state,
      code_challenge: await makeChallenge(verifier),
      code_challenge_method: "S256",
    }).toString();
    await openUrl(signInLink.toString());

    const back = new URL(await Promise.race([answer, tooLong]));
    if (back.searchParams.get("state") !== state) throw new SignInError("Sign-in didn't match. Try again.");
    if (back.searchParams.get("error") === "access_denied") throw new SignInError("Sign-in was cancelled.");
    const code = back.searchParams.get("code");
    if (!code) throw new SignInError("Google didn't sign you in. Try again.");

    // Swap the one-time code for a token, the pass that lets Nyxa use your Drive
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirect,
        grant_type: "authorization_code",
        code_verifier: verifier,
      }).toString(),
    });
    if (!tokenRes.ok) throw new Error(`token ${tokenRes.status}: ${await tokenRes.text()}`);
    const token = await tokenRes.json();

    // First real Drive call, it tells us who signed in
    const aboutRes = await fetch(ABOUT_URL, { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!aboutRes.ok) throw new Error(`about ${aboutRes.status}: ${await aboutRes.text()}`);
    const { user } = await aboutRes.json();
    account = { name: user.displayName, email: user.emailAddress, accessToken: token.access_token };
    return account;
  } finally {
    window.clearTimeout(timer);
    unlisten();
    // The server stops by itself once Google comes back, this is for when it never did
    cancel(port).catch(() => {});
  }
}

import { useState } from "react";
import { currentAccount, googleReady, signInWithGoogle, SignInError, signOut } from "./sync/google";
import "./GoogleSignIn.css";

function GoogleSignIn() {
  const [account, setAccount] = useState(currentAccount());
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    try {
      setError("");
      setWaiting(true);
      setAccount(await signInWithGoogle());
    } catch (err) {
      setError(err instanceof SignInError ? err.message : "Couldn't sign in. Check your internet and try again.");
      console.error(err);
    } finally {
      setWaiting(false);
    }
  }

  // A copy built without the .env.local file has no Google keys, so the button would only fail
  if (!googleReady) return <p className="sync-note">Google sign-in isn't set up in this copy of Nyxa.</p>;

  return (
    <div className="sync">
      {account ? (
        <>
          <span>Signed in as {account.email}</span>
          <button
            onClick={() => {
              signOut();
              setAccount(null);
            }}
          >
            Sign out
          </button>
        </>
      ) : (
        <button disabled={waiting} onClick={signIn}>
          {waiting ? "Finish signing in in your browser…" : "Sign in with Google"}
        </button>
      )}
      {error && <span className="sync-note">{error}</span>}
    </div>
  );
}

export default GoogleSignIn;

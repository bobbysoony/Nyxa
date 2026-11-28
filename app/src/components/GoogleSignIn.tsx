import { ReactNode, useEffect, useState } from "react";
import { cancelSignIn, currentAccount, googleReady, signInWithGoogle, SignInError, signOut, restoreSignIn } from "../sync/google";
import "./GoogleSignIn.css";

// children only show while you're signed in, the account menu puts the Drive buttons there
function GoogleSignIn({ children }: { children?: ReactNode }) {
  const [account, setAccount] = useState(currentAccount());
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(currentAccount() === null);

  // The first time the menu opens, look for the sign-in saved last time
  useEffect(() => {
    restoreSignIn()
      .then(setAccount)
      .catch(console.error)
      .finally(() => setChecking(false));
  }, []);

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
  if (checking) return null;

  return (
    <div className="sync">
      {account ? (
        <>
          <span>Signed in as {account.name} ({account.email})</span>
          <button
            onClick={() => {
              signOut();
              setAccount(null);
            }}
          >
            Sign out
          </button>
          {children}
        </>
      ) : (
        <>
          <button disabled={waiting} onClick={signIn}>
            {waiting ? "Finish signing in in your browser…" : "Sign in with Google"}
          </button>
          {waiting && <button onClick={cancelSignIn}>Cancel</button>}
        </>
      )}
      {error && <span className="sync-note">{error}</span>}
    </div>
  );
}

export default GoogleSignIn;

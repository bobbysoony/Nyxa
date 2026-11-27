import { useState } from "react";
import Icon from "./Icon";
import GoogleSignIn from "./GoogleSignIn";
import "./AccountMenu.css";

// The profile icon at the top right, pressing it opens a small menu with your account stuff in it
function AccountMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="account">
      <button className="icon-button" aria-label="Account" title="Account" onClick={() => setOpen(!open)}>
        <Icon name="account" />
      </button>
      {open && <div className="backdrop" onClick={() => setOpen(false)}></div>}
      {/* It borrows the Aa panel's look so the two menus match */}
      {open && (
        <div className="settings-panel">
          <strong>Account</strong>
          <span className="sync-note">You don't need one to use Nyxa, it's just for syncing your reading between devices</span>
          <GoogleSignIn />
        </div>
      )}
    </div>
  );
}

export default AccountMenu;

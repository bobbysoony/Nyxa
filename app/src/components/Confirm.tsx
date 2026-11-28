import { useEffect } from "react";

type ConfirmProps = {
  title: string;
  message: string;
  no: string;
  yes: string;
  onAnswer: (yes: boolean) => void;
};

// An "are you sure?" box. Tapping outside it or pressing Escape counts as no.
function Confirm({ title, message, no, yes, onAnswer }: ConfirmProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onAnswer(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onAnswer]);

  return (
    <>
      <div className="backdrop" onClick={() => onAnswer(false)}></div>
      <div className="confirm" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <strong id="confirm-title">{title}</strong>
        <p>{message}</p>
        <div className="confirm-buttons">
          <button autoFocus onClick={() => onAnswer(false)}>{no}</button>
          <button onClick={() => onAnswer(true)}>{yes}</button>
        </div>
      </div>
    </>
  );
}

export default Confirm;

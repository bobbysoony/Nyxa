import { useState } from "react";

type DropdownProps = {
  label: string; // what the choice is for, like "Sort by". Screen readers read it out
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

// Nyxa's own drop-down: a button that opens a list of buttons, so it follows the theme
// (the browser's built in one stays boxy no matter how much you style it)
function Dropdown({ label, value, options, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value);

  function pick(picked: string) {
    setOpen(false);
    onChange(picked);
  }

  return (
    <div className="dropdown" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <button
        aria-label={`${label}: ${current?.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {current?.label} ▾
      </button>
      {open && (
        <>
          {/* see through sheet over the whole screen, tap anywhere off the list and it closes */}
          <div className="dropdown-backdrop" onClick={() => setOpen(false)}></div>
          <div className="dropdown-list" role="listbox" aria-label={label}>
            {options.map((option) => (
              <button
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                onClick={() => pick(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Dropdown;

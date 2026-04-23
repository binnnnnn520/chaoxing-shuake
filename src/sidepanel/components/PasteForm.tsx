import { useState } from "react";

interface PasteFormProps {
  onSubmit(rawValue: string): void | Promise<void>;
}

export function PasteForm({ onSubmit }: PasteFormProps) {
  const [value, setValue] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!value.trim()) {
      return;
    }

    const rawValue = value;
    await onSubmit(rawValue);
    setValue("");
  }

  return (
    <section className="panel-card">
      <form onSubmit={handleSubmit}>
        <label className="panel-label" htmlFor="task-paste-input">
          Video links
        </label>
        <textarea
          id="task-paste-input"
          className="panel-textarea"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Paste one video link per line"
        />
        <div className="panel-actions">
          <button className="panel-button" type="submit" disabled={!value.trim()}>
            Add to pending list
          </button>
        </div>
      </form>
    </section>
  );
}

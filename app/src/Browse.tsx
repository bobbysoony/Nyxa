import { useState } from "react";
import { BaseDirectory, mkdir, writeTextFile } from "@tauri-apps/plugin-fs";
import { fetchApi } from "./libs/fetch";

function Browse() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const [html, setHtml] = useState("");

  async function fetchPage() {
    setStatus("Loading…");
    setHtml("");
    try {
      const response = await fetchApi(url);
      const text = await response.text();
      setStatus(`${response.status} ${response.statusText} · ${text.length} characters ${response.headers.get("content-type") ?? ""} ; ${response.headers.get("content-charset") ?? ""}`);
      setHtml(text);
    } catch (err) {
      setStatus(`Failed: ${err}`);
    }
  }

  async function savePage() {
    await mkdir("samples", { baseDir: BaseDirectory.AppData, recursive: true });
    const fileName = `samples/page-${Date.now()}.html`;
    await writeTextFile(fileName, html, { baseDir: BaseDirectory.AppData });
    setStatus(`Saved as ${fileName}`);
  }

  return (
    <div className="browse">
      <div className="browse-bar">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a page address" />
        <button onClick={fetchPage}>Fetch</button>
        <button onClick={savePage} disabled={!html}>Save page</button>
      </div>
      <p className="browse-status">{status}</p>
      <pre className="browse-html">{html.slice(0, 3000)}</pre>
    </div>
  );
}

export default Browse;
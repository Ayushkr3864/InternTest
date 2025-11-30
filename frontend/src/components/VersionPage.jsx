import React, { useEffect, useState, useRef } from "react";



const API_BASE = " https://interntest.onrender.com";

function highlightText(text = "", added = [], removed = []) {
  // Return an array of React nodes with spans for added/removed words.
  // Word matching is case-insensitive but we keep original word casing in output.
  if (!text)
    return [
      <span key="empty" className="text-sm text-gray-400">
        (empty)
      </span>,
    ];

  const addedSet = new Set(added.map((w) => w.toLowerCase()));
  const removedSet = new Set(removed.map((w) => w.toLowerCase()));

  // Split by whitespace while retaining punctuation attached to words
  // We'll split by spaces and handle each token
  const tokens = text.split(/(\s+)/); // keep spaces

  return tokens.map((tok, i) => {
    // if it's purely whitespace, preserve it
    if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>;

    const plain = tok.replace(/^[^\w]+|[^\w]+$/g, ""); // strip punctuation for matching
    const lower = plain.toLowerCase();

    if (addedSet.has(lower)) {
      return (
        <span
          key={i}
          className="bg-emerald-100 text-emerald-800 px-1 rounded-sm"
        >
          {tok}
        </span>
      );
    }
    if (removedSet.has(lower)) {
      return (
        <span
          key={i}
          className="bg-rose-100 text-rose-800 px-1 rounded-sm line-through"
        >
          {tok}
        </span>
      );
    }

    return <span key={i}>{tok}</span>;
  });
}

export default function VersionEditor() {
  const [content, setContent] = useState("");
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState(null); // version object to preview
  const editorRef = useRef();

  // Fetch versions on mount
  useEffect(() => {
    fetchVersions();
  }, []);

  async function fetchVersions() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/versions`);
      const data = await res.json();
      if (data && data.data) setVersions(data.data);
      else if (Array.isArray(data)) setVersions(data); // support earlier formats
    } catch (err) {
      console.error("Failed to fetch versions:", err);
    } finally {
      setLoading(false);
    }
  }

  // Save current content as a new version
  async function handleSave() {
    // minimal validation
    if (!content || content.trim() === "") return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/save-version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newText: content }),
      });
      const json = await res.json();

    
      const saved =
        (json && (json.data || json.saved || json.savedVersion || json)) ||
        null;

      // Pull version object that contains addedWords/removedWords etc.
      const v = (saved && (saved.data || saved.saved || saved)) || saved;

      // If API responds with nested saved object, normalize:
      let normalized = null;
      if (v && v._id) normalized = v;
      else if (json && json.data && json.data._id) normalized = json.data;
      else normalized = v;

      // Refresh list
      await fetchVersions();

      // show preview of saved version if available
      setSelectedPreview(normalized || json);

      // optional: focus back to editor
      editorRef.current?.focus();
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save version. See console.");
    } finally {
      setSaving(false);
    }
  }

  // Restore: set editor content to chosen version's newText
  function handleRestore(version) {
    if (!version) return;
    setContent(version.newText || version.previousText || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Delete (optional backend support) — if your backend implements delete route.
  async function handleDelete(version) {
    // Confirm
    if (
      !confirm(
        "Delete this version? This cannot be undone (unless backend implements restore)."
      )
    )
      return;
    if (!version || !version._id)
      return alert("This version cannot be deleted (missing id).");

    try {
      const res = await fetch(`${API_BASE}/version/${version._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchVersions();
      } else {
        const txt = await res.text();
        alert("Delete failed: " + txt);
      }
    } catch (err) {
      console.error("Delete error", err);
      alert("Delete failed, check console.");
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="md:col-span-2 bg-white/80 backdrop-blur-xl shadow-xl rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-2xl font-semibold">Content Editor</h1>
            <div className="ml-auto text-sm text-gray-500">
              Versions: {versions.length}
            </div>
          </div>

          <textarea
            ref={editorRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type or paste your content here..."
            className="flex-1 border rounded-lg p-4 min-h-[280px] bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y"
          />

          <div className="mt-4 flex gap-3 items-center">
            <button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className={`px-4 py-2 rounded-lg font-medium shadow-sm transition ${
                !content.trim()
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {saving ? "Saving..." : "Save Version"}
            </button>

            <button
              onClick={() => setContent("")}
              className="px-3 py-2 rounded-lg border hover:bg-slate-50"
            >
              Clear
            </button>

            <button
              onClick={fetchVersions}
              className="ml-auto px-3 py-2 rounded-lg border hover:bg-slate-50"
            >
              Refresh History
            </button>
          </div>
        </div>

        {/* Version history */}
        <div className="bg-white/80 backdrop-blur-xl shadow-xl rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-lg font-medium">Version History</h2>
            <div className="ml-auto text-xs text-gray-500">
              Most recent first
            </div>
          </div>

          <div className="h-[420px] overflow-y-auto space-y-3">
            {loading ? (
              <div className="text-center text-sm text-gray-500 py-6">
                Loading...
              </div>
            ) : versions.length === 0 ? (
              <div className="text-sm text-gray-500 p-4">
                No versions yet. Save your first version!
              </div>
            ) : (
              versions.map((v) => {
                const addedCount = (v.addedWords && v.addedWords.length) || 0;
                const removedCount =
                  (v.removedWords && v.removedWords.length) || 0;
                const ts = v.timestamp
                  ? typeof v.timestamp === "string"
                    ? v.timestamp
                    : new Date(v.timestamp).toLocaleString()
                  : "—";

                return (
                  <div
                    key={v._id || v.id || Math.random()}
                    className="border rounded p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div>
                        <div className="text-sm font-medium">{ts}</div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {(v.newText || v.previousText || "").slice(0, 140)}
                          {(v.newText || v.previousText || "").length > 140
                            ? "…"
                            : ""}
                        </div>
                      </div>

                      <div className="ml-auto flex flex-col items-end gap-2">
                        <div className="text-xs text-gray-600">
                          +{addedCount} / -{removedCount}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedPreview(v);
                              // scroll to preview
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="px-2 py-1 text-sm rounded border hover:bg-slate-50"
                          >
                            View
                          </button>

                          <button
                            onClick={() => handleRestore(v)}
                            className="px-2 py-1 text-sm rounded border hover:bg-slate-50"
                          >
                            Restore
                          </button>

                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(
                                v.newText || v.previousText || ""
                              );
                              alert("Copied to clipboard");
                            }}
                            className="px-2 py-1 text-sm rounded border hover:bg-slate-50"
                          >
                            Copy
                          </button>

                          <button
                            onClick={() => handleDelete(v)}
                            className="px-2 py-1 text-sm rounded text-rose-600 hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 text-xs text-gray-400">
            Versions come from the backend. Make sure your backend is running.
          </div>
        </div>
      </div>

      {/* Preview modal / panel */}
      {selectedPreview && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setSelectedPreview(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 mx-4 overflow-auto max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-lg font-semibold">Version Preview</div>
                <div className="text-sm text-gray-500">
                  {selectedPreview.timestamp
                    ? new Date(selectedPreview.timestamp).toLocaleString()
                    : selectedPreview.timestamp}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleRestore(selectedPreview);
                    setSelectedPreview(null);
                  }}
                  className="px-3 py-1 rounded bg-indigo-600 text-white"
                >
                  Restore into editor
                </button>

                <button
                  onClick={() => setSelectedPreview(null)}
                  className="px-3 py-1 rounded border"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mb-3 text-sm">
              <strong>Added:</strong> {selectedPreview.addedWords?.length || 0}{" "}
              &nbsp;
              <strong>Removed:</strong>{" "}
              {selectedPreview.removedWords?.length || 0}
            </div>

            <pre className="whitespace-pre-wrap text-sm bg-slate-50 rounded p-4 border">
              {highlightText(
                selectedPreview.newText || selectedPreview.previousText || "",
                selectedPreview.addedWords || [],
                selectedPreview.removedWords || []
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

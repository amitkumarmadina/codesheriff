import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function timeAgo(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "just now";

  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function parseInline(text) {
  const parts = text.split(/(`[^`]+`|\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return part;
  });
}

function SimpleMarkdown({ text = "" }) {
  const elements = [];
  const lines = text.split("\n");
  let inCodeBlock = false;
  let codeBlockLines = [];

  lines.forEach((line, index) => {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${index}`}>
            <code>{codeBlockLines.join("\n")}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    if (line.startsWith("## ")) {
      elements.push(<h3 key={index}>{line.replace("## ", "")}</h3>);
      return;
    }

    if (line.startsWith("- ")) {
      elements.push(
        <div className="markdown-bullet" key={index}>
          <span aria-hidden="true">*</span>
          <p>{parseInline(line.replace("- ", ""))}</p>
        </div>
      );
      return;
    }

    if (/^\d+\. /.test(line)) {
      elements.push(
        <p className="markdown-numbered" key={index}>
          {parseInline(line)}
        </p>
      );
      return;
    }

    if (!line.trim()) {
      elements.push(<div className="markdown-space" key={index} />);
      return;
    }

    elements.push(<p key={index}>{parseInline(line)}</p>);
  });

  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <pre key="code-open">
        <code>{codeBlockLines.join("\n")}</code>
      </pre>
    );
  }

  return <div className="markdown">{elements}</div>;
}

export function StatCard({ label, value, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function getReviewFlags(review = "") {
  const bugs = review.split("## Bugs")[1]?.split("##")[0]?.trim() || "";
  const security = review.split("## Security")[1]?.split("##")[0]?.trim() || "";

  return {
    hasBugs: Boolean(bugs) && !bugs.toLowerCase().startsWith("none"),
    hasSecurity: Boolean(security) && !security.toLowerCase().startsWith("none"),
  };
}

export function PRCard({ review, onRate }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(review.rating ?? null);
  const { hasBugs, hasSecurity } = useMemo(() => getReviewFlags(review.review), [review.review]);

  function handleRate(value) {
    const next = rating === value ? null : value;
    setRating(next);
    onRate?.(review._id, next);
  }

  return (
    <article className="pr-card">
      <button className="pr-summary" type="button" onClick={() => setOpen((current) => !current)}>
        <span className="pr-number">#{review.prNumber}</span>
        <span className="pr-title-wrap">
          <span className="pr-title">{review.prTitle || "Untitled pull request"}</span>
          <span className="pr-meta">
            <span>{review.repoName}</span>
            <span>/</span>
            <span>by {review.prAuthor || "unknown"}</span>
            <span>/</span>
            <span>{timeAgo(review.createdAt)}</span>
          </span>
        </span>
        <span className="badges">
          {hasSecurity && <span className="badge danger">Security</span>}
          {hasBugs && <span className="badge warn">Bugs</span>}
          {!hasSecurity && !hasBugs && <span className="badge ok">Clean</span>}
        </span>
        <span className="expand-indicator" aria-hidden="true">
          {open ? "v" : ">"}
        </span>
      </button>

      {open && (
        <div className="pr-details">
          <SimpleMarkdown text={review.review} />

          <div className="feedback-row">
            <div className="rating-actions">
              <span>Was this helpful?</span>
              <button
                className={rating === 1 ? "rating selected positive" : "rating"}
                type="button"
                onClick={() => handleRate(1)}
              >
                Yes
              </button>
              <button
                className={rating === -1 ? "rating selected negative" : "rating"}
                type="button"
                onClick={() => handleRate(-1)}
              >
                No
              </button>
            </div>
            {review.prUrl && review.prUrl !== "#" && (
              <a className="github-link" href={review.prUrl} target="_blank" rel="noreferrer">
                View on GitHub
              </a>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export default function Dashboard() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ totalReviews: 0, totalRepos: 0 });
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const [simRepo, setSimRepo] = useState("acme-org/analytics-service");
  const [simTitle, setSimTitle] = useState("Optimize DB query indexing");
  const [simAuthor, setSimAuthor] = useState("amit-dev");
  const [simDiff, setSimDiff] = useState(`diff --git a/controllers/userController.js b/controllers/userController.js
index 834af12..9a8f4c2 100644
--- a/controllers/userController.js
+++ b/controllers/userController.js
@@ -10,6 +10,12 @@ const getUserProfile = async (req, res) => {
-    const user = await User.findOne({ email: req.params.email });
+    const user = await User.findOne({ email: req.params.email }).hint({ email: 1 }).lean();
     if (!user) {
         return res.status(404).send("User not found");
     }
+    const debugToken = "supersecret123debug";
+    res.setHeader("X-Debug", debugToken);
     res.json(user);
 };`);

  function triggerToast(message, type = "success") {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  }

  const fetchJson = useCallback(async (path, options) => {
    const response = await fetch(`${API_BASE}${path}`, options);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Request failed with ${response.status}`);
    }
    return response.json();
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [reviewData, statsData] = await Promise.all([
        fetchJson("/api/reviews"),
        fetchJson("/api/stats"),
      ]);
      setReviews(reviewData);
      setStats(statsData);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [fetchJson]);

  useEffect(() => {
    // Data loading is intentionally kicked off when the dashboard mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, [fetchDashboardData]);

  async function handleRate(id, rating) {
    const previousReviews = reviews;
    setReviews((current) => current.map((item) => (item._id === id ? { ...item, rating } : item)));

    try {
      await fetchJson(`/api/reviews/${id}/rating`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      triggerToast("Feedback updated");
    } catch {
      setReviews(previousReviews);
      triggerToast("Failed to save feedback", "error");
    }
  }

  async function handleSeed() {
    setLoading(true);
    try {
      await fetchJson("/api/reviews/seed", { method: "POST" });
      triggerToast("Demo reviews loaded");
      await fetchDashboardData();
    } catch {
      triggerToast("Failed to seed data. Is the backend running?", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    if (!window.confirm("Clear all reviews from the database?")) return;

    setLoading(true);
    try {
      await fetchJson("/api/reviews/clear", { method: "POST" });
      setReviews([]);
      setStats({ totalReviews: 0, totalRepos: 0 });
      triggerToast("Database cleared");
    } catch {
      triggerToast("Failed to clear database", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulateSubmit(event) {
    event.preventDefault();
    if (!simDiff.trim()) {
      triggerToast("Diff content is required", "error");
      return;
    }

    setLoading(true);
    triggerToast("Analyzing diff with AI", "info");

    try {
      const newReview = await fetchJson("/api/reviews/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoName: simRepo,
          prNumber: Math.floor(Math.random() * 200) + 1,
          prTitle: simTitle,
          prAuthor: simAuthor,
          prUrl: "#",
          diff: simDiff,
        }),
      });

      setReviews((current) => [newReview, ...current]);
      setStats((current) => ({
        totalReviews: current.totalReviews + 1,
        totalRepos: reviews.some((item) => item.repoName === simRepo)
          ? current.totalRepos
          : current.totalRepos + 1,
      }));
      setSimOpen(false);
      triggerToast("Simulated review created");
    } catch (error) {
      triggerToast(`Simulation failed: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&family=Sora:wght@400;500;600;700&display=swap');

        :root {
          --bg: #0a0c0e;
          --panel: #111419;
          --panel-2: #161a21;
          --border: #202630;
          --fg1: #f0f2f5;
          --fg2: #a3aec0;
          --fg3: #687386;
          --accent: #6ee7b7;
          --accent-soft: rgba(110, 231, 183, 0.09);
          --danger: #f87171;
          --danger-soft: rgba(248, 113, 113, 0.08);
          --warn: #fbbf24;
          --warn-soft: rgba(251, 191, 36, 0.08);
          --ok: #34d399;
          --ok-soft: rgba(52, 211, 153, 0.08);
        }

        * { box-sizing: border-box; }
        body { margin: 0; background: var(--bg); color: var(--fg1); font-family: 'Sora', system-ui, sans-serif; }
        button, input, textarea { font: inherit; }
        button { border: 0; }

        .dashboard { min-height: 100vh; background: var(--bg); padding: 40px 24px; }
        .shell { width: min(960px, 100%); margin: 0 auto; }
        .topbar { display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin-bottom: 32px; }
        .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .brand-mark { width: 36px; height: 36px; border-radius: 8px; display: grid; place-items: center; background: var(--accent-soft); border: 1px solid var(--accent); color: var(--accent); font: 700 12px/1 'DM Mono', monospace; }
        h1 { margin: 0; font-size: 26px; line-height: 1.1; letter-spacing: 0; }
        .subtitle { color: var(--fg3); font-size: 13px; }
        .actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .action-button { border: 1px solid var(--border); border-radius: 8px; background: transparent; color: var(--fg2); cursor: pointer; font-size: 12px; font-weight: 700; padding: 7px 12px; }
        .action-button.primary { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
        .action-button:hover:not(:disabled) { border-color: var(--fg2); color: var(--fg1); }
        .action-button:disabled { cursor: not-allowed; opacity: 0.6; }
        .status-pill { border: 1px solid var(--accent); border-radius: 8px; color: var(--accent); background: var(--accent-soft); display: inline-flex; align-items: center; gap: 7px; font: 600 11px/1 'DM Mono', monospace; padding: 7px 11px; }
        .status-pill.offline { color: var(--danger); background: var(--danger-soft); border-color: var(--danger); }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
        .offline-banner { background: var(--danger-soft); border-bottom: 1px solid var(--danger); color: var(--danger); display: flex; justify-content: center; gap: 8px; padding: 10px 20px; font-size: 13px; font-weight: 600; text-align: center; }
        .stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 28px; }
        .stat-card { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; display: flex; align-items: center; gap: 16px; padding: 18px 20px; box-shadow: 0 4px 18px rgba(0, 0, 0, 0.16); }
        .stat-card:hover { border-color: var(--accent); }
        .stat-icon { width: 42px; height: 42px; border-radius: 8px; display: grid; place-items: center; background: var(--accent-soft); border: 1px solid rgba(110, 231, 183, 0.2); color: var(--accent); font: 700 15px/1 'DM Mono', monospace; }
        .stat-value { color: var(--fg1); font: 700 28px/1 'DM Mono', monospace; }
        .stat-label { color: var(--fg3); font-size: 12px; margin-top: 6px; }
        .sim-panel { border: 1px solid var(--border); border-radius: 8px; background: rgba(17, 20, 25, 0.68); margin-bottom: 28px; padding: 14px 18px; }
        .sim-toggle { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: transparent; color: var(--fg1); cursor: pointer; text-align: left; }
        .sim-title { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; }
        .sim-state { color: var(--fg3); background: var(--border); border-radius: 6px; padding: 3px 8px; font-size: 12px; }
        .sim-form { display: grid; gap: 14px; margin-top: 18px; }
        .field-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        label { display: grid; gap: 6px; color: var(--fg3); font-size: 11px; font-weight: 700; }
        input, textarea { width: 100%; border: 1px solid var(--border); border-radius: 8px; background: #090a0d; color: var(--fg1); padding: 9px 11px; }
        textarea, input.mono { font-family: 'DM Mono', ui-monospace, monospace; font-size: 12px; }
        textarea { min-height: 150px; resize: vertical; line-height: 1.45; }
        .submit-review { border-radius: 8px; background: var(--accent); color: #07100c; cursor: pointer; font-weight: 800; padding: 11px 16px; }
        .submit-review:disabled { cursor: not-allowed; opacity: 0.7; }
        .section-label { display: flex; justify-content: space-between; align-items: center; gap: 12px; color: var(--fg3); font: 700 11px/1 'DM Mono', monospace; letter-spacing: 0; margin-bottom: 14px; text-transform: uppercase; }
        .section-hint { font: 500 10px/1 'Sora', sans-serif; text-transform: none; }
        .empty-state { align-items: center; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; display: grid; gap: 14px; justify-items: center; padding: 42px 24px; text-align: center; }
        .empty-mark { color: var(--accent); font: 700 24px/1 'DM Mono', monospace; }
        .empty-state h3 { margin: 0; font-size: 15px; }
        .empty-state p { color: var(--fg3); font-size: 12px; line-height: 1.55; max-width: 380px; }
        .pr-card { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 12px; overflow: hidden; }
        .pr-card:hover { background: var(--panel-2); }
        .pr-summary { align-items: center; background: transparent; color: inherit; cursor: pointer; display: grid; gap: 14px; grid-template-columns: auto minmax(0, 1fr) auto auto; padding: 16px 18px; text-align: left; width: 100%; }
        .pr-number { background: var(--accent-soft); border: 1px solid rgba(110, 231, 183, 0.2); border-radius: 6px; color: var(--accent); font: 700 12px/1 'DM Mono', monospace; padding: 5px 9px; }
        .pr-title-wrap { min-width: 0; display: grid; gap: 5px; }
        .pr-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; font-weight: 700; }
        .pr-meta { align-items: center; color: var(--fg3); display: flex; flex-wrap: wrap; gap: 6px; font-size: 12px; }
        .pr-meta span:first-child { color: var(--fg2); font-family: 'DM Mono', ui-monospace, monospace; }
        .badges { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
        .badge { border-radius: 5px; font-size: 11px; font-weight: 800; padding: 3px 8px; }
        .badge.danger { background: var(--danger-soft); border: 1px solid rgba(248, 113, 113, 0.2); color: var(--danger); }
        .badge.warn { background: var(--warn-soft); border: 1px solid rgba(251, 191, 36, 0.2); color: var(--warn); }
        .badge.ok { background: var(--ok-soft); border: 1px solid rgba(52, 211, 153, 0.2); color: var(--ok); }
        .expand-indicator { color: var(--fg3); font: 700 14px/1 'DM Mono', monospace; }
        .pr-details { background: rgba(0, 0, 0, 0.12); border-top: 1px solid var(--border); padding: 16px 18px 18px; }
        .markdown { color: var(--fg2); font-size: 13px; line-height: 1.65; }
        .markdown h3 { align-items: center; color: var(--accent); display: flex; font-size: 12px; gap: 7px; margin: 16px 0 6px; text-transform: uppercase; }
        .markdown h3::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        .markdown p { margin: 4px 0; }
        .markdown strong { color: var(--danger); }
        .markdown code { background: #090a0d; border: 1px solid var(--border); border-radius: 4px; color: var(--accent); font: 500 11px/1.2 'DM Mono', ui-monospace, monospace; padding: 2px 5px; }
        .markdown pre { background: #090a0d; border: 1px solid var(--border); border-radius: 8px; margin: 8px 0; overflow-x: auto; padding: 12px 14px; }
        .markdown pre code { background: transparent; border: 0; color: var(--fg1); padding: 0; }
        .markdown-bullet { display: flex; gap: 8px; margin: 4px 0; }
        .markdown-bullet > span { color: var(--accent); flex: 0 0 auto; }
        .markdown-numbered { margin-left: 12px; }
        .markdown-space { height: 6px; }
        .feedback-row { align-items: center; border-top: 1px solid var(--border); display: flex; justify-content: space-between; gap: 14px; margin-top: 16px; padding-top: 14px; }
        .rating-actions { align-items: center; display: flex; gap: 8px; flex-wrap: wrap; color: var(--fg3); font-size: 12px; }
        .rating { background: transparent; border: 1px solid var(--border); border-radius: 8px; color: var(--fg3); cursor: pointer; font-size: 13px; padding: 5px 12px; }
        .rating:hover { color: var(--fg1); border-color: var(--fg2); }
        .rating.selected.positive { background: var(--ok-soft); border-color: var(--ok); color: var(--ok); }
        .rating.selected.negative { background: var(--danger-soft); border-color: var(--danger); color: var(--danger); }
        .github-link { color: var(--accent); font-size: 12px; text-decoration: none; }
        .toast { align-items: center; animation: slideIn 0.22s ease-out; border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 8px; bottom: 24px; box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28); color: #fff; display: flex; gap: 8px; font-size: 13px; font-weight: 700; padding: 12px 18px; position: fixed; right: 24px; z-index: 20; }
        .toast.success { background: rgba(16, 185, 129, 0.95); }
        .toast.info { background: rgba(37, 99, 235, 0.95); }
        .toast.error { background: rgba(220, 38, 38, 0.95); }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

        @media (max-width: 760px) {
          .dashboard { padding: 24px 16px; }
          .stats, .field-grid { grid-template-columns: 1fr; }
          .pr-summary { grid-template-columns: auto minmax(0, 1fr) auto; }
          .badges { grid-column: 2 / 4; justify-content: flex-start; }
          .feedback-row { align-items: flex-start; flex-direction: column; }
          .section-label { align-items: flex-start; flex-direction: column; }
        }
      `}</style>

      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.type === "error" ? "Error:" : toast.type === "info" ? "Info:" : "Done:"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {offline && (
        <div className="offline-banner">
          <span>Warning:</span>
          <span>Backend offline. Make sure the server is running on port 5000.</span>
        </div>
      )}

      <main className="dashboard">
        <div className="shell">
          <header className="topbar">
            <div>
              <div className="brand">
                <div className="brand-mark">CS</div>
                <h1>CodeSheriff</h1>
              </div>
              <p className="subtitle">AI-powered code review and PR monitoring</p>
            </div>

            <div className="actions">
              <button className="action-button primary" type="button" onClick={handleSeed} disabled={loading}>
                Seed Demo
              </button>
              <button className="action-button" type="button" onClick={handleClear} disabled={loading}>
                Clear DB
              </button>
              <span className={offline ? "status-pill offline" : "status-pill"}>
                <span className="status-dot" />
                {offline ? "OFFLINE" : "ONLINE"}
              </span>
            </div>
          </header>

          <section className="stats" aria-label="Dashboard statistics">
            <StatCard label="Total PRs reviewed" value={stats.totalReviews} icon="#" />
            <StatCard label="Repos monitored" value={stats.totalRepos} icon="R" />
          </section>

          <section className="sim-panel">
            <button className="sim-toggle" type="button" onClick={() => setSimOpen((current) => !current)}>
              <span className="sim-title">
                <span aria-hidden="true">+</span>
                Simulate a PR Code Review
              </span>
              <span className="sim-state">{simOpen ? "Collapse" : "Expand"}</span>
            </button>

            {simOpen && (
              <form className="sim-form" onSubmit={handleSimulateSubmit}>
                <div className="field-grid">
                  <label>
                    Repository Name
                    <input className="mono" type="text" value={simRepo} onChange={(event) => setSimRepo(event.target.value)} />
                  </label>
                  <label>
                    PR Title
                    <input type="text" value={simTitle} onChange={(event) => setSimTitle(event.target.value)} />
                  </label>
                  <label>
                    Author Name
                    <input type="text" value={simAuthor} onChange={(event) => setSimAuthor(event.target.value)} />
                  </label>
                </div>

                <label>
                  Git Diff Content
                  <textarea value={simDiff} onChange={(event) => setSimDiff(event.target.value)} />
                </label>

                <button className="submit-review" type="submit" disabled={loading}>
                  {loading ? "Analyzing Diff..." : "Submit Code Review"}
                </button>
              </form>
            )}
          </section>

          <div className="section-label">
            <span>Recent Reviews ({reviews.length})</span>
            {reviews.length > 0 && <span className="section-hint">Click a review to expand details</span>}
          </div>

          {reviews.length === 0 ? (
            <section className="empty-state">
              <span className="empty-mark">CS</span>
              <div>
                <h3>No Code Reviews Yet</h3>
                <p>Use Seed Demo to load template data or paste your own diff in the simulation panel above.</p>
              </div>
              <button className="action-button primary" type="button" onClick={handleSeed} disabled={loading}>
                Seed Template Reviews
              </button>
            </section>
          ) : (
            <section aria-label="Recent reviews">
              {reviews.map((review) => (
                <PRCard key={review._id} review={review} onRate={handleRate} />
              ))}
            </section>
          )}
        </div>
      </main>
    </>
  );
}

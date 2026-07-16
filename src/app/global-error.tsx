"use client";

import { RotateCw } from "lucide-react";

/** Catches errors thrown by the root layout itself, so it must render its
 *  own <html>/<body> — none of the app's providers/CSS are guaranteed to be
 *  mounted at this point, so this stays deliberately minimal/inline. */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Something went wrong
          </h2>
          <p style={{ color: "#666", marginBottom: "1rem", fontSize: "0.875rem" }}>
            The app hit an unexpected error. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              background: "#2563EB",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            <RotateCw size={16} />
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

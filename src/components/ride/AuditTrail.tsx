import type { AuditEntry } from "@/types";

/** Chronological "who did what, when" timeline — owner-only. */
export function AuditTrail({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
    );
  }

  return (
    <ol className="space-y-4">
      {entries.map((entry) => (
        <li key={entry.id} className="relative border-l pl-4">
          <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-foreground" />
          <p className="text-sm font-medium">{entry.action}</p>
          <p
            className="text-xs text-muted-foreground"
            title={entry.changedBy.id}
          >
            {entry.changedBy.role} · {entry.changedBy.id.slice(0, 8)}… ·{" "}
            {new Date(entry.at).toLocaleString("en-IN")}
          </p>
          {Object.keys(entry.changes).length > 0 && (
            <pre className="mt-1 overflow-x-auto rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
              {JSON.stringify(entry.changes, null, 2)}
            </pre>
          )}
        </li>
      ))}
    </ol>
  );
}

"use client";

// Re-mounts on every navigation, so the entrance animation replays on client-side
// route changes, not just hard loads. Kept trivial to stay light.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-in flex flex-1 flex-col">{children}</div>;
}

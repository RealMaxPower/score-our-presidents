"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function LockButton() {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function doLock() {
    startTransition(async () => {
      await fetch("/api/admin/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => undefined);
      // Hard nav so the locked layout re-runs server-side and the cookie
      // clearance is visible to the next request.
      window.location.assign("/admin/unlock");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        className="text-rust-700 hover:text-rust-800 disabled:opacity-50"
      >
        {pending ? "Locking…" : "Lock"}
      </button>
      <ConfirmDialog
        open={confirming}
        title="Lock admin in this browser?"
        description="You'll need to re-enter the admin token to access /admin again."
        confirmLabel="Lock"
        destructive
        pending={pending}
        onConfirm={() => {
          setConfirming(false);
          doLock();
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

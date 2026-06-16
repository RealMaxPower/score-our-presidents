import type { Route } from "next";
import Link from "next/link";
import { UserScoreForm } from "./user-score-form";
import type { SessionUser } from "@/lib/auth";
import { evaluateEligibility } from "@/lib/user-scores";
import { getUserScoreFor } from "@/lib/community-scores";

interface Props {
  presidentId: string;
  subCriterionId: string;
  subCriterionLabel: string;
  presidentDisplayName: string;
  user: SessionUser | null;
}

/**
 * Renders the "Submit your score" affordance with three states:
 *   - anonymous: link to /sign-in
 *   - signed-in but not eligible: faded button + explanation
 *   - eligible: collapsible <details> with the submission form
 */
export async function SubmitScoreAffordance({
  presidentId,
  subCriterionId,
  subCriterionLabel,
  presidentDisplayName,
  user,
}: Props) {
  if (!user) {
    return (
      <Link
        href={"/sign-in" as Route}
        className="inline-flex items-center text-[10px] uppercase tracking-[0.16em] text-rust-700 hover:text-rust-800 underline underline-offset-2"
      >
        Sign in to add your score
      </Link>
    );
  }

  const elig = evaluateEligibility(user);
  if (!elig.eligible) {
    return (
      <div className="inline-flex flex-col items-start gap-1">
        <span className="text-[10px] uppercase tracking-[0.16em] text-stone-400">
          Submission not yet enabled
        </span>
        <span className="text-[11px] text-stone-500 leading-snug max-w-md">
          {elig.reasons.join(" ")}
        </span>
      </div>
    );
  }

  const existing = await getUserScoreFor(user.id, presidentId, subCriterionId);
  const existingForForm = existing
    ? {
        goodScore: existing.goodScore ?? 5,
        harmScore: existing.harmScore ?? 5,
        notes: existing.notes,
        evidence: existing.evidence.map((e) => ({
          sourceUrl: e.sourceUrl ?? "",
          claim: e.claim,
          direction: e.direction as "good" | "harm",
        })),
      }
    : null;

  return (
    <details className="group/submit mt-1">
      <summary className="cursor-pointer list-none inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-rust-700 hover:text-rust-800">
        <span className="group-open/submit:hidden">
          {existing ? "Edit your score →" : "Add your score →"}
        </span>
        <span className="hidden group-open/submit:inline">Cancel ↑</span>
      </summary>
      <UserScoreForm
        presidentId={presidentId}
        subCriterionId={subCriterionId}
        subCriterionLabel={subCriterionLabel}
        presidentDisplayName={presidentDisplayName}
        existing={existingForForm}
      />
    </details>
  );
}

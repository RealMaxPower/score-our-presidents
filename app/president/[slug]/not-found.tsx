import Link from "next/link";

export default function PresidentNotFound() {
  return (
    <div className="text-center py-12">
      <h1 className="font-display text-3xl font-bold mb-3 tracking-tight">
        President not found
      </h1>
      <p className="text-stone-600 mb-6">
        That slug doesn&rsquo;t match any of the 16 modern presidents scored
        here.
      </p>
      <Link
        href="/"
        className="text-rust-700 underline underline-offset-4 hover:text-rust-800"
      >
        Back to all presidents
      </Link>
    </div>
  );
}

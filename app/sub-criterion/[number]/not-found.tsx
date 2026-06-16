import Link from "next/link";

export default function SubCriterionNotFound() {
  return (
    <div className="text-center py-12">
      <h1 className="font-display text-3xl font-bold mb-3 tracking-tight">
        Sub-criterion not found
      </h1>
      <p className="text-stone-600 mb-6">
        That number doesn&rsquo;t match any of the 56 scored sub-criteria.
      </p>
      <Link
        href="/methodology"
        className="text-rust-700 underline underline-offset-4 hover:text-rust-800"
      >
        See all categories
      </Link>
    </div>
  );
}

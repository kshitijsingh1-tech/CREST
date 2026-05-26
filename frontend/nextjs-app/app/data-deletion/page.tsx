import Link from "next/link";

export const metadata = {
  title: "Data Deletion Instructions | CREST",
  description: "Instructions for privacy-related deletion requests for CREST platform data.",
};

const steps = [
  "Submit a deletion or privacy request through the official CREST support or grievance channel used for your complaint.",
  "Include enough information for identification, such as your complaint reference, the contact method used, and the approximate date of submission.",
  "CREST will review the request against operational, fraud prevention, audit, and legal retention requirements before deleting or restricting the requested data.",
  "If deletion is approved, associated platform records will be removed or anonymized to the extent permitted by law and service obligations.",
];

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.28em] text-emerald-300">
            CREST Data Deletion
          </p>
          <h1 className="text-4xl font-black tracking-tight text-white">
            Data Deletion Instructions
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Customers may request deletion review for grievance-related records that were submitted
            to CREST through supported channels, including Instagram integrations, where deletion
            is legally and operationally permitted.
          </p>
        </div>

        <section className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-6 shadow-xl">
          <h2 className="text-lg font-black tracking-wide text-white">How To Request Deletion</h2>
          <ol className="mt-4 space-y-4 text-sm leading-7 text-slate-300">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-xs font-black text-emerald-200">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-6 shadow-xl">
          <h2 className="text-lg font-black tracking-wide text-white">Review Criteria</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Certain records may need to be retained for regulatory, anti-fraud, dispute handling,
            legal defense, or operational audit purposes. In such cases, CREST may deny deletion or
            retain only the minimum information required.
          </p>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/privacy"
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/30 hover:bg-white/5"
          >
            View Privacy Policy
          </Link>
          <Link
            href="/crest_publicPortal"
            className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-300/15"
          >
            Open Public Portal
          </Link>
        </div>
      </div>
    </main>
  );
}

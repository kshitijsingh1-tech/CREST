import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | CREST",
  description: "Privacy policy for the CREST grievance intake and support platform.",
};

const sections = [
  {
    title: "Information We Collect",
    body:
      "CREST may collect complaint content, contact details, message metadata, public support channel identifiers, and operational audit data needed to receive, classify, track, and respond to customer grievances.",
  },
  {
    title: "How We Use Information",
    body:
      "We use submitted information to register complaints, route them to the appropriate support teams, generate tracking references, reply to customers across supported channels, improve service quality, and maintain compliance and security records.",
  },
  {
    title: "Instagram and Meta Integrations",
    body:
      "When a customer contacts CREST through Instagram or other Meta-supported channels, we may process the sender identifier, message text, attachments, and conversation metadata required to provide grievance support and follow-up responses.",
  },
  {
    title: "Retention and Security",
    body:
      "Complaint records and related metadata may be retained for audit, legal, fraud prevention, and service improvement purposes. CREST uses access controls and operational safeguards to limit access to authorized personnel only.",
  },
  {
    title: "Sharing",
    body:
      "Information is shared only with authorized service teams, technology providers, and regulatory or legal stakeholders when required to operate the grievance workflow, satisfy legal obligations, or protect users and systems.",
  },
  {
    title: "Your Choices",
    body:
      "Users may request information about stored grievance records, ask for correction of inaccurate information, or request deletion review where legally and operationally permitted.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10 rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.28em] text-cyan-300">
            CREST Privacy Policy
          </p>
          <h1 className="text-4xl font-black tracking-tight text-white">Privacy Policy</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            This privacy policy describes how CREST processes information submitted through its
            grievance and customer support workflows, including website forms, email, messaging,
            Instagram, and other integrated support channels.
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            Effective date: May 27, 2026
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 shadow-xl"
            >
              <h2 className="text-lg font-black tracking-wide text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{section.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-6 shadow-xl">
          <h2 className="text-lg font-black tracking-wide text-white">Contact</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            For privacy or grievance data requests, contact the CREST support team using the
            official service channels configured for the platform.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/data-deletion"
              className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-300/15"
            >
              Data Deletion Instructions
            </Link>
            <Link
              href="/crest_publicPortal"
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/30 hover:bg-white/5"
            >
              Open Public Portal
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

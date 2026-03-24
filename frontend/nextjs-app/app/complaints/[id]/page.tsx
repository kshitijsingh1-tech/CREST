/**
 * CREST — Complaint Detail Page
 * Server component: pre-fetches complaint, similar, and audit trail.
 * Passes to ComplaintDetail client component for interactive agent actions.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { getComplaint, getSimilarComplaints, getAuditTrail } from "@/lib/api";
import ComplaintDetail from "@/components/complaint/ComplaintDetail";

interface Props { params: { id: string } }

export default async function ComplaintPage({ params }: Props) {
  try {
    const [complaint, similar, audit] = await Promise.all([
      getComplaint(params.id),
      getSimilarComplaints(params.id, 5),
      getAuditTrail(params.id),
    ]);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <header className="bg-white dark:bg-black/95 border-b border-gray-200 dark:border-white/10 px-8 py-4 flex items-center gap-4">
          <Link href="/" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">← Queue</Link>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Complaint <span className="font-mono text-xs text-gray-400 dark:text-gray-500">{params.id.slice(0, 8)}…</span>
          </h1>
        </header>

        <main className="px-8 py-6">
          <ComplaintDetail complaint={complaint} similar={similar} audit={audit} />
        </main>
      </div>
    );
  } catch {
    notFound();
  }
}

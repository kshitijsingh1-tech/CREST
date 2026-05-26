import { redirect } from "next/navigation";
import { getMe } from "@/lib/api";

export default async function CrestRootRedirector() {
  try {
    // Validate officer session first
    await getMe();
  } catch (e) {
    // If not logged in, redirect to login with recovery trigger
    redirect("/ub_CREST/login?recovered=1");
  }

  // Once authenticated, route staff straight to their home dashboard!
  redirect("/ub_CREST/home");
}

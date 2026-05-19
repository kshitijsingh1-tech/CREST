import { redirect } from "next/navigation";
import { getMe } from "@/lib/api";

export default async function CrestRootRedirector() {
  try {
    // Validate officer session first
    await getMe();
  } catch (e) {
    // If not logged in, redirect to login
    redirect("/ub_CREST/login");
  }

  // Once authenticated, route staff straight to their home dashboard!
  redirect("/ub_CREST/home");
}

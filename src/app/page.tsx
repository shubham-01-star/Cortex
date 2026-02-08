import { LandingPageClient } from "@/components/onboarding/LandingPageClient";

export default function Home() {
  // Use NEXT_PUBLIC_ prefix for client-side access
  const apiKey = process.env.NEXT_PUBLIC_TAMBO_API_KEY || "";

  return <LandingPageClient apiKey={apiKey} />;
}

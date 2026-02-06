import { LandingPageClient } from "@/components/onboarding/LandingPageClient";

export default function Home() {
  const apiKey = process.env.TAMBO_API_KEY || "";

  return <LandingPageClient apiKey={apiKey} />;
}

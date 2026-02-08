import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { InviteChat } from "@/components/onboarding/invite-chat";
import { LandingPageClient } from "@/components/onboarding/LandingPageClient";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    // Verify token
    const invitation = await prisma.invitation.findUnique({
        where: { token },
    });

    if (!invitation || invitation.status !== "pending") {
        return (
            <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center text-center p-4">
                <div className="p-4 rounded-full bg-red-500/10 mb-4">
                    <Sparkles className="w-8 h-8 text-red-500 opacity-50" />
                </div>
                <h1 className="text-2xl font-bold text-white">Invalid Invitation</h1>
                <p className="text-zinc-400 mt-2">This link has expired or never existed.</p>
                <Link href="/" className="mt-8 text-indigo-400 hover:text-indigo-300">
                    Return to Home
                </Link>
            </div>
        );
    }

    return (
        <LandingPageClient
            apiKey={process.env.TAMBO_API_KEY || ""} // Should ideally come from env or config
            overlay={
                <InviteChat
                    email={invitation.email}
                    name={invitation.name}
                    role={invitation.role}
                    token={invitation.token}
                />
            }
        />
    );
}

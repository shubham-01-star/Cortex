import { prisma } from "@/server/db/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const formData = await request.formData();
    const token = formData.get("token") as string;

    if (!token) {
        return redirect("/login?error=InvalidToken");
    }

    try {
        // 1. Validate Invite
        const invitation = await prisma.invitation.findUnique({
            where: { token },
        });

        if (!invitation || invitation.status !== "pending") {
            return redirect("/login?error=ExpiredInvite");
        }

        // 2. Create User
        // In a real app, we might ask for password here. 
        // For this flow, we'll auto-create and maybe set a temp password or just a session.
        // Let's assume we just create the user identity.

        // Check if user already exists (maybe they signed up independently?)
        let user = await prisma.user.findUnique({
            where: { email: invitation.email },
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    id: crypto.randomUUID(),
                    name: invitation.email.split("@")[0], // Default name
                    email: invitation.email,
                    emailVerified: true,
                    role: invitation.role,
                    image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${invitation.email}`,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            });
        }

        // 3. Mark Invite as Accepted
        await prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: "accepted" }
        });

        // 4. Create Session (Manual Login)
        const sessionToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

        await prisma.session.create({
            data: {
                id: crypto.randomUUID(),
                userId: user.id,
                token: sessionToken,
                expiresAt,
                createdAt: new Date(),
                updatedAt: new Date(),
                userAgent: "InviteFlow",
                ipAddress: "127.0.0.1"
            }
        });

        // 5. Set Cookie
        (await cookies()).set("session_token", sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            expires: expiresAt
        });

        // 6. Redirect to Dashboard
        return redirect("/dashboard");

    } catch (error) {
        console.error("Invite acceptance failed:", error);
        return redirect("/login?error=ServerError");
    }
}

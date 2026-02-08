"use server";

import { prisma } from "@/server/db/prisma";
import { z } from "zod";
import { sendInvitationEmail } from "@/server/services/mail";
import { config } from "@/lib/config";
import { auth } from "@/server/auth/auth";
import { headers } from "next/headers";

const inviteUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["ADMIN", "DEVELOPER", "VIEWER"]),
  position: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export async function createInvitation(data: InviteUserInput) {
  try {
    const validated = inviteUserSchema.parse(data);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return { success: false, message: "User already exists." };
    }

    // Check if invitation already exists
    // Note: token would usually be unique. Using email as simpler check.
    // Assuming Invitation model doesn't have email as unique constraint but logic implies one active invite.

    // ... inside the function

    // Get current user (inviter)
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Create Invitation
    const invitation = await prisma.invitation.create({
      data: {
        id: crypto.randomUUID(),
        email: validated.email,
        name: validated.name,
        role: validated.role,
        permissions: validated.permissions || [],
        token: crypto.randomUUID(),
        status: "pending",
        inviterId: session?.user?.id,
      },
    });

    // Send Actual Email
    const emailResult = await sendInvitationEmail({
      to: validated.email,
      name: validated.name,
      role: validated.role,
      token: invitation.token,
      position: validated.position,
    });

    const baseUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || config.betterAuth.url;
    const inviteLink = `${baseUrl}/invite/${invitation.token}`;
    console.log("------------------------------------------------------------------");
    console.log("📝 SIMULATION MODE - Invite Link Generated:");
    console.log(`👉 ${inviteLink}`);
    console.log("------------------------------------------------------------------");


    if (!emailResult.success) {
      console.warn(`[Cortex] Email delivery failed, but invitation created:`, emailResult.error);
      return {
        success: true,
        message: `Invitation created. Link logged to console (Simulation Mode).`,
        invitationId: invitation.id
      };
    }

    return {
      success: true,
      message: `Invitation sent to ${validated.email}`,
      invitationId: invitation.id
    };
  } catch (error) {
    console.error("Invite failed:", error);
    return { success: false, message: error instanceof Error ? error.message : "Failed to invite." };
  }
}

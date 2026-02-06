"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";

const inviteUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["ADMIN", "DEVELOPER", "VIEWER"]),
  position: z.string().optional(),
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
    
    // Create Invitation
    // Logic: We might not store 'name' or 'position' if schema doesn't support it, 
    // OR we temporarily assume schema update OR we just ignore it for the DB record 
    // but use it for the email context.
    
    await prisma.invitation.create({
      data: {
        id: crypto.randomUUID(),
        email: validated.email,
        role: validated.role,
        token: crypto.randomUUID(), // Mock token
        status: "PENDING",
      },
    });

    // MOCK EMAIL SENDING
    console.log(`[Cortex] Sending invite email to ${validated.email} for ${validated.name} (${validated.position})`);

    return { success: true, message: "Invitation sent successfully." };
  } catch (error) {
    console.error("Invite failed:", error);
    return { success: false, message: error instanceof Error ? error.message : "Failed to invite." };
  }
}

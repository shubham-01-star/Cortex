"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";

const inviteUserInput = z.object({
    email: z.string().email(),
    role: z.enum(["ADMIN", "DEVELOPER", "VIEWER"]),
});

export type InviteUserInput = z.infer<typeof inviteUserInput>;

/**
 * Invites a user to the team.
 * Creates an invitation record in the database.
 * In production, this would send an email.
 */
export async function inviteUser(params: InviteUserInput) {
    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: params.email },
        });

        if (existingUser) {
            return {
                success: false,
                message: `User with email ${params.email} already exists`,
            };
        }

        // Check if invitation already exists
        const existingInvite = await prisma.invitation.findFirst({
            where: {
                email: params.email,
                status: "pending",
            },
        });

        if (existingInvite) {
            return {
                success: false,
                message: `Invitation already sent to ${params.email}`,
            };
        }

        // Create invitation
        const token = crypto.randomUUID();
        const invitation = await prisma.invitation.create({
            data: {
                id: crypto.randomUUID(),
                email: params.email,
                role: params.role,
                token,
                status: "pending",
            },
        });

        // In production, send email here
        const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/invite/${token}`;

        return {
            success: true,
            message: `Invitation sent to ${params.email}`,
            invitation: {
                email: invitation.email,
                role: invitation.role,
                link: inviteLink,
            },
        };
    } catch (error) {
        console.error("Failed to invite user:", error);
        return {
            success: false,
            message: "Failed to send invitation",
        };
    }
}

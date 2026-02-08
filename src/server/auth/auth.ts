import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/server/db/prisma";
import { config, env } from "@/lib/config";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: config.betterAuth.secret,
  baseURL: config.betterAuth.url,
  trustedOrigins: config.betterAuth.trustedOrigins,
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
      },
      initRole: {
        type: "string",
        required: false,
        input: true,
      },
      invitedById: {
        type: "string",
        required: false,
        input: false,
      },
      permissions: {
        type: "string[]",
        required: false,
        input: false,
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const { initRole, email, ...rest } = user;

          // Check for pending invitation
          const invitation = await prisma.invitation.findFirst({
            where: {
              email: email as string,
              status: "pending"
            }
          });

          // Handle Invitation
          if (invitation) {
            // Mark as accepted
            await prisma.invitation.update({
              where: { id: invitation.id },
              data: { status: "accepted" }
            });

            return {
              data: {
                ...rest,
                email,
                role: "user", // Invited users are always standard 'user' role
                permissions: invitation.permissions, // But they get CRUD permissions from invitation
                emailVerified: true,
                invitedById: invitation.inviterId,
              }
            }
          }

          // Normal Signup
          return {
            data: {
              ...rest,
              email,
              role: initRole || "admin",
              permissions: initRole === "admin" ? ["READ", "WRITE", "DELETE", "EXECUTE"] : [], // Fallback for admins
            },
          };
        },
      },
    },
  },
  plugins: [admin()],
  emailAndPassword: {
    enabled: true,
    async sendResetPassword(data) {
      const { sendPasswordResetEmail } = await import("@/server/services/mail");
      await sendPasswordResetEmail({
        to: data.user.email,
        name: data.user.name || "User",
        url: data.url
      });
    },
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID || "",
      clientSecret: env.GOOGLE_CLIENT_SECRET || "",
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID || "",
      clientSecret: env.GITHUB_CLIENT_SECRET || "",
    },
  },
});

export type Auth = typeof auth;

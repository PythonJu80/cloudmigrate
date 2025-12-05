import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { compare } from "bcryptjs";
import { prisma } from "./db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      isSuperuser: boolean;
      tenantId: string;
      tenantName: string;
      tenantSlug: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    isSuperuser: boolean;
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: string;
    isSuperuser: boolean;
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Email/Password
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true },
        });

        if (!user) {
          throw new Error("User not found");
        }

        const isValid = await compare(credentials.password, user.passwordHash);

        if (!isValid) {
          throw new Error("Invalid password");
        }

        // Check if email is verified
        if (!user.emailVerified) {
          throw new Error("Please verify your email before signing in");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || "",
          role: user.role,
          isSuperuser: user.isSuperuser,
          tenantId: user.tenantId,
          tenantName: user.tenant.name,
          tenantSlug: user.tenant.slug,
        };
      },
    }),
    // Google OAuth
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: "select_account",
              },
            },
          }),
        ]
      : []),
    // Microsoft OAuth (Azure AD)
    ...(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
      ? [
          AzureADProvider({
            clientId: process.env.MICROSOFT_CLIENT_ID,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
            tenantId: process.env.MICROSOFT_TENANT_ID || "common",
            authorization: {
              params: {
                prompt: "select_account",
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, create user and tenant if they don't exist
      if (account?.provider === "google" || account?.provider === "azure-ad") {
        const email = user.email;
        if (!email) return false;

        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!existingUser) {
          // Create tenant and user for OAuth sign-up
          const slug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-");
          const tenant = await prisma.tenant.create({
            data: {
              name: user.name || email.split("@")[0],
              slug: `${slug}-${Date.now()}`,
            },
          });

          await prisma.user.create({
            data: {
              email,
              name: user.name || "",
              passwordHash: "", // No password for OAuth users
              role: "ADMIN",
              tenantId: tenant.id,
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // For OAuth sign-in, fetch user data from DB
      if (account?.provider === "google" || account?.provider === "azure-ad") {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
          include: { tenant: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.email = dbUser.email;
          token.name = dbUser.name || "";
          token.role = dbUser.role;
          token.isSuperuser = dbUser.isSuperuser;
          token.tenantId = dbUser.tenantId;
          token.tenantName = dbUser.tenant.name;
          token.tenantSlug = dbUser.tenant.slug;
        }
      } else if (user) {
        // For credentials provider
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.isSuperuser = user.isSuperuser;
        token.tenantId = user.tenantId;
        token.tenantName = user.tenantName;
        token.tenantSlug = user.tenantSlug;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        name: token.name,
        role: token.role,
        isSuperuser: token.isSuperuser,
        tenantId: token.tenantId,
        tenantName: token.tenantName,
        tenantSlug: token.tenantSlug,
      };
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

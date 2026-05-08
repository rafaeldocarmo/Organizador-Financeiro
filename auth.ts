import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const LEGACY_USER_ID = process.env.DEV_USER_ID;

async function claimLegacyData(targetUserId: string) {
  if (!LEGACY_USER_ID || LEGACY_USER_ID === targetUserId) return;
  const legacy = await prisma.user.findUnique({ where: { id: LEGACY_USER_ID } });
  if (!legacy) return;

  await prisma.$transaction([
    prisma.transaction.updateMany({   where: { userId: LEGACY_USER_ID }, data: { userId: targetUserId } }),
    prisma.fixedExpense.updateMany({  where: { userId: LEGACY_USER_ID }, data: { userId: targetUserId } }),
    prisma.installment.updateMany({   where: { userId: LEGACY_USER_ID }, data: { userId: targetUserId } }),
    prisma.investment.updateMany({    where: { userId: LEGACY_USER_ID }, data: { userId: targetUserId } }),
    prisma.budget.updateMany({        where: { userId: LEGACY_USER_ID }, data: { userId: targetUserId } }),
    prisma.month.updateMany({         where: { userId: LEGACY_USER_ID }, data: { userId: targetUserId } }),
    prisma.category.updateMany({      where: { userId: LEGACY_USER_ID }, data: { userId: targetUserId } }),
    prisma.user.delete({ where: { id: LEGACY_USER_ID } }),
  ]);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  events: {
    // Runs on every successful sign-in. claimLegacyData is idempotent —
    // once the legacy user is deleted, this becomes a no-op.
    async signIn({ user }) {
      if (!user.id) return;
      try { await claimLegacyData(user.id); } catch (e) { console.error("claimLegacyData failed:", e); }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

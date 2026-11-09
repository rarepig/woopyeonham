import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";

const hasGoogle = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

function upsertUser(data: { email: string; googleId?: string; isDemo?: boolean }) {
  const existing = db.select().from(schema.users).where(eq(schema.users.email, data.email)).get();
  if (existing) {
    if (data.googleId && existing.googleId !== data.googleId)
      db.update(schema.users).set({ googleId: data.googleId }).where(eq(schema.users.id, existing.id)).run();
    return existing;
  }
  return db.insert(schema.users)
    .values({ email: data.email, googleId: data.googleId ?? null, isDemo: data.isDemo ?? false })
    .returning().get();
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    ...(hasGoogle
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
              params: {
                scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly",
                access_type: "offline",
                prompt: "consent",
              },
            },
          }),
        ]
      : []),
    CredentialsProvider({
      id: "demo",
      name: "데모 체험",
      credentials: {},
      async authorize() {
        const user = upsertUser({ email: "demo@example.com", isDemo: true });
        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // 최초 로그인 시점에만 account가 존재한다.
      if (account?.provider === "google" && profile?.email) {
        const dbUser = upsertUser({ email: profile.email, googleId: account.providerAccountId });
        if (account.refresh_token) {
          db.insert(schema.oauthTokens)
            .values({ userId: dbUser.id, refreshToken: account.refresh_token, scope: account.scope ?? null })
            .onConflictDoUpdate({
              target: schema.oauthTokens.userId,
              set: { refreshToken: account.refresh_token, scope: account.scope ?? null, updatedAt: new Date() },
            })
            .run();
        }
        token.userId = dbUser.id;
      }
      if (account?.provider === "demo" && user) token.userId = (user as any).id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).id = token.userId as string;
      return session;
    },
  },
};

export async function requireUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return ((session?.user as any)?.id as string) ?? null;
}

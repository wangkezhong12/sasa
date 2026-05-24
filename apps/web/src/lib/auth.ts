import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const SERVER_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const res = await fetch(`${SERVER_URL}/auth/login`, {
          method: 'POST',
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) return null;

        const data = await res.json();
        if (data.accessToken) {
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            token: data.accessToken,
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.token;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      if (session.user) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});

export { handler as GET, handler as POST };
export const { signIn, signOut, auth } = handler;

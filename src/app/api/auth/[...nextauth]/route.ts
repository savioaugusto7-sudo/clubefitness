import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/utils/dbConnect';
import User from '@/models/User';
import Client from '@/models/Client';
import Professional from '@/models/Professional';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'select_account',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    }),
    ...(process.env.NODE_ENV === 'development' ? [
      CredentialsProvider({
        id: 'demo-credentials',
        name: 'Demo Credentials',
        credentials: {
          email: { label: "Email", type: "text" }
        },
        async authorize(credentials) {
          if (!credentials?.email) return null;
          try {
            await dbConnect();
            const dbUser = await User.findOne({ email: credentials.email.toLowerCase() });
            if (dbUser) {
              return {
                id: dbUser._id.toString(),
                name: dbUser.nome,
                email: dbUser.email,
                image: null
              };
            }
          } catch (err) {
            console.error('NextAuth authorize error:', err);
          }
          return null;
        }
      })
    ] : [])
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      
      // If logging in via demo credentials, allow immediately (assumes user already exists)
      if (account?.provider === 'demo-credentials') {
        return true;
      }

      try {
        await dbConnect();
        let dbUser = await User.findOne({ email: user.email.toLowerCase() });
        if (!dbUser) {
          // Auto-register new OAuth users as clients by default
          dbUser = await User.create({
            nome: user.name || 'Novo Aluno',
            email: user.email.toLowerCase(),
            tipo: 'client'
          });

          await Client.create({
            userId: dbUser._id,
            cadastroConcluido: false,
            dadosPessoais: {
              nome: dbUser.nome,
              email: dbUser.email,
              nacionalidade: 'brasileiro(a)',
              estadoCivil: 'solteiro(a)',
              profissao: ''
            },
            dadosClinicos: {
              lesoes: '',
              restricoes: '',
              medicamentos: '',
              historicoClinico: '',
              observacoes: ''
            },
            dadosComerciais: {
              status: 'pendente',
              frequencia: 0,
              parcelas: 1,
              creditosTotal: 0,
              creditosUsados: 0,
              creditosReservados: 0,
              creditosMassagemTotal: 0,
              creditosMassagemUsados: 0,
              creditosMassagemReservados: 0,
              descontoValor: 0,
              descontoTipo: 'percentual',
              duracao: 'mensal',
              formaPagamento: 'pix'
            }
          });
        }
        return true;
      } catch (err) {
        console.error('NextAuth signIn callback error:', err);
        return false;
      }
    },
    async jwt({ token }) {
      if (token.email) {
        try {
          await dbConnect();
          const dbUser = await User.findOne({ email: token.email.toLowerCase() });
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.role = dbUser.tipo;
            token.cargo = dbUser.cargo || '';
            let roles = dbUser.roles && dbUser.roles.length > 0 ? dbUser.roles : [dbUser.tipo];
            if (!roles.includes(dbUser.tipo)) {
              roles = [dbUser.tipo, ...roles];
            }
            token.activeRoles = roles;
            
            const [clientProfile, profProfile] = await Promise.all([
              Client.findOne({ userId: dbUser._id }),
              Professional.findOne({ userId: dbUser._id })
            ]);

            if (clientProfile) {
              token.clientProfileId = clientProfile._id.toString();
              token.cadastroConcluido = clientProfile.cadastroConcluido === true;
            }
            if (profProfile) {
              token.professionalProfileId = profProfile._id.toString();
            }

            token.profileId = token.clientProfileId || token.professionalProfileId || '';
          }
        } catch (err) {
          console.error('NextAuth jwt callback error:', err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).cargo = token.cargo;
        (session.user as any).profileId = token.profileId;
        (session.user as any).clientProfileId = token.clientProfileId || '';
        (session.user as any).professionalProfileId = token.professionalProfileId || '';
        (session.user as any).activeRoles = token.activeRoles || [token.role];
        (session.user as any).cadastroConcluido = token.cadastroConcluido;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

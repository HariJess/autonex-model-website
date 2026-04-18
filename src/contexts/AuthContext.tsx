import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  role: string;
  full_name: string | null;
  phone: string | null;
  agency_id: string | null;
}

/**
 * Passed to `signUp` → Supabase `raw_user_meta_data` (see `handle_new_user` migration).
 * Agence : `commercial_contact_name` est la source attendue pour le nom affiché du profil ;
 * `full_name` doit être identique (le trigger privilégie `commercial_contact_name` si présent).
 */
export interface SignUpMetadata {
  full_name: string;
  role: "particulier" | "agence";
  phone: string;
  first_name?: string;
  last_name?: string;
  whatsapp_phone?: string;
  contact_consent?: boolean;
  agency_name?: string;
  agency_address?: string;
  commercial_contact_name?: string;
  nif?: string;
  stat?: string;
  reg_commerce?: string;
  agency_logo_url?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  /** True when profile.role is `admin` (server still enforces RPC permissions). */
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  /** OAuth Google — réservé au parcours particulier (profil `particulier`, pas d’agence). */
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata: SignUpMetadata) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, role, full_name, phone, agency_id")
      .eq("id", userId)
      .single();
    if (data) {
      setProfile(data as Profile);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, metadata: SignUpMetadata) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: metadata.full_name,
          role: metadata.role,
          phone: metadata.phone,
          first_name: metadata.first_name,
          last_name: metadata.last_name,
          whatsapp_phone: metadata.whatsapp_phone,
          contact_consent: metadata.contact_consent,
          agency_name: metadata.agency_name,
          agency_address: metadata.agency_address,
          commercial_contact_name: metadata.commercial_contact_name,
          nif: metadata.nif,
          stat: metadata.stat,
          reg_commerce: metadata.reg_commerce,
          agency_logo_url: metadata.agency_logo_url,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const isAdmin = profile?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        loading,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

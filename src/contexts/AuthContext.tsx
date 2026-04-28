import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  /**
   * True until the first bootstrap completes: session resolved from `getSession` and,
   * if a user exists, profile row loaded (or confirmed absent). Subsequent auth events
   * update session/profile without flipping this flag back to true (avoid full-page flicker).
   */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  /** OAuth Google — réservé au parcours particulier (profil `particulier`, pas d’agence). */
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  /** OAuth Facebook — réservé au parcours particulier, même contrat que `signInWithGoogle`. */
  signInWithFacebook: () => Promise<{ error: Error | null }>;
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

  /** Monotonic generation so an older profile response cannot overwrite a newer user. */
  const profileFetchGenerationRef = useRef(0);
  /** Latest user id tied to in-flight profile fetch (for stale checks after await). */
  const profileTargetUserIdRef = useRef<string | null>(null);
  /** Last user id applied from session; when it changes, clear profile to avoid showing the previous account. */
  const lastSessionUserIdRef = useRef<string | null>(null);
  /** Mirrors `user` for callbacks that must not capture stale React state. */
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const applySessionTokens = useCallback((next: Session | null) => {
    const nextUserId = next?.user?.id ?? null;
    if (nextUserId !== lastSessionUserIdRef.current) {
      lastSessionUserIdRef.current = nextUserId;
      setProfile(null);
    }
    setSession(next);
    setUser(next?.user ?? null);
  }, []);

  /**
   * Loads profile for `userId`, or clears profile when `userId` is null.
   * Drops stale responses when auth changes mid-flight.
   */
  const loadProfileForUser = useCallback(async (userId: string | null) => {
    const generation = ++profileFetchGenerationRef.current;
    profileTargetUserIdRef.current = userId;

    if (!userId) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, full_name, phone, agency_id")
      .eq("id", userId)
      .maybeSingle();

    if (generation !== profileFetchGenerationRef.current) return;
    if (profileTargetUserIdRef.current !== userId) return;

    if (error) {
      console.warn("[AuthProvider] profile fetch failed:", error.message);
      setProfile(null);
      return;
    }

    setProfile(data as Profile | null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const uid = userRef.current?.id ?? null;
    if (!uid) return;
    await loadProfileForUser(uid);
  }, [loadProfileForUser]);

  useEffect(() => {
    let cancelled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled) return;

      applySessionTokens(nextSession);

      // Token rotation only: session object updates, same logical user — avoid extra profile round-trip.
      if (event === "TOKEN_REFRESHED") {
        return;
      }

      // Initial session is applied once via `getSession()` below; handling it again here
      // duplicates work and races profile loading.
      if (event === "INITIAL_SESSION") {
        return;
      }

      // Defer Supabase data calls out of the auth callback to avoid documented deadlocks.
      queueMicrotask(() => {
        if (cancelled) return;
        void loadProfileForUser(nextSession?.user?.id ?? null);
      });
    });

    void (async () => {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      applySessionTokens(initialSession);
      await loadProfileForUser(initialSession?.user?.id ?? null);
      if (!cancelled) {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [applySessionTokens, loadProfileForUser]);

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

  const signInWithFacebook = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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
    profileFetchGenerationRef.current += 1;
    profileTargetUserIdRef.current = null;
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
        signInWithFacebook,
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

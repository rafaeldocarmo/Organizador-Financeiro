import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import Logo from "@/components/ui/logo";

interface PageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  if (session?.user) redirect(callbackUrl || "/");

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 24, gap: 32,
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <Logo size={36} />
        <div className="serif" style={{ fontSize: 38, lineHeight: 1, letterSpacing: "-0.02em" }}>
          Mira Finance
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", maxWidth: 280 }}>
          Seu controle financeiro pessoal. Entre com sua conta Google para começar.
        </div>
      </div>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: callbackUrl || "/" });
        }}
        style={{ width: "100%", maxWidth: 320 }}
      >
        <button type="submit" style={{
          width: "100%", height: 52, borderRadius: 16,
          background: "var(--lime)", color: "oklch(0.13 0.01 95)",
          fontSize: 15, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          border: "none",
        }}>
          <GoogleMark /> Entrar com Google
        </button>
      </form>

      <div style={{ fontSize: 11, color: "var(--subtle)", textAlign: "center" }}>
        Ao entrar você aceita os termos e a política de privacidade do app.
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09a6.97 6.97 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NUV_LOGO_URL } from "@/lib/brand";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar no Nuv" },
      { name: "description", content: "Entre no Nuv para acessar suas conversas, chamadas e contatos." },
      { property: "og:title", content: "Entrar no Nuv" },
      { property: "og:description", content: "Acesse suas conversas no Nuv." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/" });
  }, [session, navigate]);

  if (loading) return null;
  if (session) return <Navigate to="/" />;

  const signIn = async () => {
    if (!email.trim() || !password) return toast.error("Informe e-mail e senha");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo de volta ao Nuv");
  };

  const signUp = async () => {
    if (!name.trim()) return toast.error("Informe seu nome");
    if (!email.trim() || password.length < 6) return toast.error("Use um e-mail válido e uma senha com pelo menos 6 caracteres");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() } },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(data.session ? "Conta criada. Bem-vindo ao Nuv!" : "Conta criada. Verifique seu e-mail para continuar.");
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    setBusy(false);
    if (result.error) toast.error("Não foi possível entrar com Google");
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src={NUV_LOGO_URL} alt="Nuv" className="mx-auto h-24 w-24 object-contain" />
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Nuv</h1>
          <p className="mt-1 text-sm text-muted-foreground">Suas conversas, simples e seguras.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="signin">Entrar</TabsTrigger><TabsTrigger value="signup">Criar conta</TabsTrigger></TabsList>
            <TabsContent value="signin" className="mt-5">
              <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void signIn(); }}>
                <div className="space-y-1.5"><Label htmlFor="signin-email">E-mail</Label><Input id="signin-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="signin-password">Senha</Label><Input id="signin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div>
                <Button type="submit" disabled={busy} className="w-full">Entrar</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="mt-5">
              <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void signUp(); }}>
                <div className="space-y-1.5"><Label htmlFor="signup-name">Nome</Label><Input id="signup-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="signup-email">E-mail</Label><Input id="signup-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="signup-password">Senha</Label><Input id="signup-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" /></div>
                <Button type="submit" disabled={busy} className="w-full">Criar conta</Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div>
          <Button variant="outline" onClick={google} disabled={busy} className="w-full">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuar com Google
          </Button>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">Ao continuar, você acessa sua conta pessoal do Nuv.</p>
      </div>
    </main>
  );
}

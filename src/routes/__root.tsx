import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import { initStore } from "@/lib/store";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="glass-strong max-w-md rounded-3xl p-10 text-center">
        <h1 className="font-display text-6xl text-navy">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Página não encontrada.</p>
        <Link to="/" className="btn-navy mt-6 inline-flex rounded-xl px-5 py-2 text-sm">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="glass-strong max-w-md rounded-3xl p-10 text-center">
        <h1 className="font-display text-2xl text-navy">Ocorreu um erro</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tente novamente ou volte ao início.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="btn-navy rounded-xl px-4 py-2 text-sm">
            Tentar de novo
          </button>
          <a href="/" className="rounded-xl border border-border bg-white/70 px-4 py-2 text-sm">Início</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AGD Eventos · Reserva de Eventos em Angola" },
      { name: "description", content: "AGD Eventos — Cultura, Organização e Excelência. Reserve o seu evento em Angola com pacotes Prata e Ouro." },
      { property: "og:title", content: "AGD Eventos · Reserva de Eventos em Angola" },
      { name: "twitter:title", content: "AGD Eventos · Reserva de Eventos em Angola" },
      { property: "og:description", content: "AGD Eventos — Cultura, Organização e Excelência. Reserve o seu evento em Angola com pacotes Prata e Ouro." },
      { name: "twitter:description", content: "AGD Eventos — Cultura, Organização e Excelência. Reserve o seu evento em Angola com pacotes Prata e Ouro." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/W1KMFsN8JVWKdSNpxNOXuNOZwPU2/social-images/social-1779899586159-IMG-20260520-WA0002.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/W1KMFsN8JVWKdSNpxNOXuNOZwPU2/social-images/social-1779899586159-IMG-20260520-WA0002.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&family=Cormorant+Garamond:wght@500;700&family=Bebas+Neue&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => { initStore(); }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <Header />
      <Toaster position="top-right" richColors />
      <Outlet />
      <footer className="mx-auto mt-16 w-[min(1200px,95%)] pb-10">
        <div className="glass rounded-2xl p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <div className="font-display text-xl text-navy">AGD Eventos</div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Cultura · Organização · Excelência
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Organização e gestão de eventos culturais, sociais e corporativos.
                NIF: 5121045166
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-navy">Espaço</div>
              <p className="mt-2 text-xs text-muted-foreground">
                Anfiteatro do Gabinete Provincial da Cultura e Turismo do Huambo<br />
                Cidade Alta — Avenida Imaculada da Conceição<br />
                Província do Huambo, Angola
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-navy">Contactos</div>
              <p className="mt-2 text-xs text-muted-foreground">
                Seg–Sex · 08h00 às 16h00<br />
                📞 925 788 112<br />
                📞 955 788 112
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-white/40 pt-4 text-center text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} AGD Eventos · Gestão terceirizada do espaço pelo Gabinete Provincial da Cultura e Turismo do Huambo
          </div>
        </div>
      </footer>
    </QueryClientProvider>
  );
}

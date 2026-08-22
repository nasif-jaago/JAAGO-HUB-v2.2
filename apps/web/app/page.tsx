export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="w-full max-w-2xl p-8 rounded-2xl border border-border bg-card shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center font-bold text-primary-foreground text-xl shadow-md">
              J
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">JAAGO HUB</h1>
              <p className="text-sm text-muted-foreground">Version 2.2 — Modular Enterprise ERP</p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-brand">
            Phase 0 Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Architecture</div>
            <div className="text-base font-semibold text-foreground">Odoo-Class Monorepo</div>
            <div className="text-xs text-muted-foreground">Next.js 15 + Node 22 + Drizzle</div>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Observability</div>
            <div className="text-base font-semibold text-foreground">Pino + OpenTelemetry</div>
            <div className="text-xs text-muted-foreground">AsyncLocalStorage Trace IDs</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">System Probes</div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/sign-in"
              className="inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-brand-strong transition"
            >
              Sign In Screen &rarr;
            </a>
            <a
              href="/dashboard"
              className="inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-lg bg-surface border border-primary/40 text-primary hover:bg-card transition"
            >
              ERP Dashboard &rarr;
            </a>
            <a
              href="/health/live"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary transition text-foreground"
            >
              GET /health/live
            </a>
            <a
              href="/health/ready"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary transition text-foreground"
            >
              GET /health/ready
            </a>
            <a
              href="/api/v1"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-xs px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary transition text-foreground"
            >
              GET /api/v1
            </a>
          </div>
        </div>

        <div className="text-xs text-center text-muted-foreground pt-2">
          JAAGO Foundation Bangladesh &bull; Asia/Dhaka &bull; BDT Currency
        </div>
      </div>
    </main>
  );
}

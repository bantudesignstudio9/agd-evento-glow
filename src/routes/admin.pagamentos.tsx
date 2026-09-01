import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store } from "@/lib/store";
import { useStoreVersion } from "@/hooks/useStore";
import type { ConfigPagamento } from "@/lib/types";
import { Save, Landmark } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pagamentos")({
  component: AdminPagamentos,
});

function AdminPagamentos() {
  useStoreVersion();
  const cfg = Store.configPagamento();
  const [form, setForm] = useState<ConfigPagamento>(cfg);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(cfg); }, [cfg.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function guardar() {
    setSaving(true);
    try {
      await Store.atualizarConfigPagamento(form);
      toast.success("Dados de pagamento actualizados");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl text-navy">Dados de pagamento</h1>
        <p className="text-sm text-muted-foreground">Estes dados são mostrados ao cliente no passo de pagamento.</p>
      </div>

      <div className="glass-strong max-w-xl space-y-3 rounded-3xl p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-navy">
          <Landmark className="h-4 w-4 text-accent" /> Transferência bancária
        </div>
        <Field label="IBAN" v={form.iban} on={(v) => setForm({ ...form, iban: v })} />
        <Field label="Titular" v={form.titular} on={(v) => setForm({ ...form, titular: v })} />
        <Field label="Banco" v={form.banco} on={(v) => setForm({ ...form, banco: v })} />

        <div className="pt-2 text-sm font-medium text-navy">Multicaixa Express</div>
        <Field label="Número Express" v={form.express_numero} on={(v) => setForm({ ...form, express_numero: v })} />

        <div className="pt-2 text-sm font-medium text-navy">Instruções ao cliente</div>
        <textarea
          value={form.instrucoes}
          onChange={(e) => setForm({ ...form, instrucoes: e.target.value })}
          rows={3}
          className="w-full rounded-xl border border-border bg-white/80 px-3 py-2 text-sm outline-none"
        />

        <button
          onClick={guardar}
          disabled={saving}
          className="btn-navy inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? "A guardar…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        value={v}
        onChange={(e) => on(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-white/80 px-3 py-2 text-sm outline-none"
      />
    </label>
  );
}

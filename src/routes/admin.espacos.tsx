import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Store } from "@/lib/store";
import { useStoreVersion } from "@/hooks/useStore";
import type { Espaco } from "@/lib/types";
import { Building2, Plus, Trash2, MapPin, Save, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/espacos")({
  component: EspacosPage,
});

function EspacosPage() {
  useStoreVersion();
  const espacos = Store.espacos();
  const [criando, setCriando] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Operação</div>
          <h1 className="font-display text-3xl text-navy">Espaços</h1>
          <p className="text-sm text-muted-foreground">Gerir múltiplos locais onde a AGD opera eventos.</p>
        </div>
        <button onClick={() => setCriando(true)} className="btn-navy inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm">
          <Plus className="h-4 w-4" /> Novo espaço
        </button>
      </div>

      {criando && <EspacoEditor onCancel={() => setCriando(false)} onSave={() => setCriando(false)} />}

      <div className="grid gap-4 md:grid-cols-2">
        {espacos.map((e) => <EspacoCard key={e.id} espaco={e} />)}
        {espacos.length === 0 && !criando && (
          <div className="glass-strong rounded-3xl p-10 text-center text-sm text-muted-foreground md:col-span-2">
            Sem espaços. Crie o primeiro acima.
          </div>
        )}
      </div>
    </div>
  );
}

function EspacoCard({ espaco }: { espaco: Espaco }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <EspacoEditor inicial={espaco} onCancel={() => setEditing(false)} onSave={() => setEditing(false)} />;
  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-accent" />
            <div className="font-display text-lg text-navy">{espaco.nome}</div>
            {!espaco.ativo && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">inativo</span>}
          </div>
          <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{espaco.endereco}</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">Capacidade: {espaco.capacidade} pessoas</div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setEditing(true)} className="rounded-md bg-white/60 px-2 py-1 text-xs">Editar</button>
          <button
            onClick={() => {
              if (confirm(`Remover "${espaco.nome}"?`)) Store.removerEspaco(espaco.id).then(() => toast.success("Espaço removido"));
            }}
            className="rounded-md p-1 text-muted-foreground hover:text-destructive"
          ><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

function EspacoEditor({
  inicial, onCancel, onSave,
}: { inicial?: Espaco; onCancel: () => void; onSave: () => void }) {
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [endereco, setEndereco] = useState(inicial?.endereco ?? "");
  const [capacidade, setCapacidade] = useState(String(inicial?.capacidade ?? 150));
  const [lat, setLat] = useState(inicial?.lat?.toString() ?? "");
  const [lng, setLng] = useState(inicial?.lng?.toString() ?? "");
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true);
  const [saving, setSaving] = useState(false);

  async function salvar() {
    if (!nome.trim() || !endereco.trim()) {
      toast.error("Nome e endereço são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        endereco: endereco.trim(),
        capacidade: Math.max(1, parseInt(capacidade) || 150),
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        ativo,
      };
      if (inicial) {
        await Store.atualizarEspaco(inicial.id, payload);
        toast.success("Espaço atualizado");
      } else {
        await Store.criarEspaco(payload);
        toast.success("Espaço criado");
      }
      onSave();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-strong rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl text-navy">{inicial ? "Editar espaço" : "Novo espaço"}</h2>
        <button onClick={onCancel} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nome">
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Salão Nobre"
            className="w-full rounded-xl border border-border bg-white/80 px-3 py-2 text-sm outline-none" />
        </Field>
        <Field label="Capacidade">
          <input type="number" min={1} value={capacidade} onChange={(e) => setCapacidade(e.target.value)}
            className="w-full rounded-xl border border-border bg-white/80 px-3 py-2 text-sm outline-none" />
        </Field>
        <div className="md:col-span-2">
          <Field label="Endereço">
            <input value={endereco} onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, bairro, cidade…"
              className="w-full rounded-xl border border-border bg-white/80 px-3 py-2 text-sm outline-none" />
          </Field>
        </div>
        <Field label="Latitude (opcional)">
          <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-12.7763"
            className="w-full rounded-xl border border-border bg-white/80 px-3 py-2 text-sm outline-none" />
        </Field>
        <Field label="Longitude (opcional)">
          <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="15.7392"
            className="w-full rounded-xl border border-border bg-white/80 px-3 py-2 text-sm outline-none" />
        </Field>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="h-4 w-4" />
          Espaço activo (disponível para reservas)
        </label>
      </div>
      <button onClick={salvar} disabled={saving}
        className="btn-gold mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm disabled:opacity-50">
        <Save className="h-4 w-4" /> {saving ? "A guardar…" : "Guardar"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

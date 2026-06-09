import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Store } from "@/lib/store";
import { useStoreVersion } from "@/hooks/useStore";
import { formatKz, CATEGORIAS_MARKETPLACE, type Servico, type Fornecedor } from "@/lib/types";
import { Plus, Pencil, Trash2, X, Save, Tag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/marketplace")({
  component: AdminMarketplace,
});

function AdminMarketplace() {
  useStoreVersion();
  const [tab, setTab] = useState<"servicos" | "fornecedores">("servicos");
  const [filtroCat, setFiltroCat] = useState<string>("todas");

  const servicos = Store.servicos();
  const fornecedores = Store.fornecedores();
  const filtrados = filtroCat === "todas" ? servicos : servicos.filter((s) => s.categoria === filtroCat);

  const [editingServ, setEditingServ] = useState<Servico | null>(null);
  const [newServ, setNewServ] = useState(false);
  const [editingForn, setEditingForn] = useState<Fornecedor | null>(null);
  const [newForn, setNewForn] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Catálogo</div>
        <h1 className="font-display text-3xl text-navy">Marketplace</h1>
        <p className="text-sm text-muted-foreground">Serviços extra e fornecedores disponíveis para os clientes.</p>
      </div>

      <div className="glass-strong flex flex-wrap items-center gap-2 rounded-2xl p-2">
        <button onClick={() => setTab("servicos")} className={`rounded-xl px-3 py-1.5 text-sm ${tab === "servicos" ? "bg-navy text-primary-foreground" : "hover:bg-white/70"}`}>Serviços ({servicos.length})</button>
        <button onClick={() => setTab("fornecedores")} className={`rounded-xl px-3 py-1.5 text-sm ${tab === "fornecedores" ? "bg-navy text-primary-foreground" : "hover:bg-white/70"}`}>Fornecedores ({fornecedores.length})</button>
        <div className="ml-auto">
          {tab === "servicos" ? (
            <button onClick={() => setNewServ(true)} className="btn-gold inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm"><Plus className="h-4 w-4" /> Novo serviço</button>
          ) : (
            <button onClick={() => setNewForn(true)} className="btn-gold inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm"><Plus className="h-4 w-4" /> Novo fornecedor</button>
          )}
        </div>
      </div>

      {tab === "servicos" && (
        <>
          <div className="flex flex-wrap gap-2">
            <Chip active={filtroCat === "todas"} onClick={() => setFiltroCat("todas")}>Todas</Chip>
            {CATEGORIAS_MARKETPLACE.map((c) => (
              <Chip key={c} active={filtroCat === c} onClick={() => setFiltroCat(c)}>{c}</Chip>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtrados.map((s) => (
              <div key={s.id} className="glass-strong rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.categoria}</div>
                    <div className="font-display text-lg text-navy">{s.nome}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${s.activo ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{s.activo ? "Activo" : "Inactivo"}</span>
                </div>
                {s.descricao && <p className="mt-2 text-xs text-muted-foreground">{s.descricao}</p>}
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="font-display text-xl text-navy">{formatKz(Number(s.preco_base))}</div>
                    <div className="text-[10px] text-muted-foreground">por {s.unidade}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingServ(s)} className="rounded-md border border-border bg-white p-1.5"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={async () => { if (confirm("Eliminar?")) { await Store.removerServico(s.id); toast.success("Eliminado"); } }} className="rounded-md border border-destructive/30 bg-white p-1.5 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
            {filtrados.length === 0 && <p className="col-span-full p-8 text-center text-sm text-muted-foreground">Sem serviços nesta categoria.</p>}
          </div>
        </>
      )}

      {tab === "fornecedores" && (
        <div className="glass-strong overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-white/70 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Nome</th><th className="p-3">Categoria</th><th className="p-3">Contacto</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {fornecedores.map((f) => (
                <tr key={f.id} className="border-t border-border/60">
                  <td className="p-3"><div className="font-medium">{f.nome}</div><div className="text-xs text-muted-foreground">{f.email}</div></td>
                  <td className="p-3"><span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{f.categoria}</span></td>
                  <td className="p-3 text-xs">{f.telefone}<div className="text-muted-foreground">{f.contacto}</div></td>
                  <td className="p-3 text-right">
                    <button onClick={() => setEditingForn(f)} className="rounded-md border border-border bg-white p-1.5"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={async () => { if (confirm("Eliminar?")) { await Store.removerFornecedor(f.id); toast.success("Eliminado"); } }} className="ml-1 rounded-md border border-destructive/30 bg-white p-1.5 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
              {fornecedores.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Sem fornecedores.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {(newServ || editingServ) && <ServicoModal s={editingServ} onClose={() => { setNewServ(false); setEditingServ(null); }} />}
      {(newForn || editingForn) && <FornecedorModal f={editingForn} onClose={() => { setNewForn(false); setEditingForn(null); }} />}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${active ? "bg-navy text-primary-foreground" : "border border-border bg-white"}`}>
      <Tag className="h-3 w-3" /> {children}
    </button>
  );
}

function ServicoModal({ s, onClose }: { s: Servico | null; onClose: () => void }) {
  const fornecedores = Store.fornecedores();
  const [form, setForm] = useState({
    fornecedor_id: s?.fornecedor_id ?? fornecedores[0]?.id ?? null,
    categoria: s?.categoria ?? CATEGORIAS_MARKETPLACE[0],
    nome: s?.nome ?? "",
    descricao: s?.descricao ?? "",
    preco_base: s?.preco_base ?? 0,
    unidade: s?.unidade ?? "evento",
    activo: s?.activo ?? true,
  });
  const [busy, setBusy] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (s) {
        await Store.atualizarServico(s.id, { ...form, preco_base: Number(form.preco_base) });
        toast.success("Actualizado");
      } else {
        await Store.criarServico({ ...form, preco_base: Number(form.preco_base) } as never);
        toast.success("Criado");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={salvar} className="glass-strong w-full max-w-lg space-y-3 rounded-2xl bg-white/95 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-navy">{s ? "Editar" : "Novo"} serviço</h2>
          <button type="button" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <L label="Nome"><input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="inp" /></L>
        <L label="Categoria">
          <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="inp">
            {CATEGORIAS_MARKETPLACE.map((c) => <option key={c}>{c}</option>)}
          </select>
        </L>
        <L label="Descrição"><textarea value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="inp min-h-[60px]" /></L>
        <div className="grid grid-cols-2 gap-2">
          <L label="Preço base (Kz)"><input type="number" min={0} value={form.preco_base} onChange={(e) => setForm({ ...form, preco_base: Number(e.target.value) })} className="inp" /></L>
          <L label="Unidade"><input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} className="inp" placeholder="pessoa, evento, unidade" /></L>
        </div>
        <L label="Fornecedor">
          <select value={form.fornecedor_id ?? ""} onChange={(e) => setForm({ ...form, fornecedor_id: e.target.value || null })} className="inp">
            <option value="">— sem fornecedor —</option>
            {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </L>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Activo</label>
        <button disabled={busy} className="btn-navy mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm"><Save className="h-4 w-4" /> {busy ? "A guardar…" : "Guardar"}</button>
        <style>{`.inp{width:100%;border:1px solid var(--color-border);background:#fff;border-radius:0.75rem;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none}`}</style>
      </form>
    </div>
  );
}

function FornecedorModal({ f, onClose }: { f: Fornecedor | null; onClose: () => void }) {
  const [form, setForm] = useState({
    nome: f?.nome ?? "",
    categoria: f?.categoria ?? CATEGORIAS_MARKETPLACE[0],
    contacto: f?.contacto ?? "",
    telefone: f?.telefone ?? "",
    email: f?.email ?? "",
    notas: f?.notas ?? "",
    activo: f?.activo ?? true,
  });
  const [busy, setBusy] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (f) await Store.atualizarFornecedor(f.id, form);
      else await Store.criarFornecedor(form as never);
      toast.success("OK"); onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Falha"); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={salvar} className="glass-strong w-full max-w-lg space-y-3 rounded-2xl bg-white/95 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-navy">{f ? "Editar" : "Novo"} fornecedor</h2>
          <button type="button" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <L label="Nome"><input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="inp" /></L>
        <L label="Categoria">
          <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="inp">
            {CATEGORIAS_MARKETPLACE.map((c) => <option key={c}>{c}</option>)}
          </select>
        </L>
        <div className="grid grid-cols-2 gap-2">
          <L label="Telefone"><input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="inp" /></L>
          <L label="Email"><input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="inp" /></L>
        </div>
        <L label="Contacto / responsável"><input value={form.contacto ?? ""} onChange={(e) => setForm({ ...form, contacto: e.target.value })} className="inp" /></L>
        <L label="Notas"><textarea value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="inp min-h-[60px]" /></L>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Activo</label>
        <button disabled={busy} className="btn-navy mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm"><Save className="h-4 w-4" /> Guardar</button>
        <style>{`.inp{width:100%;border:1px solid var(--color-border);background:#fff;border-radius:0.75rem;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none}`}</style>
      </form>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>;
}

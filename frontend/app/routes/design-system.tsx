import { useState } from "react";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import CheckboxComponent from "~/components/common/forms/CheckboxComponent";
import SelectComponent from "~/components/common/forms/SelectComponent";
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import { StatCard } from "~/components/common/StatCard";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { Pagination } from "~/components/common/Pagination";
import { IssueStatusBadge } from "~/components/issues/IssueStatusBadge";
import { Modal } from "~/components/common/Modal";
import { IssueStatus } from "~/types/issueType";

/* ─── Helpers ─── */
const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24">
    <h2 className="font-display text-2xl font-bold text-yambo-black mb-6 flex items-center gap-2">
      <span className="w-1.5 h-8 rounded-full bg-gradient-to-b from-yambo-green-400 to-yambo-purple-400" />
      {title}
    </h2>
    {children}
  </section>
);

const Swatch = ({ name, bg, text }: { name: string; bg: string; text?: string }) => (
  <div className="flex flex-col items-center gap-1.5">
    <div className={`w-14 h-14 rounded-2xl shadow-sm border border-gray-100 ${bg}`} />
    <span className={`text-[11px] font-medium ${text ?? "text-gray-500"}`}>{name}</span>
  </div>
);

/* ─── Sidebar nav items ─── */
const NAV = [
  { id: "palette", label: "🎨 Palette" },
  { id: "typography", label: "🔤 Typography" },
  { id: "buttons", label: "🔘 Buttons" },
  { id: "inputs", label: "✏️ Inputs" },
  { id: "checkboxes", label: "☑️ Checkboxes" },
  { id: "selects", label: "📋 Selects" },
  { id: "stats", label: "📊 Stats" },
  { id: "badges", label: "🏷️ Badges" },
  { id: "spinners", label: "⏳ Spinners" },
  { id: "errors", label: "⚠️ Errors" },
  { id: "dialogs", label: "💬 Dialogs" },
  { id: "modals", label: "🪟 Modals" },
  { id: "pagination", label: "📄 Pagination" },
  { id: "animations", label: "✨ Animations" },
  { id: "utilities", label: "🛠️ Utilities" },
];

/* ═══════════════════════════════════════════════════════════ */

export default function DesignSystem() {
  const [page, setPage] = useState(3);
  const [dialogOpen, setDialogOpen] = useState<"danger" | "warning" | "info" | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [multiVal, setMultiVal] = useState<string[]>(["alpha"]);

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 glass border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="font-display text-3xl font-extrabold gradient-text">
            Yambo Design System
          </h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex gap-8 px-6 py-10">
        {/* ── Sidebar ── */}
        <nav className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-24 space-y-1">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                className="block px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-yambo-green-50 hover:text-yambo-green-700 transition-colors"
              >
                {n.label}
              </a>
            ))}
          </div>
        </nav>

        {/* ── Main ── */}
        <main className="flex-1 space-y-16">

          {/* ────────── PALETTE ────────── */}
          <Section id="palette" title="Color Palette">
            {/* Green scale */}
            <p className="text-sm font-semibold text-gray-600 mb-3">Green Scale</p>
            <div className="flex flex-wrap gap-3 mb-6">
              <Swatch name="50" bg="bg-yambo-green-50" />
              <Swatch name="100" bg="bg-yambo-green-100" />
              <Swatch name="200" bg="bg-yambo-green-200" />
              <Swatch name="300" bg="bg-yambo-green-300" />
              <Swatch name="400" bg="bg-yambo-green-400" />
              <Swatch name="500" bg="bg-yambo-green-500" />
              <Swatch name="600" bg="bg-yambo-green-600" />
              <Swatch name="700" bg="bg-yambo-green-700" />
              <Swatch name="800" bg="bg-yambo-green-800" />
              <Swatch name="900" bg="bg-yambo-green-900" />
            </div>

            {/* Purple scale */}
            <p className="text-sm font-semibold text-gray-600 mb-3">Purple Scale</p>
            <div className="flex flex-wrap gap-3 mb-6">
              <Swatch name="50" bg="bg-yambo-purple-50" />
              <Swatch name="100" bg="bg-yambo-purple-100" />
              <Swatch name="200" bg="bg-yambo-purple-200" />
              <Swatch name="300" bg="bg-yambo-purple-300" />
              <Swatch name="400" bg="bg-yambo-purple-400" />
              <Swatch name="500" bg="bg-yambo-purple-500" />
              <Swatch name="600" bg="bg-yambo-purple-600" />
              <Swatch name="700" bg="bg-yambo-purple-700" />
              <Swatch name="800" bg="bg-yambo-purple-800" />
              <Swatch name="900" bg="bg-yambo-purple-900" />
            </div>

            {/* Accents */}
            <p className="text-sm font-semibold text-gray-600 mb-3">Accent Colors</p>
            <div className="flex flex-wrap gap-3 mb-6">
              <Swatch name="Coral" bg="bg-yambo-coral" />
              <Swatch name="Gold" bg="bg-yambo-gold" />
              <Swatch name="Sky" bg="bg-yambo-sky" />
              <Swatch name="Peach" bg="bg-yambo-peach" />
              <Swatch name="Black" bg="bg-yambo-black" text="text-gray-400" />
              <Swatch name="White" bg="bg-yambo-white border" />
            </div>
          </Section>

          {/* ────────── TYPOGRAPHY ────────── */}
          <Section id="typography" title="Typography">
            <div className="space-y-4 bg-white rounded-2xl p-8 border border-gray-100">
              <p className="font-display text-5xl font-extrabold text-yambo-black">Display — Plus Jakarta Sans</p>
              <p className="font-display text-3xl font-bold text-yambo-black">Heading 1 — font-display text-3xl bold</p>
              <p className="font-display text-2xl font-bold text-yambo-black">Heading 2 — font-display text-2xl bold</p>
              <p className="font-display text-xl font-semibold text-yambo-black">Heading 3 — font-display text-xl semibold</p>
              <p className="font-sans text-base text-gray-700">Body — Inter, text-base</p>
              <p className="font-sans text-sm text-gray-500">Caption — Inter, text-sm</p>
              <p className="font-sans text-xs text-gray-400 tracking-wider uppercase">Overline — Inter, text-xs uppercase</p>
              <p className="gradient-text font-display text-3xl font-extrabold">Gradient Text Utility</p>
            </div>
          </Section>

          {/* ────────── BUTTONS ────────── */}
          <Section id="buttons" title="Buttons">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 space-y-8">
              {/* All variants at md */}
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-3">Variants (size: md)</p>
                <div className="flex flex-wrap gap-3">
                  <ButtonComponent variant="primary">Primary</ButtonComponent>
                  <ButtonComponent variant="primary-outline">Primary Outline</ButtonComponent>
                  <ButtonComponent variant="secondary">Secondary</ButtonComponent>
                  <ButtonComponent variant="neutral">Neutral</ButtonComponent>
                  <ButtonComponent variant="base">Base</ButtonComponent>
                  <ButtonComponent variant="danger">Danger</ButtonComponent>
                  <ButtonComponent variant="danger-text">Danger Text</ButtonComponent>
                  <ButtonComponent variant="destructive">Destructive</ButtonComponent>
                  <ButtonComponent variant="destructive-text">Destructive Text</ButtonComponent>
                  <ButtonComponent variant="success">Success</ButtonComponent>
                  <ButtonComponent variant="ghost">Ghost</ButtonComponent>
                </div>
              </div>

              {/* Sizes */}
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-3">Sizes</p>
                <div className="flex flex-wrap items-center gap-3">
                  <ButtonComponent variant="primary" size="sm">Small</ButtonComponent>
                  <ButtonComponent variant="primary" size="md">Medium</ButtonComponent>
                  <ButtonComponent variant="primary" size="lg">Large</ButtonComponent>
                </div>
              </div>

              {/* States */}
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-3">States</p>
                <div className="flex flex-wrap items-center gap-3">
                  <ButtonComponent variant="primary" isLoading>Loading…</ButtonComponent>
                  <ButtonComponent variant="primary" disabled>Disabled</ButtonComponent>
                </div>
              </div>
            </div>
          </Section>

          {/* ────────── INPUTS ────────── */}
          <Section id="inputs" title="Inputs">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 grid sm:grid-cols-2 gap-6">
              <InputComponent label="Text" placeholder="Write something…" />
              <InputComponent label="Email" type="email" placeholder="you@yambo.es" />
              <InputComponent label="Password" type="password" placeholder="••••••••" />
              <InputComponent label="Phone" type="tel" placeholder="+34 600 000 000" />
              <InputComponent label="Disabled" disabled placeholder="Can't touch this" />
              <InputComponent label="Read-only" readOnly defaultValue="Fixed value" />
            </div>
          </Section>

          {/* ────────── CHECKBOXES ────────── */}
          <Section id="checkboxes" title="Checkboxes & Toggles">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 space-y-6">
              <p className="text-sm font-semibold text-gray-600 mb-1">Checkbox variants</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <CheckboxComponent label="Left (default)" variant="left" variantType="checkbox" />
                <CheckboxComponent label="Right" variant="right" variantType="checkbox" />
                <CheckboxComponent label="Left + description" description="Some extra context" variant="left-with-description" variantType="checkbox" />
                <CheckboxComponent label="Right + description" description="More context here" variant="right-with-description" variantType="checkbox" />
              </div>

              <p className="text-sm font-semibold text-gray-600 mt-6 mb-1">Toggle variants</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <CheckboxComponent label="Toggle left" variant="left" variantType="toggle" />
                <CheckboxComponent label="Toggle right" variant="right" variantType="toggle" />
                <CheckboxComponent label="Toggle + desc" description="With description" variant="left-with-description" variantType="toggle" />
                <CheckboxComponent label="Disabled toggle" variant="left" variantType="toggle" disabled />
              </div>
            </div>
          </Section>

          {/* ────────── SELECTS ────────── */}
          <Section id="selects" title="Selects">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 grid sm:grid-cols-2 gap-6">
              <SelectComponent
                label="Single select"
                options={[
                  { value: "alpha", label: "Alpha" },
                  { value: "beta", label: "Beta" },
                  { value: "gamma", label: "Gamma" },
                ]}
              />
              <MultiSelectComponent
                label="Multi select"
                value={multiVal}
                onChange={(e) => {
                  const opts = Array.from((e.target as unknown as HTMLSelectElement).selectedOptions, (o) => o.value);
                  setMultiVal(opts);
                }}
                options={[
                  { value: "alpha", label: "Alpha" },
                  { value: "beta", label: "Beta" },
                  { value: "gamma", label: "Gamma" },
                  { value: "delta", label: "Delta" },
                ]}
                placeholder="Pick several…"
              />
              <SelectComponent label="Disabled" disabled options={[{ value: "x", label: "Locked" }]} />
            </div>
          </Section>

          {/* ────────── STAT CARDS ────────── */}
          <Section id="stats" title="Stat Cards">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Users" value={1247} className="bg-white rounded-2xl border border-gray-100 p-5" />
              <StatCard label="Orders" value={384} className="bg-yambo-green-50 rounded-2xl border border-yambo-green-100 p-5" />
              <StatCard label="Revenue" value={9850} className="bg-yambo-purple-50 rounded-2xl border border-yambo-purple-100 p-5" />
              <StatCard label="Issues" value={12} className="bg-red-50 rounded-2xl border border-red-100 p-5" />
            </div>
          </Section>

          {/* ────────── BADGES ────────── */}
          <Section id="badges" title="Issue Status Badges">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 flex flex-wrap gap-3">
              <IssueStatusBadge status={IssueStatus.OPEN} />
              <IssueStatusBadge status={IssueStatus.IN_PROGRESS} />
              <IssueStatusBadge status={IssueStatus.RESOLVED} />
              <IssueStatusBadge status={IssueStatus.CLOSED} />
              <IssueStatusBadge status={IssueStatus.REOPENED} />
            </div>
          </Section>

          {/* ────────── SPINNERS ────────── */}
          <Section id="spinners" title="Loading Spinners">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 flex flex-wrap items-end gap-10">
              <div className="text-center">
                <LoadingSpinner size="sm" />
                <p className="text-xs text-gray-400 mt-2">sm</p>
              </div>
              <div className="text-center">
                <LoadingSpinner size="md" />
                <p className="text-xs text-gray-400 mt-2">md</p>
              </div>
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="text-xs text-gray-400 mt-2">lg</p>
              </div>
              <div className="text-center">
                <LoadingSpinner size="xl" message="Loading data…" />
                <p className="text-xs text-gray-400 mt-2">xl + message</p>
              </div>
            </div>
          </Section>

          {/* ────────── ERRORS ────────── */}
          <Section id="errors" title="Error Messages">
            <div className="space-y-4">
              <ErrorMessage message="Something went wrong while loading data." onRetry={() => alert("Retry!")} />
              <ErrorMessage message="No retry action provided for this error." />
            </div>
          </Section>

          {/* ────────── DIALOGS ────────── */}
          <Section id="dialogs" title="Confirm Dialogs">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 flex flex-wrap gap-3">
              <ButtonComponent variant="destructive" onClick={() => setDialogOpen("danger")}>Danger dialog</ButtonComponent>
              <ButtonComponent variant="neutral" onClick={() => setDialogOpen("warning")}>Warning dialog</ButtonComponent>
              <ButtonComponent variant="primary" onClick={() => setDialogOpen("info")}>Info dialog</ButtonComponent>
            </div>

            <ConfirmDialog
              isOpen={dialogOpen === "danger"}
              onClose={() => setDialogOpen(null)}
              onConfirm={() => setDialogOpen(null)}
              variant="danger"
              title="Delete item?"
              message="This action cannot be undone. The item will be permanently deleted."
              confirmLabel="Delete"
            />
            <ConfirmDialog
              isOpen={dialogOpen === "warning"}
              onClose={() => setDialogOpen(null)}
              onConfirm={() => setDialogOpen(null)}
              variant="warning"
              title="Are you sure?"
              message="This will regenerate all SEO metadata with AI."
              confirmLabel="Proceed"
            />
            <ConfirmDialog
              isOpen={dialogOpen === "info"}
              onClose={() => setDialogOpen(null)}
              onConfirm={() => setDialogOpen(null)}
              variant="info"
              title="Confirm action"
              message="You're about to enable notifications for all users."
            />
          </Section>

          {/* ────────── MODALS ────────── */}
          <Section id="modals" title="Modal">
            <div className="bg-white rounded-2xl p-8 border border-gray-100">
              <ButtonComponent variant="primary-outline" onClick={() => setModalOpen(true)}>
                Open Modal
              </ButtonComponent>
            </div>

            <Modal
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Example Modal"
              size="md"
              footer={
                <div className="flex justify-end gap-3">
                  <ButtonComponent variant="neutral" onClick={() => setModalOpen(false)}>Cancel</ButtonComponent>
                  <ButtonComponent variant="primary" onClick={() => setModalOpen(false)}>Save</ButtonComponent>
                </div>
              }
            >
              <p className="text-gray-600">
                This is a medium-sized modal. You can put forms, tables, or any content inside.
              </p>
              <div className="mt-4">
                <InputComponent label="Example field" placeholder="Type here…" />
              </div>
            </Modal>
          </Section>

          {/* ────────── PAGINATION ────────── */}
          <Section id="pagination" title="Pagination">
            <div className="bg-white rounded-2xl p-8 border border-gray-100">
              <Pagination page={page} totalPages={10} onPageChange={setPage} />
              <p className="text-sm text-gray-500 mt-3 text-center">Current page: {page}</p>
            </div>
          </Section>

          {/* ────────── ANIMATIONS ────────── */}
          <Section id="animations" title="Animations">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 grid sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { cls: "bounce-in", label: "Bounce In" },
                { cls: "fade-up", label: "Fade Up" },
                { cls: "fade-down", label: "Fade Down" },
                { cls: "wiggle", label: "Wiggle" },
                { cls: "pulse-glow", label: "Pulse Glow" },
                { cls: "float-anim", label: "Float" },
                { cls: "spin-slow", label: "Spin Slow" },
                { cls: "hover-lift", label: "Hover Lift" },
              ].map((a) => (
                <div
                  key={a.cls}
                  className={`${a.cls} flex items-center justify-center h-24 rounded-2xl bg-gradient-to-br from-yambo-green-50 to-yambo-purple-50 border border-gray-100 text-sm font-medium text-gray-600 cursor-default`}
                >
                  {a.label}
                </div>
              ))}
            </div>
          </Section>

          {/* ────────── UTILITIES ────────── */}
          <Section id="utilities" title="CSS Utilities">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {/* Gradient border */}
              <div className="gradient-border">
                <div className="p-6 text-center text-sm font-medium text-gray-600 bg-white">
                  gradient-border
                </div>
              </div>

              {/* Glassmorphism */}
              <div className="relative overflow-hidden rounded-2xl h-32">
                <div className="absolute inset-0 bg-gradient-to-br from-yambo-green-200 to-yambo-purple-200" />
                <div className="absolute inset-3 glass rounded-xl flex items-center justify-center text-sm font-medium text-gray-600">
                  glass
                </div>
              </div>

              {/* Hover pop */}
              <div className="hover-pop flex items-center justify-center h-32 rounded-2xl bg-white border border-gray-100 text-sm font-medium text-gray-600 cursor-pointer">
                hover-pop (hover me)
              </div>

              {/* Underline grow */}
              <div className="flex items-center justify-center h-32 rounded-2xl bg-white border border-gray-100">
                <a href="#utilities" className="underline-grow text-sm font-medium text-gray-600">
                  underline-grow
                </a>
              </div>

              {/* Blob shapes */}
              <div className="relative h-32 rounded-2xl bg-white border border-gray-100 overflow-hidden flex items-center justify-center">
                <div className="blob-green" style={{ top: -40, left: -40, width: 120, height: 120, position: "absolute" }} />
                <div className="blob-purple" style={{ bottom: -30, right: -30, width: 100, height: 100, position: "absolute" }} />
                <span className="relative text-sm font-medium text-gray-600">Blob decorations</span>
              </div>

              {/* Radius tokens */}
              <div className="flex items-center justify-center gap-4 h-32 rounded-2xl bg-white border border-gray-100 px-6">
                <div className="w-14 h-14 rounded-playful bg-yambo-green-100 flex items-center justify-center text-[10px] text-gray-500">playful</div>
                <div className="w-14 h-14 rounded-pill bg-yambo-purple-100 flex items-center justify-center text-[10px] text-gray-500">pill</div>
                <div className="w-14 h-14 rounded-blob bg-yambo-coral/20 flex items-center justify-center text-[10px] text-gray-500">blob</div>
              </div>
            </div>
          </Section>

          {/* Footer spacer */}
          <div className="h-20" />
        </main>
      </div>
    </div>
  );
}

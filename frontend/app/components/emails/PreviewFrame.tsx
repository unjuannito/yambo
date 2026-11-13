export function PreviewFrame({
  html,
  label,
}: {
  html: string | null;
  label: string;
}) {
  if (!html) return null;
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      <iframe
        title={label}
        sandbox=""
        srcDoc={html}
        className="w-full h-96 rounded-xl border border-gray-200 bg-white"
      />
    </div>
  );
}

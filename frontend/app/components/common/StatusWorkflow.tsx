interface StatusConfig {
  label: string;
  shortLabel?: string;
  className: string;
}

interface StatusWorkflowProps {
  title: string;
  config: Record<string, StatusConfig>;
  transitions: Record<string, string[]>;
}

function deriveFlow(transitions: Record<string, string[]>) {
  const keys = Object.keys(transitions);
  if (keys.length === 0)
    return { flow: [] as string[], terminal: [] as string[] };

  const visited = new Set<string>();
  const flow: string[] = [];

  let current: string | undefined = keys[0];
  while (current && !visited.has(current)) {
    visited.add(current);
    flow.push(current);
    current = (transitions[current] ?? []).find((t) => !visited.has(t));
  }

  const terminal = keys.filter((k) => !visited.has(k));
  return { flow, terminal };
}

export function StatusWorkflow({
  title,
  config,
  transitions,
}: StatusWorkflowProps) {
  const { flow, terminal } = deriveFlow(transitions);

  return (
    <div className="mb-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <p className="text-sm font-bold text-gray-700 mb-2">{title}</p>
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
        {flow.map((key, idx) => {
          const entry = config[key];
          if (!entry) return null;
          return (
            <span key={key} className="contents">
              {idx > 0 && (
                <span className="text-yambo-green-400">→</span>
              )}
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${entry.className}`}
              >
                {entry.shortLabel ?? entry.label}
              </span>
            </span>
          );
        })}
        {terminal.length > 0 && (
          <>
            <span className="ml-2 text-gray-300">|</span>
            {terminal.map((key) => {
              const entry = config[key];
              if (!entry) return null;
              return (
                <span
                  key={key}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${entry.className}`}
                >
                  {entry.shortLabel ?? entry.label}
                </span>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

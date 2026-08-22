import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBookOpen } from "@fortawesome/free-solid-svg-icons";

interface StatusConfig {
  label: string;
  shortLabel?: string;
  className: string;
}

interface StatusWorkflowProps {
  title: string;
  config: Record<string, StatusConfig>;
  transitions: Record<string, string[]>;
  /** Ancla de la guía en la wiki: /mi-espacio/admin/guias/flujos-de-trabajo#<id> */
  wikiHref?: string;
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
  wikiHref,
}: StatusWorkflowProps) {
  const { t } = useTranslation();
  const { flow, terminal } = deriveFlow(transitions);

  const primaryEdges = new Set(
    flow.slice(0, -1).map((from, idx) => `${from}->${flow[idx + 1]}`),
  );

  const extraEdges = Object.entries(transitions).flatMap(([from, toList]) =>
    toList
      .filter((to) => !primaryEdges.has(`${from}->${to}`))
      .map((to) => ({ from, to })),
  );

  return (
    <div className="mb-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-bold text-gray-700">{title}</p>
        {wikiHref && (
          <Link
            to={wikiHref}
            className="inline-flex items-center gap-1.5 text-xs text-yambo-green-600 hover:text-yambo-green-800 hover:underline transition-colors flex-shrink-0"
          >
            <FontAwesomeIcon icon={faBookOpen} className="w-3.5 h-3.5" />
            {t("component.statusWorkflow.wikiLink")}
          </Link>
        )}
      </div>
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
      {extraEdges.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="font-semibold text-gray-400">{t("component.statusWorkflow.actions")}</span>
          {extraEdges.map((edge) => {
            const fromLabel = config[edge.from]?.shortLabel ?? config[edge.from]?.label ?? edge.from;
            const toLabel = config[edge.to]?.shortLabel ?? config[edge.to]?.label ?? edge.to;
            return (
              <span
                key={`${edge.from}->${edge.to}`}
                className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1"
              >
                {fromLabel} -&gt; {toLabel}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

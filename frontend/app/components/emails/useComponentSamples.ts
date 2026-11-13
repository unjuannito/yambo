import { useMemo, useState } from "react";
import {
  COMPONENT_SAMPLE_DATA,
  componentTokens,
  parseSampleData,
  parseSampleValue,
  type SampleKind,
} from "./componentSamples";

/** Keep the last valid examples while the user edits incomplete JSON. */
export function useComponentSamples() {
  const [samples, setSamples] = useState(COMPONENT_SAMPLE_DATA);
  const [draft, setDraft] = useState(() =>
    JSON.stringify(COMPONENT_SAMPLE_DATA, null, 2),
  );
  const [error, setError] = useState("");
  const tokens = useMemo(() => componentTokens(samples), [samples]);
  const updateSamples = (value: string) => {
    setDraft(value);
    try {
      setSamples(parseSampleData(value));
      setError("");
    } catch (err) {
      setError(
        err instanceof SyntaxError
          ? "Revisa el JSON: falta una coma, una comilla o una llave."
          : (err as Error).message,
      );
    }
  };
  const addExample = (name: string, kind: SampleKind, source: string) => {
    const data = { ...samples, [name]: parseSampleValue(kind, source) };
    setSamples(data);
    setDraft(JSON.stringify(data, null, 2));
    setError("");
  };
  return { tokens, draft, error, updateSamples, addExample };
}
export type ComponentSamples = ReturnType<typeof useComponentSamples>;

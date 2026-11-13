import { useEffect, useRef, useState } from "react";
import { emailTemplateService } from "~/services/emailTemplateService";

export type PreviewLoader = () => Promise<{ html: string }>;
type Options = {
  templateKey: string;
  body: string | null;
  loadPreview?: PreviewLoader;
};

/** Own visibility, thumbnail measurement and cancellation of stale render responses. */
export function useEmailPreview({ templateKey, body, loadPreview }: Options) {
  const card = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [width, setWidth] = useState(300);
  useEffect(() => {
    if (!card.current) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(card.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!card.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(card.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    setHtml(null);
    setError(false);
    (loadPreview
      ? loadPreview()
      : emailTemplateService.preview(templateKey, body)
    )
      .then((result) => {
        if (active) setHtml(result.html);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [visible, templateKey, body, attempt, loadPreview]);

  return {
    card,
    html,
    error,
    width,
    activate: () => setVisible(true),
    retry: () => setAttempt((value) => value + 1),
  };
}

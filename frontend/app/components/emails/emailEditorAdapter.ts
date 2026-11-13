import type { CommonElements, EmailToken } from "mailcanvas";
import type { EmailCommonElementView } from "~/services/emailCommonElementService";
import type { EmailTemplateToken } from "~/services/emailTemplateService";

/** Upgrade the types in older built-in component schemas without touching custom components. */
function typedProperties(
  key: string,
  properties: NonNullable<EmailCommonElementView["properties"]> = [],
) {
  return properties.map((property) => {
    if (
      key === "automatic-header" &&
      property.key === "emailDate" &&
      property.type === "text"
    )
      return { ...property, type: "datetime" as const };
    if (
      key === "automatic-footer" &&
      property.key === "currentYear" &&
      property.type === "text"
    )
      return { ...property, type: "number" as const };
    return property;
  });
}

/** Keep structured samples intact for object/array inspection and loop previews. */
export function toEmailTokens(tokens: EmailTemplateToken[]): EmailToken[] {
  return tokens.map((token) => ({
    ...token,
    token: `{{${token.token.replace(/^\{\{\s*|\s*\}\}$/g, "")}}}`,
  }));
}

export function toCommonElements(
  elements: EmailCommonElementView[],
  campaign: boolean,
): CommonElements {
  return {
    // Automatic templates have their own server-side brand envelope.
    ...(campaign
      ? {
          showEnvelopeHeader: false,
          headerHtml: elements.find((element) => element.key === "header")
            ?.html,
          footerHtml: elements.find((element) => element.key === "footer")
            ?.html,
        }
      : {}),
    components: elements.map((element) => ({
      key: element.key,
      name: element.name,
      description: element.description ?? "",
      category: element.builtIn ? "Envoltorio de comunicados" : "Yambo",
      html: element.html,
      properties: typedProperties(element.key, element.properties),
    })),
  };
}

/** Compatibility with mailcanvas 1.0.0: close Thymeleaf blocks before HTML parsing. */
export function normalizeTemplateMarkup(source: string): string {
  return source.replace(
    /<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<\/?[\w:-]+\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi,
    (tag) => {
      if (!/^<[\w:-]+\b/.test(tag)) return tag;
      // 1.0.0 only recognizes ::fragmentName without whitespace.
      const normalized = tag.replace(
        /(th:(?:replace|insert)\s*=\s*)("[^"]*"|'[^']*')/gi,
        (_, attribute, value) =>
          attribute + value.replace(/::\s+(\w+)\s*\(/, "::$1("),
      );
      return /^<th:block\b/i.test(normalized) && /\/\s*>$/.test(normalized)
        ? normalized.replace(/\/\s*>$/, "></th:block>")
        : normalized;
    },
  );
}

/** 1.0.0 displays protected HTML literally: give server fragments a live component preview. */
export function prepareEditorHtml(source: string): string {
  const normalized = normalizeTemplateMarkup(source);
  if (typeof DOMParser === "undefined") return normalized;
  const doc = new DOMParser().parseFromString(normalized, "text/html");
  for (const component of doc.body.querySelectorAll("[data-ee-component]")) {
    const key = component.getAttribute("data-ee-component") ?? "";
    if (key !== "automatic-header" && key !== "automatic-footer") continue;
    try {
      const properties = JSON.parse(
        component.getAttribute("data-ee-component-properties") ?? "[]",
      );
      if (Array.isArray(properties))
        component.setAttribute(
          "data-ee-component-properties",
          JSON.stringify(typedProperties(key, properties)),
        );
    } catch {
      /* The editor retains malformed metadata as protected HTML. */
    }
  }
  const names: Record<string, string> = {
    productTable: "Productos del pedido",
    orderDetails: "Detalles del pedido",
    issueDetails: "Detalles de la incidencia",
  };
  for (const node of doc.body.querySelectorAll(
    "[th\\:replace], [th\\:insert]",
  )) {
    if (node.closest("[data-ee-component]")) continue;
    const expression =
      node.getAttribute("th:replace") ?? node.getAttribute("th:insert") ?? "";
    const name = expression.match(/::\s*(\w+)\s*\(/)?.[1];
    if (
      !name ||
      !names[name] ||
      !expression.includes("emails/fragments/layout")
    )
      continue;
    const component = doc.createElement("div");
    component.setAttribute("data-ee-component", `yambo-fragment-${name}`);
    component.setAttribute("data-ee-component-name", names[name]);
    component.setAttribute("data-ee-component-values", "{}");
    component.setAttribute("data-ee-component-properties", "[]");
    component.innerHTML = node.outerHTML;
    node.replaceWith(component);
  }
  return doc.body.innerHTML;
}

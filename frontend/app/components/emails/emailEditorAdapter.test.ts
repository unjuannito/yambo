import { readFileSync } from "node:fs";
import { parseEmailHtmlToBlocks, emailBlocksToHtml } from "mailcanvas";
import { describe, expect, it } from "vitest";
import { prepareEditorHtml, normalizeTemplateMarkup, toCommonElements, toEmailTokens } from "./emailEditorAdapter";

describe("email editor data adapter", () => {
  it("keeps the complete-document marker and editable sections through a real library round trip", () => {
    const source = readFileSync("../backend/src/main/resources/db/changelog/changes/109-import-data/invitation.html", "utf8");
    const result = emailBlocksToHtml(parseEmailHtmlToBlocks(prepareEditorHtml(source)));
    expect(result).toContain('data-yambo-email-document="v1"');
    expect(result.match(/data-ee-component="automatic-header"/g)).toHaveLength(1);
    expect(result.match(/data-ee-component="automatic-footer"/g)).toHaveLength(1);
    expect(result).toContain("invitationLink");
    expect(result).toContain("headerTitle");
  });
  it("makes server fragments visible as components while keeping their Thymeleaf references", () => {
    const source = '<th:block th:replace="~{emails/fragments/layout :: productTable(${products}, ${totalPrice})}"/><p>Después</p>';
    const result = prepareEditorHtml(source);
    const doc = new DOMParser().parseFromString(result, "text/html");
    expect(doc.body.children).toHaveLength(2);
    expect(doc.body.firstElementChild?.getAttribute("data-ee-component")).toBe("yambo-fragment-productTable");
    expect(result).toContain("::productTable");
    expect(prepareEditorHtml(result)).toBe(result);
  });
  it("closes Thymeleaf fragments before browser parsing without consuming following blocks", () => {
    const html = '<th:block th:replace="~{emails/fragments/layout :: productTable(${products}, ${totalPrice})}"/><p>Después</p>';
    const doc = new DOMParser().parseFromString(normalizeTemplateMarkup(html), "text/html");
    expect(doc.body.children).toHaveLength(2);
    expect(doc.body.children[1].textContent).toBe("Después");
    expect(doc.body.children[0].getAttribute("th:replace")).toContain("::productTable");
  });
  it("preserves arrays and objects and normalizes placeholder delimiters", () => {
    const sample = [{ name: "Camiseta", price: 10 }];
    const result = toEmailTokens([
      { token: "productos", varName: "products", label: "Productos", sample },
      { token: "{{ nombre }}", varName: "userName", label: "Nombre", sample: "Ana" },
    ]);
    expect(result[0].sample).toBe(sample);
    expect(result.map((token) => token.token)).toEqual(["{{productos}}", "{{nombre}}"]);
  });
  it("keeps all shared components available, including the built-in header and footer", () => {
    const elements = [
      { key: "header", name: "Cabecera", description: null, html: "<h1>Yambo</h1>", builtIn: true },
      { key: "footer", name: "Pie", description: null, html: "<p>Preferencias</p>", builtIn: true },
      { key: "firma", name: "Firma", description: null, html: "<p>Equipo</p>", builtIn: false },
    ];
    const campaign = toCommonElements(elements, true);
    expect(campaign.showEnvelopeHeader).toBe(false);
    expect(campaign.headerHtml).toBe(elements[0].html);
    expect(campaign.footerHtml).toBe(elements[1].html);
    expect(campaign.components?.map((component) => component.key)).toEqual(["header", "footer", "firma"]);
    expect(toCommonElements(elements, false).headerHtml).toBeUndefined();
  });
});

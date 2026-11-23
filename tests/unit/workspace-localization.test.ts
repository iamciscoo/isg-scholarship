import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { dictionaries } from "@/lib/i18n/messages";
import { locales } from "@/lib/i18n/config";
import { translateWorkspace } from "@/lib/i18n/workspace-translate";
import { applicationFields } from "@/lib/validation/application-form";
import {
  fullApplicationStatusLabels,
  applicationDocumentCategories,
} from "@/lib/validation/application-review";
import { steps, consentFields } from "@/features/assessments/fields";
import { notificationCopy } from "@/features/notifications/notification-copy";

const en = dictionaries.en.workspace;
const translate = (source: string) => translateWorkspace(dictionaries.sw.workspace, source);

describe("dashboard translations", () => {
  it("keeps every language complete and translates essential workflow controls", () => {
    const keys = Object.keys(en).sort();
    for (const locale of locales) {
      expect(Object.keys(dictionaries[locale].workspace).sort(), locale).toEqual(keys);
      for (const key of keys)
        expect(dictionaries[locale].workspace[key as keyof typeof en], `${locale}: ${key}`).toBeTruthy();
      if (locale !== "en")
        for (const key of [
          "Save",
          "Unsaved changes",
          "Payment needed",
          "Application status",
          "Upload receipt",
          "Reference",
          "Study goal",
        ] as const)
          expect(dictionaries[locale].workspace[key], `${locale}: ${key}`).not.toBe(key);
    }
  });

  it("covers the shared field labels, declaration options and document/status enums", () => {
    const copy = [
      ...applicationFields.flatMap((section) => [
        section.title,
        ...section.fields.flatMap((field) => [field.label, ...(field.options || [])]),
      ]),
      ...Object.values(fullApplicationStatusLabels),
      ...Object.values(applicationDocumentCategories),
      ...steps.flatMap((step) =>
        step.flatMap((field) => [field.label, ...(field.options || []), ...(field.help ? [field.help] : [])]),
      ),
      ...consentFields.map((field) => field.text),
    ];
    for (const source of copy.filter((value) => !/^\d{4}$/.test(value)))
      expect(en, source).toHaveProperty(source);
  });

  it("covers explicit translated copy throughout dashboard components", () => {
    const roots = [
      "src/app/(staff)",
      "src/app/(applicant)",
      "src/features",
      "src/components/layout",
      "src/components/forms",
    ];
    const visitDirectory = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          visitDirectory(filename);
          continue;
        }
        if (!filename.endsWith(".tsx")) continue;
        const file = ts.createSourceFile(
          filename,
          readFileSync(filename, "utf8"),
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX,
        );
        const phrases: string[] = [];
        const visit = (node: ts.Node) => {
          if (
            ts.isCallExpression(node) &&
            ["t", "translate"].includes(node.expression.getText(file)) &&
            node.arguments[0] &&
            ts.isStringLiteral(node.arguments[0])
          )
            phrases.push(node.arguments[0].text);
          if (ts.isJsxElement(node) && node.openingElement.tagName.getText(file) === "Text")
            for (const child of node.children) {
              if (ts.isJsxText(child) && child.text.trim()) phrases.push(child.text.trim());
              if (ts.isJsxExpression(child) && child.expression && ts.isStringLiteral(child.expression))
                phrases.push(child.expression.text);
            }
          ts.forEachChild(node, visit);
        };
        visit(file);
        for (const phrase of phrases)
          expect(Object.hasOwn(en, phrase.replace(/\s+/g, " ").trim()), `${filename}: ${phrase}`).toBe(true);
      }
    };
    roots.forEach(visitDirectory);
  });

  it("interpolates copy and preserves unknown content and surrounding whitespace", () => {
    expect(translateWorkspace(dictionaries.sw.workspace, "Welcome, {name}", { name: "Amina" })).toBe(
      "Karibu, Amina",
    );
    expect(translate("Name supplied by the applicant")).toBe("Name supplied by the applicant");
    expect(translate(" (optional)")).toBe(" (si lazima)");
  });

  it("translates only automated notification copy and keeps names/files and authored messages intact", () => {
    const item = {
      id: "fixture",
      title: "Payment receipt to review",
      body: "New · ISG-ABC123 · Pending verification · New.pdf",
      link: "/admin/receipts/fixture",
      created_at: "2026-11-23",
      is_read: false,
      is_system: true,
    };
    expect(notificationCopy(item, translate)).toEqual({
      title: "Risiti ya kukagua",
      body: "New · ISG-ABC123 · Inasubiri uhakiki · New.pdf",
    });
    expect(notificationCopy({ ...item, is_system: false }, translate)).toEqual({
      title: item.title,
      body: item.body,
    });
  });
});

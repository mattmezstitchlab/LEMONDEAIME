import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { vitrineBotanique } from "../lib/editions/vitrine";

describe("La page Brode Way montre les vrais patrons des oiseaux botaniques", () => {
  it("le fichier du site est exactement celui des dessins (relancer scripts/exporter-vitrine.ts sinon)", () => {
    const site = JSON.parse(readFileSync(resolve(__dirname, "../../../src/lib/oiseaux-botaniques.json"), "utf8"));
    expect(site).toEqual(JSON.parse(JSON.stringify(vitrineBotanique())));
  });
});

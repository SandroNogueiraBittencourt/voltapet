import { describe, expect, it } from "vitest";
import { canReportSighting } from "./sightingAccess";

describe("permissão do botão Visto", () => {
  it("não mostra Visto para o autor", () => {
    expect(canReportSighting({ status: "LOST", isOwner: true })).toBe(false);
  });
  it("mostra Visto para outros usuários", () => {
    expect(canReportSighting({ status: "LOST", isOwner: false })).toBe(true);
  });
  it("não mostra Visto para pet reencontrado ou encontrado", () => {
    expect(canReportSighting({ status: "REUNITED", isOwner: false })).toBe(false);
    expect(canReportSighting({ status: "FOUND", isOwner: false })).toBe(false);
  });
  it("não libera sem informação explícita sobre o autor", () => {
    expect(canReportSighting(null)).toBe(false);
    expect(canReportSighting({ status: "LOST" })).toBe(false);
  });
});

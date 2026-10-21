import { describe, expect, it } from "vitest";
import { localitySearchUrl, locationMapUrls } from "./locationMap";

describe("Mapa da localidade do pet", () => {
  it("gera mapa interativo com posição aproximada", () => {
    const urls = locationMapUrls(-27.596900, -48.549500);
    const embed = new URL(urls.embedUrl);
    expect(embed.hostname).toBe("www.openstreetmap.org");
    expect(embed.searchParams.get("marker")).toBe("-27.6,-48.55");
    expect(urls.fullUrl).toContain("map=13/");
  });
  it("não aceita coordenadas ausentes ou inválidas", () => {
    expect(locationMapUrls(null, null)).toBeNull();
    expect(locationMapUrls(999, 100)).toBeNull();
  });
  it("oferece busca de região quando não há GPS cadastrado", () => {
    expect(decodeURIComponent(localitySearchUrl("Florianópolis", "Centro"))).toContain("Centro, Florianópolis");
  });
});

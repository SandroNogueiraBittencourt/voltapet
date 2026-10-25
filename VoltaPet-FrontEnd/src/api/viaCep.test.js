import { afterEach, describe, expect, it, vi } from "vitest";
import { consultarViaCep, formatarCep } from "./viaCep";

afterEach(() => { vi.unstubAllGlobals(); });

describe("ViaCEP", () => {
  it("formata somente oito dígitos", () => {
    expect(formatarCep("88000000")).toBe("88000-000");
    expect(formatarCep("88.000-000999")).toBe("88000-000");
  });
  it("consulta CEP válido e extrai endereço", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      logradouro: "Rua das Flores", bairro: "Centro", localidade: "Florianópolis", uf: "SC",
    }) });
    vi.stubGlobal("fetch", fetchMock);
    expect(await consultarViaCep("88000-000")).toEqual({
      logradouro: "Rua das Flores", bairro: "Centro", localidade: "Florianópolis",
    });
    expect(fetchMock).toHaveBeenCalledWith("https://viacep.com.br/ws/88000000/json/", expect.any(Object));
  });
  it("não faz requisição com CEP incompleto", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await expect(consultarViaCep("123")).rejects.toThrow(/8 dígitos/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("trata CEP inexistente", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ erro: true }) }));
    await expect(consultarViaCep("99999999")).rejects.toThrow(/não encontrado/);
  });
  it("aceita resposta parcial, sem inventar rua ou bairro", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ logradouro: "", bairro: "", localidade: "Florianópolis" }) }));
    expect(await consultarViaCep("88000000")).toEqual({ logradouro: "", bairro: "", localidade: "Florianópolis" });
  });
});

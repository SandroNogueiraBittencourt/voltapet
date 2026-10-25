import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SightingDialog } from "./SightingDialog";
import { consultarViaCep } from "../api/viaCep";

vi.mock("../api/client", () => ({ apiError: () => "Falha no envio", createSighting: vi.fn() }));
vi.mock("../api/viaCep", () => ({
  consultarViaCep: vi.fn(),
  formatarCep: (value) => {
    const digits = String(value).replace(/\D/g, "").slice(0, 8);
    return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
  },
}));
const pet = { id: "pet-123", name: "Luna" };
const setup = () => render(<SightingDialog pet={pet} session={{ token: "jwt" }} onClose={vi.fn()} onReported={vi.fn()} />);

beforeEach(() => vi.resetAllMocks());

describe("Autopreenchimento ViaCEP em avistamentos", () => {
  it("preenche rua, cidade e bairro ao informar oito dígitos", async () => {
    consultarViaCep.mockResolvedValue({ logradouro: "Rua Teste", localidade: "Florianópolis", bairro: "Centro" });
    setup();
    fireEvent.change(screen.getByPlaceholderText("88000-000"), { target: { value: "88000000" } });
    await waitFor(() => expect(screen.getByPlaceholderText("Nome da rua ou avenida")).toHaveValue("Rua Teste"));
    expect(screen.getByPlaceholderText("Ex.: Florianópolis")).toHaveValue("Florianópolis");
    expect(screen.getByPlaceholderText("Ex.: Centro")).toHaveValue("Centro");
    expect(screen.getByPlaceholderText("88000-000")).toHaveValue("88000-000");
  });
  it("não altera cidade corrigida pelo usuário antes da resposta", async () => {
    let complete;
    consultarViaCep.mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    setup();
    fireEvent.change(screen.getByPlaceholderText("88000-000"), { target: { value: "88000000" } });
    fireEvent.change(screen.getByPlaceholderText("Ex.: Florianópolis"), { target: { value: "São José" } });
    complete({ logradouro: "Rua Teste", localidade: "Florianópolis", bairro: "Centro" });
    await waitFor(() => expect(screen.getByPlaceholderText("Nome da rua ou avenida")).toHaveValue("Rua Teste"));
    expect(screen.getByPlaceholderText("Ex.: Florianópolis")).toHaveValue("São José");
  });
  it("mantém entrada manual quando CEP não existe", async () => {
    consultarViaCep.mockRejectedValue(new Error("CEP não encontrado"));
    setup();
    fireEvent.change(screen.getByPlaceholderText("88000-000"), { target: { value: "99999999" } });
    await screen.findByText("CEP não encontrado");
    fireEvent.change(screen.getByPlaceholderText("Ex.: Centro"), { target: { value: "Bairro informado" } });
    expect(screen.getByPlaceholderText("Ex.: Centro")).toHaveValue("Bairro informado");
  });
  it("descarta resultado de CEP anterior quando o usuário altera o código", async () => {
    const requests = [];
    consultarViaCep.mockImplementation((cep, signal) => new Promise((resolve) => requests.push({ cep, signal, resolve })));
    setup();
    const field = screen.getByPlaceholderText("88000-000");
    fireEvent.change(field, { target: { value: "88000000" } });
    await waitFor(() => expect(requests).toHaveLength(1));
    fireEvent.change(field, { target: { value: "01001000" } });
    await waitFor(() => expect(requests).toHaveLength(2));
    requests[0].resolve({ logradouro: "Rua errada", localidade: "Cidade errada", bairro: "Bairro errado" });
    requests[1].resolve({ logradouro: "Praça da Sé", localidade: "São Paulo", bairro: "Sé" });
    await waitFor(() => expect(screen.getByPlaceholderText("Ex.: Florianópolis")).toHaveValue("São Paulo"));
    expect(screen.getByPlaceholderText("Nome da rua ou avenida")).toHaveValue("Praça da Sé");
  });
});

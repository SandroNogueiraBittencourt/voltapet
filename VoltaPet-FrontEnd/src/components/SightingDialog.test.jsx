import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SightingDialog } from "./SightingDialog";
import { createSighting } from "../api/client";
import { consultarViaCep } from "../api/viaCep";
vi.mock("../api/viaCep", () => ({ consultarViaCep: vi.fn(), formatarCep: (value) => { const digits = String(value).replace(/\D/g, "").slice(0, 8); return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits; } }));

vi.mock("../api/client", () => ({
  apiError: () => "Erro no envio",
  createSighting: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  createSighting.mockResolvedValue({ id: "avistamento-1" });
  consultarViaCep.mockResolvedValue({ logradouro: "", bairro: "", localidade: "" });
});

const pet = { id: "pet-1", name: "Luna" };

function fill() {
  fireEvent.change(screen.getByPlaceholderText("88000-000"), { target: { value: "88000-000" } });
  fireEvent.change(screen.getByPlaceholderText("123 ou S/N"), { target: { value: "42" } });
  fireEvent.change(screen.getByPlaceholderText("Nome da rua ou avenida"), { target: { value: "Rua Teste" } });
  fireEvent.change(screen.getByPlaceholderText("Ex.: Florianópolis"), { target: { value: "Florianópolis" } });
  fireEvent.change(screen.getByPlaceholderText("Ex.: Centro"), { target: { value: "Centro" } });
}

describe("Avistamento de pet", () => {
  it("abre campos de endereço, data e anexos opcionais", () => {
    render(<SightingDialog pet={pet} session={{ token: "jwt" }} onClose={vi.fn()} onReported={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Vi este pet" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Data e horário em que foi visto/)).toBeInTheDocument();
    expect(screen.getByLabelText("Selecionar fotos do avistamento")).toBeInTheDocument();
    expect(screen.getByLabelText("Selecionar vídeo do avistamento")).toBeInTheDocument();
  });

  it("envia dados com endereço e data via API", async () => {
    const onReported = vi.fn();
    render(<SightingDialog pet={pet} session={{ token: "jwt" }} onClose={vi.fn()} onReported={onReported} />);
    fill();
    await waitFor(() => expect(screen.getByRole("button", { name: "Enviar avistamento" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Enviar avistamento" }));
    await waitFor(() => expect(createSighting).toHaveBeenCalledWith("pet-1", expect.objectContaining({
      postalCode: "88000000", street: "Rua Teste", houseNumber: "42", city: "Florianópolis", neighborhood: "Centro",
    }), [], "jwt"));
    expect(onReported).toHaveBeenCalled();
  });

  it("recusa mais de três fotos", () => {
    render(<SightingDialog pet={pet} session={{ token: "jwt" }} onClose={vi.fn()} onReported={vi.fn()} />);
    const files = [1, 2, 3, 4].map((n) => new File(["abc"], `${n}.jpg`, { type: "image/jpeg" }));
    fireEvent.change(screen.getByLabelText("Selecionar fotos do avistamento"), { target: { files } });
    expect(screen.getByRole("alert")).toHaveTextContent("no máximo três fotos");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PublishDialog } from "./PublishDialog";
import { publishPet } from "../api/client";

vi.mock("../api/client", () => ({
  apiError: () => "Erro de teste",
  publishPet: vi.fn(),
  uploadPetPhotos: vi.fn(),
}));

function renderForm() {
  return render(<PublishDialog
    defaultStatus="LOST"
    session={{ token: "token" }}
    onClose={vi.fn()}
    onPublished={vi.fn()}
  />);
}

beforeEach(() => {
  publishPet.mockReset();
  publishPet.mockResolvedValue({ id: "pet-123" });
});

describe("Publicação com Outro animal", () => {
  it("esconde o campo ao escolher Cachorro ou Gato", () => {
    renderForm();
    expect(screen.queryByLabelText(/Qual animal/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Tipo de animal/i), { target: { value: "CAT" } });
    expect(screen.queryByLabelText(/Qual animal/i)).not.toBeInTheDocument();
  });

  it("mostra campo obrigatório para Outro e oculta ao voltar", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/Tipo de animal/i), { target: { value: "OTHER" } });
    expect(screen.getByLabelText(/Qual animal/i)).toBeRequired();
    fireEvent.change(screen.getByLabelText(/Tipo de animal/i), { target: { value: "DOG" } });
    expect(screen.queryByLabelText(/Qual animal/i)).not.toBeInTheDocument();
  });

  it("envia nome da espécie junto com tipo OTHER", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/Tipo de animal/i), { target: { value: "OTHER" } });
    fireEvent.change(screen.getByLabelText(/Qual animal/i), { target: { value: "Tartaruga" } });
    fireEvent.change(screen.getByPlaceholderText(/Luna ou Não identificado/i), { target: { value: "Titi" } });
    fireEvent.change(screen.getByPlaceholderText(/Florianópolis/i), { target: { value: "Florianópolis" } });
    fireEvent.change(screen.getByPlaceholderText(/Trindade/i), { target: { value: "Centro" } });
    fireEvent.change(screen.getByPlaceholderText(/Cor, porte/i), { target: { value: "Encontrada próxima à praça central." } });
    fireEvent.click(screen.getByRole("button", { name: /^Publicar ocorrência$/i }));
    await waitFor(() => expect(publishPet).toHaveBeenCalledWith(
      expect.objectContaining({ type: "OTHER", otherAnimalType: "Tartaruga", name: "Titi" }), "token"));
  });
});

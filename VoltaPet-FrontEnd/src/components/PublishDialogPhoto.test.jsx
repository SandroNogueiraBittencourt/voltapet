import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PublishDialog } from "./PublishDialog";
import { publishPet, uploadPetPhoto } from "../api/client";

vi.mock("../api/client", () => ({
  apiError: () => "Falha no servidor",
  publishPet: vi.fn(),
  uploadPetPhoto: vi.fn(),
}));

function renderDialog(onPublished = vi.fn()) {
  render(<PublishDialog
    defaultStatus="LOST"
    session={{ token: "token-de-teste" }}
    onClose={vi.fn()}
    onPublished={onPublished}
  />);
  fireEvent.change(screen.getByPlaceholderText(/Luna ou Não identificado/i), { target: { value: "Luna" } });
  fireEvent.change(screen.getByPlaceholderText(/Florianópolis/i), { target: { value: "Florianópolis" } });
  fireEvent.change(screen.getByPlaceholderText(/Trindade/i), { target: { value: "Centro" } });
  fireEvent.change(screen.getByPlaceholderText(/Cor, porte/i), { target: { value: "Cachorra vista perto da praça." } });
  const file = new File(["conteudo"], "luna.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Escolher foto do pet"), { target: { files: [file] } });
  return file;
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
  publishPet.mockReset();
  uploadPetPhoto.mockReset();
  publishPet.mockResolvedValue({ id: "pet-123" });
  uploadPetPhoto.mockResolvedValue({ id: "pet-123", photoUrl: "/api/v1/pets/pet-123/photo" });
});

describe("PublishDialog — envio de foto", () => {
  it("publica a ocorrência, envia a foto autenticada e conclui", async () => {
    const onPublished = vi.fn();
    const file = renderDialog(onPublished);
    fireEvent.click(screen.getByRole("button", { name: "Publicar ocorrência" }));
    await waitFor(() => expect(uploadPetPhoto).toHaveBeenCalledWith("pet-123", file, "token-de-teste"));
    await waitFor(() => expect(onPublished).toHaveBeenCalledWith(expect.objectContaining({ photoUrl: "/api/v1/pets/pet-123/photo" })));
  });

  it("tenta novamente somente o upload quando a foto falha", async () => {
    uploadPetPhoto.mockRejectedValueOnce(new Error("falha"));
    const onPublished = vi.fn();
    const file = renderDialog(onPublished);
    fireEvent.click(screen.getByRole("button", { name: "Publicar ocorrência" }));
    expect(await screen.findByText(/Ocorrência salva, mas a foto não foi enviada/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar enviar foto novamente" }));
    await waitFor(() => expect(uploadPetPhoto).toHaveBeenCalledTimes(2));
    expect(publishPet).toHaveBeenCalledTimes(1);
    expect(uploadPetPhoto).toHaveBeenLastCalledWith("pet-123", file, "token-de-teste");
  });
});

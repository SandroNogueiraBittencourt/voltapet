import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PublishDialog } from "./PublishDialog";
import { publishPet, uploadPetPhotos } from "../api/client";

vi.mock("../api/client", () => ({
  apiError: () => "Falha no servidor",
  publishPet: vi.fn(),
  uploadPetPhotos: vi.fn(),
}));

function renderDialog(onPublished = vi.fn()) {
  render(<PublishDialog defaultStatus="LOST" session={{ token: "jwt" }} onClose={vi.fn()} onPublished={onPublished} />);
  fireEvent.change(screen.getByPlaceholderText(/Luna ou Não identificado/i), { target: { value: "Luna" } });
  fireEvent.change(screen.getByPlaceholderText(/Florianópolis/i), { target: { value: "Florianópolis" } });
  fireEvent.change(screen.getByPlaceholderText(/Trindade/i), { target: { value: "Centro" } });
  fireEvent.change(screen.getByPlaceholderText(/Cor, porte/i), { target: { value: "Uma cachorra vista perto da praça." } });
  const files = ["luna1.png", "luna2.png", "luna3.png"].map((name) => new File(["conteudo"], name, { type: "image/png" }));
  fireEvent.change(screen.getByLabelText("Escolher fotos do pet"), { target: { files } });
  return files;
}

beforeEach(() => {
  URL.createObjectURL = vi.fn((file) => `blob:${file.name}`);
  URL.revokeObjectURL = vi.fn();
  publishPet.mockReset();
  uploadPetPhotos.mockReset();
  publishPet.mockResolvedValue({ id: "pet-123" });
  uploadPetPhotos.mockResolvedValue({ id: "pet-123", photoUrls: ["/foto1", "/foto2", "/foto3"] });
});

describe("PublishDialog — 3 fotos", () => {
  it("publica a ocorrência e envia três imagens de uma vez", async () => {
    const onPublished = vi.fn();
    const files = renderDialog(onPublished);
    fireEvent.click(screen.getByRole("button", { name: "Publicar ocorrência" }));
    await waitFor(() => expect(uploadPetPhotos).toHaveBeenCalledWith("pet-123", files, "jwt"));
    await waitFor(() => expect(onPublished).toHaveBeenCalledWith(expect.objectContaining({ photoUrls: ["/foto1", "/foto2", "/foto3"] })));
  });
  it("repete somente upload quando falha, sem duplicar ocorrência", async () => {
    uploadPetPhotos.mockRejectedValueOnce(new Error("falha"));
    const files = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Publicar ocorrência" }));
    expect(await screen.findByText(/Ocorrência salva, mas as fotos não foram enviadas/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar enviar fotos novamente" }));
    await waitFor(() => expect(uploadPetPhotos).toHaveBeenCalledTimes(2));
    expect(uploadPetPhotos).toHaveBeenLastCalledWith("pet-123", files, "jwt");
    expect(publishPet).toHaveBeenCalledTimes(1);
  });
});

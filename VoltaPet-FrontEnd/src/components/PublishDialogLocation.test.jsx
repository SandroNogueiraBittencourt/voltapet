import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PublishDialog } from "./PublishDialog";
import { publishPet } from "../api/client";

vi.mock("../api/client", () => ({
  apiError: () => "Falha no servidor",
  publishPet: vi.fn(),
  uploadPetPhotos: vi.fn(),
}));

const samplePosition = {
  coords: { latitude: -27.59691234, longitude: -48.54951234, accuracy: 24.6 },
};

function renderDialog() {
  return render(<PublishDialog
    defaultStatus="LOST"
    session={{ token: "jwt-de-teste" }}
    onClose={vi.fn()}
    onPublished={vi.fn()}
  />);
}

function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText(/Luna ou Não identificado/i), { target: { value: "Luna" } });
  fireEvent.change(screen.getByPlaceholderText(/Florianópolis/i), { target: { value: "Florianópolis" } });
  fireEvent.change(screen.getByPlaceholderText(/Trindade/i), { target: { value: "Centro" } });
  fireEvent.change(screen.getByPlaceholderText(/Cor, porte/i), { target: { value: "Desapareceu perto do parque." } });
}

function mockAddress(address = { city: "Florianópolis", suburb: "Trindade" }) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ address }),
  }));
}

async function getLocationAndWait() {
  fireEvent.click(screen.getByRole("button", { name: /Usar minha localização atual/i }));
  await screen.findByText(/Precisão estimada: ±25 m/i);
  await waitFor(() => expect(screen.queryByRole("button", { name: /Consultando endereço/i })).not.toBeInTheDocument());
}

describe("PublishDialog — geolocalização e endereço automático", () => {
  let getCurrentPosition;

  beforeEach(() => {
    getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    mockAddress();
    publishPet.mockReset();
    publishPet.mockResolvedValue({ id: "pet-123" });
  });

  afterEach(() => {
    delete navigator.geolocation;
    vi.unstubAllGlobals();
  });

  it("não solicita localização nem endereço automaticamente", () => {
    renderDialog();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preenche cidade e bairro a partir das coordenadas, após autorização", async () => {
    getCurrentPosition.mockImplementation((success) => success(samplePosition));
    renderDialog();
    await getLocationAndWait();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toMatch(/nominatim.openstreetmap.org\/reverse/);
    expect(screen.getByPlaceholderText(/Florianópolis/i)).toHaveValue("Florianópolis");
    expect(screen.getByPlaceholderText(/Trindade/i)).toHaveValue("Trindade");
  });

  it("publica as coordenadas e preserva os valores manuais", async () => {
    getCurrentPosition.mockImplementation((success) => success(samplePosition));
    renderDialog();
    await getLocationAndWait();
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /^Publicar ocorrência$/i }));
    await waitFor(() => {
      expect(publishPet).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: -27.596912,
          longitude: -48.549512,
          city: "Florianópolis",
          neighborhood: "Centro",
        }),
        "jwt-de-teste",
      );
    });
  });

  it("permite remover coordenadas antes de publicar", async () => {
    getCurrentPosition.mockImplementation((success) => success(samplePosition));
    renderDialog();
    await getLocationAndWait();
    fireEvent.click(screen.getByRole("button", { name: /Remover/i }));
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /^Publicar ocorrência$/i }));
    await waitFor(() => expect(publishPet).toHaveBeenCalled());
    const payload = publishPet.mock.calls[0][0];
    expect(payload).not.toHaveProperty("latitude");
    expect(payload).not.toHaveProperty("longitude");
  });

  it("mostra erro de permissão sem impedir preenchimento manual", () => {
    getCurrentPosition.mockImplementation((_, error) => error({ code: 1 }));
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Usar minha localização atual/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Permissão negada/i);
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^Publicar ocorrência$/i })).toBeEnabled();
  });

  it("quando a precisão é ruim, preenche cidade e não inventa bairro", async () => {
    getCurrentPosition.mockImplementation((success) => success({
      coords: { ...samplePosition.coords, accuracy: 4692 },
    }));
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Usar minha localização atual/i }));
    await waitFor(() => expect(screen.getByPlaceholderText(/Florianópolis/i)).toHaveValue("Florianópolis"));
    expect(screen.getByPlaceholderText(/Trindade/i)).toHaveValue("");
    expect(screen.getByText(/localização é imprecisa/i)).toBeInTheDocument();
  });

  it("se a consulta de endereço falhar, preserva coordenadas e permite digitação", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("rede indisponível")));
    getCurrentPosition.mockImplementation((success) => success(samplePosition));
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Usar minha localização atual/i }));
    expect(await screen.findByText(/Não foi possível consultar cidade e bairro agora/i)).toBeInTheDocument();
    expect(screen.getByText(/Precisão estimada: ±25 m/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Florianópolis/i)).toHaveValue("");
    expect(screen.getByRole("button", { name: /^Publicar ocorrência$/i })).toBeEnabled();
  });

  it("não substitui cidade e bairro preenchidos pela pessoa", async () => {
    getCurrentPosition.mockImplementation((success) => success(samplePosition));
    renderDialog();
    fireEvent.change(screen.getByPlaceholderText(/Florianópolis/i), { target: { value: "São José" } });
    fireEvent.change(screen.getByPlaceholderText(/Trindade/i), { target: { value: "Kobrasol" } });
    await getLocationAndWait();
    expect(screen.getByPlaceholderText(/Florianópolis/i)).toHaveValue("São José");
    expect(screen.getByPlaceholderText(/Trindade/i)).toHaveValue("Kobrasol");
  });

  it("remover localização cancela preenchimentos de consultas pendentes", async () => {
    let resolveLookup;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise((resolve) => { resolveLookup = resolve; })));
    getCurrentPosition.mockImplementation((success) => success(samplePosition));
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Usar minha localização atual/i }));
    fireEvent.click(screen.getByRole("button", { name: /Remover/i }));
    resolveLookup({ ok: true, json: async () => ({ address: { city: "Florianópolis", suburb: "Centro" } }) });
    await waitFor(() => expect(screen.queryByText(/Coordenadas:/i)).not.toBeInTheDocument());
    expect(screen.getByPlaceholderText(/Florianópolis/i)).toHaveValue("");
    expect(screen.getByPlaceholderText(/Trindade/i)).toHaveValue("");
  });
});

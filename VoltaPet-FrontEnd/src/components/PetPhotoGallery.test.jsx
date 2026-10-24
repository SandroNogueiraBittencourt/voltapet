import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PetPhotoGallery } from "./PetPhotoGallery";

const pet = { id: "123", name: "Luna", type: "DOG", photoUrl: "/legacy", photoUrls: ["/foto1", "/foto2", "/foto3"] };

describe("PetPhotoGallery", () => {
  it("mostra três miniaturas e alterna a foto principal", () => {
    render(<PetPhotoGallery pet={pet} />);
    expect(screen.getByRole("img", { name: "Foto 1 de Luna" })).toHaveAttribute("src", "/foto1");
    fireEvent.click(screen.getByRole("button", { name: "Ver foto 3" }));
    expect(screen.getByRole("img", { name: "Foto 3 de Luna" })).toHaveAttribute("src", "/foto3");
    expect(screen.getByRole("button", { name: "Ver foto 3" })).toHaveAttribute("aria-pressed", "true");
  });
  it("preserva compatibilidade com foto única antiga", () => {
    render(<PetPhotoGallery pet={{ ...pet, photoUrls: undefined }} />);
    expect(screen.getByRole("img", { name: "Foto 1 de Luna" })).toHaveAttribute("src", "/legacy");
    expect(screen.queryByRole("button", { name: "Ver foto 2" })).not.toBeInTheDocument();
  });
});

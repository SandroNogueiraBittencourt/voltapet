import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PetCard } from "./PetCard";

describe("PetCard", () => {
  it("exibe ocorrência e link de detalhes", () => {
    render(<MemoryRouter><PetCard pet={{ id: "pet-123", name: "Luna", type: "DOG", status: "LOST", city: "Florianópolis", neighborhood: "Trindade", description: "Cachorra marrom" }} /></MemoryRouter>);
    expect(screen.getByText("Luna")).toBeInTheDocument();
    expect(screen.getByText("Desaparecido")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver detalhes/i })).toHaveAttribute("href", "/pets/pet-123");
  });
});

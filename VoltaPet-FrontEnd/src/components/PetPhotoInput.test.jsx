import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PetPhotoInput } from "./PetPhotoInput";

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

describe("PetPhotoInput", () => {
  it("exibe prévia e permite remover a imagem", () => {
    const onChange = vi.fn();
    render(<PetPhotoInput onChange={onChange} />);
    const file = new File(["abc"], "luna.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Escolher foto do pet"), { target: { files: [file] } });
    expect(screen.getByAltText("Prévia da foto selecionada do pet")).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(file);
    fireEvent.click(screen.getByRole("button", { name: "Remover foto" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("rejeita tipos não permitidos", () => {
    const onChange = vi.fn();
    render(<PetPhotoInput onChange={onChange} />);
    const file = new File(["text"], "arquivo.txt", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText("Escolher foto do pet"), { target: { files: [file] } });
    expect(screen.getByRole("alert")).toHaveTextContent("JPG ou PNG");
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

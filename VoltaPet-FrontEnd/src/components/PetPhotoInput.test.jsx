import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PetPhotoInput } from "./PetPhotoInput";

beforeEach(() => {
  URL.createObjectURL = vi.fn((file) => `blob:${file.name}`);
  URL.revokeObjectURL = vi.fn();
});

const makePhoto = (name = "foto.png") => new File(["abc"], name, { type: "image/png" });
const choose = (files) => fireEvent.change(screen.getByLabelText("Escolher fotos do pet"), { target: { files } });

describe("PetPhotoInput", () => {
  it("permite três imagens e remoção individual", () => {
    const onChange = vi.fn();
    render(<PetPhotoInput onChange={onChange} />);
    const files = [makePhoto("a.png"), makePhoto("b.png"), makePhoto("c.png")];
    choose(files);
    expect(screen.getAllByAltText(/Prévia da foto/i)).toHaveLength(3);
    expect(onChange).toHaveBeenLastCalledWith(files);
    expect(screen.queryByLabelText("Escolher fotos do pet")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remover foto 2" }));
    expect(onChange).toHaveBeenLastCalledWith([files[0], files[2]]);
    expect(screen.getAllByAltText(/Prévia da foto/i)).toHaveLength(2);
  });

  it("rejeita mais de três fotos sem perder as anteriores", () => {
    const onChange = vi.fn();
    render(<PetPhotoInput onChange={onChange} />);
    choose([makePhoto("a.png"), makePhoto("b.png")]);
    choose([makePhoto("c.png"), makePhoto("d.png")]);
    expect(screen.getByRole("alert")).toHaveTextContent("no máximo 3");
    expect(screen.getAllByAltText(/Prévia da foto/i)).toHaveLength(2);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("rejeita formatos não suportados", () => {
    const onChange = vi.fn();
    render(<PetPhotoInput onChange={onChange} />);
    choose([new File(["texto"], "texto.txt", { type: "text/plain" })]);
    expect(screen.getByRole("alert")).toHaveTextContent("JPG ou PNG");
    expect(onChange).not.toHaveBeenCalled();
  });
});

import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Com o Vitest usando globals: false, o auto-cleanup do Testing Library
// pode nao ser registrado. Desmontamos o DOM apos cada teste.
afterEach(() => {
  cleanup();
});

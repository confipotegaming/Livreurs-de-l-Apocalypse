import { defineConfig } from "vitest/config";

// Tests automatiques (npm test) : uniquement la logique du jeu (dossier tests/), sans navigateur.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});

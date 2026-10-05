import { describe, expect, it } from "vitest";
import { MachineAEtats } from "../src/client/core/machine";
import { PASSAGES, type Ecran } from "../src/client/core/ecrans";

function machineDeTest() {
  const journal: string[] = [];
  const etats = Object.fromEntries(
    (Object.keys(PASSAGES) as Ecran[]).map((e) => [
      e,
      { entrer: (depuis: Ecran | null) => journal.push(`entrer ${e} depuis ${depuis}`), sortir: () => journal.push(`sortir ${e}`) },
    ]),
  ) as unknown as Record<Ecran, { entrer(d: Ecran | null): void; sortir(): void }>;
  return { machine: new MachineAEtats<Ecran>(etats, PASSAGES), journal };
}

describe("machine à états des écrans", () => {
  it("fait la boucle complète menu → QG → chargement → tournée → récap → QG", () => {
    const { machine } = machineDeTest();
    for (const e of ["menu", "qg", "chargement", "tournee", "recap", "qg"] as const) machine.aller(e);
    expect(machine.actuel).toBe("qg");
  });

  it("appelle sortir puis entrer, dans cet ordre", () => {
    const { machine, journal } = machineDeTest();
    machine.aller("menu");
    machine.aller("qg");
    expect(journal).toEqual(["entrer menu depuis null", "sortir menu", "entrer qg depuis menu"]);
  });

  it("refuse les passages interdits", () => {
    const { machine } = machineDeTest();
    machine.aller("menu");
    expect(() => machine.aller("recap")).toThrow(/interdit/);
    expect(machine.actuel).toBe("menu");
  });

  it("les options reviennent à l'écran d'origine", () => {
    const { machine } = machineDeTest();
    for (const e of ["menu", "qg", "chargement", "tournee", "options"] as const) machine.aller(e);
    machine.retour();
    expect(machine.actuel).toBe("tournee");
  });

  it("chaque écran a au moins une sortie (on ne reste jamais bloqué)", () => {
    for (const sorties of Object.values(PASSAGES)) expect(sorties.length).toBeGreaterThan(0);
  });
});

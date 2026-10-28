import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPrompt, pollinationsUrl, requestedColorLimit } from "../lib/promptcraft";
import { flossIndex } from "../lib/dmc";
import PromptStudio from "../components/PromptStudio";
import { loadRemoteImage } from "../lib/convert";
import { imageToDmc } from "../lib/dither";

vi.mock("../lib/convert", () => ({ loadRemoteImage: vi.fn() }));
vi.mock("../lib/dither", () => ({ imageToDmc: vi.fn() }));
let root: Root | undefined, host: HTMLDivElement | undefined;
afterEach(async () => { await act(async () => root?.unmount()); host?.remove(); root = undefined; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const input = { subject: 'Deux chats dans un jardin bleu, avec le prénom « Léa »', main: "", second: "", relation: "", style: "description" as const, detail: "equilibre" as const, format: "carre" as const };
describe("Description fidèle et génération unifiée", () => {
  it("préserve intégralement scène, couleurs et texte sans contraintes contradictoires", () => {
    const prompt = buildPrompt(input);
    expect(prompt).toContain(input.subject);
    for (const forbidden of ["centered single subject", "plain solid white background", "no letters", "no extra objects", "photorealistic"]) expect(prompt).not.toContain(forbidden);
    const url = new URL(pollinationsUrl(prompt, 1024, 1024, 42));
    expect(url.searchParams.get("enhance")).toBe("false");
    expect(decodeURIComponent(url.pathname)).toContain(input.subject);
  });
  it("applique des limites explicites pour plusieurs sujets sans catalogue prédéfini", () => {
    for (const subject of ["papillon bleu", "portrait de famille", "montagne au soleil", "motif abstrait"]) expect(requestedColorLimit(subject + " 30 couleurs")).toBe(30);
    expect(requestedColorLimit("deux chats")).toBeNull();
    expect(() => requestedColorLimit("chat 100 couleurs")).toThrow();
  });
  it("garde la description même avec des sujets et un style précisés", () => {
    const prompt = buildPrompt({ ...input, main: "chat roux", second: "chat noir", relation: "côte à côte", style: "minimal" });
    expect(prompt).toContain(input.subject);
    expect(prompt).toContain("chat roux"); expect(prompt).toContain("chat noir"); expect(prompt).toContain("côte à côte");
  });
  it("un clic génère le patron et le place automatiquement dans la grille intégrée", async () => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok:true,blob:async()=>new Blob(["image"])}));
    vi.stubGlobal("URL", Object.assign(URL, {createObjectURL:vi.fn(()=>"blob:test"), revokeObjectURL:vi.fn()}));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn(), fillRect: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,AA==");
    vi.mocked(loadRemoteImage).mockResolvedValue({ src: "data:image/png;base64,AA==" } as HTMLImageElement);
    vi.mocked(imageToDmc).mockImplementation((_image, w, h) => ({ cross: new Int16Array(w * h).fill(flossIndex("321")), palette: [flossIndex("321")] }));
    const onImport = vi.fn();
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    await act(async () => root!.render(<PromptStudio initialPrompt={input.subject + " 30 couleurs"} onClose={vi.fn()} onImport={onImport} embedded/>));
    const find = (text: string) => [...host!.querySelectorAll("button")].find(b => b.textContent?.includes(text))!;
    await act(async () => find("Générer mon motif").click());
    expect(loadRemoteImage).toHaveBeenCalledTimes(1);
    expect(imageToDmc).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(find("Utiliser dans ma grille")).toBeUndefined();
    expect(onImport.mock.calls[0][0].notes).toContain(input.subject);
    expect(vi.mocked(imageToDmc).mock.calls[0][3].dropWhite).toBe(false);
    expect(vi.mocked(imageToDmc).mock.calls[0][3].maxColors).toBe(30);
    await act(async () => {
      const textarea = host!.querySelector("textarea")!;
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(textarea, "Une nouvelle scène");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onImport).toHaveBeenCalledTimes(1);
  });
});

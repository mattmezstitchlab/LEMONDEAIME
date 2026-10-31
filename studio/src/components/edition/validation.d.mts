export interface Ecart { chemin: string; raison: string }
export declare const LIMITES: { titre: number; court: number; long: number };
export declare const LICENCES: readonly string[];
export declare function srcOk(v: unknown): boolean;
export declare function urlOk(v: string): boolean;
export declare function valider<T>(origine: T, brut: unknown): { contenus: T; ecarts: Ecart[] };

/** .0NE — les pictogrammes nommés du registre, dessinés (les données ne portent aucun composant). */
import { Bookmark, BookOpen, Calendar, Camera, Clock, Compass, Download, Eye, FileText, Flag, Folder, FolderTree, Gem, Image as ImageIcon, Info, Layers, Lightbulb, LayoutGrid, Leaf,
  Link2, Music, Network, Palette, PenTool, Plug, Plus, Scissors, Search, Settings2, Share2, ShieldCheck, ShoppingBag, ShoppingCart, Sliders, Sparkles, Spool, SquareStack, Upload, Users, Volume2, Wand2, Zap, TerminalSquare, GitBranch, History, type LucideIcon } from "lucide-react";
import type { Icone } from "../../lib/one/contrat";

const TABLE: Record<Icone, LucideIcon> = {
  aiguille: Scissors, anneaux: Gem, note: Music, livre: BookOpen, palette: Palette, reseau: Network, dossier: Folder, sac: ShoppingBag, horloge: Clock, lecture: ImageIcon,
  carte: SquareStack, prise: Plug, fils: Spool, points: PenTool, loupe: Search, oeil: Eye, import: Upload, export: Download, personnes: Users, lumiere: Lightbulb,
  son: Volume2, regie: Sliders, document: FileText, agenda: Calendar, visite: Compass, outils: Wand2, matiere: Layers, formats: LayoutGrid, galerie: ImageIcon,
  nouveau: Plus, chercher: Search, ranger: FolderTree, partager: Share2, categories: LayoutGrid, panier: ShoppingCart, jalons: Flag, cadrage: Camera, reglages: Settings2,
  favoris: Bookmark, autorisations: ShieldCheck, raccourcis: Zap, plante: Leaf, presentation: Sparkles, infos: Info, terminal: TerminalSquare, git: GitBranch, historique: History, executer: TerminalSquare,
};
export function IconeOne({ nom, taille }: { nom: Icone; taille?: number }) { const I = TABLE[nom] ?? Link2; return <I aria-hidden="true" size={taille} />; }

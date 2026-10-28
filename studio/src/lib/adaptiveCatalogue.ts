import { previewBoutiqueVariants, type AdaptationMode, type BrodeuseProfile, type AdaptationResult } from "./brodeuseProfile";
import { type Pattern } from "./pattern";

/**
 * Future shop adapter only: no purchase, payment or publication operation.
 * Public eligibility is evaluated by the future rights-review workflow,
 * not inferred from a file import or from "personalOnly = false".
 */
export interface CatalogueRights {
  ownerName: string;
  distributionPermission: "unknown" | "personal" | "commercial";
  evidenceReference: string;
  reviewed: boolean; // manual review status from a trusted future backoffice
}
export interface CatalogueVariant {
  mode:AdaptationMode;
  title:string;
  pattern:Pattern; // Source of truth for preview, downloadable file and PDF
  warnings:string[];
  colorCodes:string[];
  substitutions:AdaptationResult["report"]["substitutions"];
}
export interface AdaptiveCataloguePreview {
  status:"private_preview"|"needs_rights_review";
  publishable:boolean;
  variants:CatalogueVariant[];
  rightsWarning:string;
}
export function prepareAdaptiveCatalogue(template:Pattern,profile:BrodeuseProfile,rights:CatalogueRights):AdaptiveCataloguePreview {
  const publishable=rights.reviewed&&rights.distributionPermission==="commercial"&&
    rights.evidenceReference.trim().length>0&&rights.ownerName.trim().length>0&&
    template.provenance?.personalOnly===false;
  const variants=previewBoutiqueVariants(template,profile).map(({pattern,report})=>({
    mode:report.mode,
    title:({original:"Original",stock:"Adaptée à mes fils",debutant:"Débutant",
      expert:"Expert",petit:"Petit format (à vérifier)",reduite:"Palette réduite"} as Record<AdaptationMode,string>)[report.mode],
    pattern,warnings:report.warnings,colorCodes:report.usedCodes,substitutions:report.substitutions,
  }));
  return {status:publishable?"private_preview":"needs_rights_review",publishable,
    variants,rightsWarning:publishable?
      "Licence déclarée révisée. Publication et paiement non disponibles dans ce prototype.":
      "Vente désactivée : aucun droit commercial confirmé ou licence incompatible. Aperçus réservés à l'usage personnel."};
}

/**
 * Types pour le formulaire immobilier
 */

export interface FormData {
  typeLogement: 'Maison' | 'Appartement' | null
  anneeConstruction: 'Avant 1975' | '1975-1988' | '1989-2000' | '2001-2012' | 'Après 2012' | null
  surface: number | null
  niveauxChaufees: 1 | 2 | 3 | 4 | null
  mitoyennete: 'Isolé' | '1 côté' | '2 côtés' | 'Maison de ville' | null
  typeToit: 'Combles perdus' | 'Combles aménagés' | 'Toit plat' | null
}

export type FormField = keyof FormData

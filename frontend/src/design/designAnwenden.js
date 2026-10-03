import { gueltigesDesign } from './designSpeicher.js';

export function designAnwenden(design) {
  document.documentElement.dataset.design = gueltigesDesign(design);
}

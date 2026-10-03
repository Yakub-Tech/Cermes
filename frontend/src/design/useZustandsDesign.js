import { useLayoutEffect } from 'react';
import { designLesen } from './designSpeicher.js';
import { designAnwenden } from './designAnwenden.js';

export function useZustandsDesign(design) {
  useLayoutEffect(() => {
    designAnwenden(design);
    return () => designAnwenden(designLesen(() => localStorage));
  }, [design]);
}

// Tipos para @blex41/word-search (la librería no trae los suyos).
// Solo declaramos lo que usamos: grid + words con su path de coordenadas.
declare module "@blex41/word-search" {
  interface WordSearchOptions {
    cols?: number;
    rows?: number;
    dictionary?: string[];
    disabledDirections?: string[];
    maxWords?: number;
    backwardsProbability?: number;
    upperCase?: boolean;
    diacritics?: boolean;
    forbiddenWords?: string[];
    maxRetries?: number;
  }

  interface WordSearchPlaced {
    word: string;
    clean: string;
    path: { x: number; y: number }[];
  }

  export default class WordSearch {
    constructor(options?: WordSearchOptions);
    grid: string[][];
    words: WordSearchPlaced[];
    forbiddenWordsIncluded: string[];
    toString(): string;
    read(start: { x: number; y: number }, end: { x: number; y: number }): string;
    dump(): unknown;
    load(backup: unknown): void;
  }
}

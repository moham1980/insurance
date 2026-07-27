declare module 'tesseract.js' {
  export function recognize(
    image: Buffer | string,
    language: string,
    options?: { logger?: (m: any) => void }
  ): Promise<{
    data: {
      text: string;
      confidence: number;
      words: Array<{
        text: string;
        confidence: number;
        bbox: { x0: number; y0: number; x1: number; y1: number };
      }>;
    };
  }>;
}

declare module '@google-cloud/vision' {
  export class ImageAnnotatorClient {
    constructor(options?: any);
    documentTextDetection(request: { image: { content: string } }): Promise<[any]>;
  }
}

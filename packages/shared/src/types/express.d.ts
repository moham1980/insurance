declare module 'express' {
  import { EventEmitter } from 'events';

  export interface Request {
    [key: string]: any;
    body?: any;
    params: Record<string, string>;
    query: Record<string, string | string[]>;
    headers: Record<string, string | string[] | undefined>;
    ip?: string;
    method: string;
    path: string;
    url: string;
    route?: any;
  }

  export interface Response {
    [key: string]: any;
    status(code: number): Response;
    json(body: any): Response;
    send(body: any): Response;
    set(field: string, value: string): Response;
    setHeader(name: string, value: string | number | string[]): Response;
    statusCode: number;
    on(event: string, listener: (...args: any[]) => void): Response;
  }

  export interface NextFunction {
    (err?: any): void;
  }

  export interface RequestHandler {
    (req: Request, res: Response, next: NextFunction): any;
  }

  export interface ErrorRequestHandler {
    (err: any, req: Request, res: Response, next: NextFunction): any;
  }

  export interface Application extends EventEmitter {
    use(path: string, handler: RequestHandler | ErrorRequestHandler | Application): Application;
    use(handler: RequestHandler | ErrorRequestHandler | Application): Application;
    get(path: string, handler: RequestHandler): Application;
    post(path: string, handler: RequestHandler): Application;
    listen(port: number, callback?: () => void): any;
  }

  export function json(): RequestHandler;
  export function urlencoded(options: { extended: boolean }): RequestHandler;

  export default function express(): Application;
}

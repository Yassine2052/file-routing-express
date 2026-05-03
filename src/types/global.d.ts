import "express";

declare module "express-serve-static-core" {
  interface Request {
    signal?: AbortSignal;
    id: string;
    [key: symbol]: any
  }
}
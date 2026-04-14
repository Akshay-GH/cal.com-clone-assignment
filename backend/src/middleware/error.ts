import { NextFunction, Request, Response } from "express";

type AppError = Error & {
  status?: number;
  details?: unknown;
};

function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Route not found" });
}

function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Internal server error",
    details: err.details || undefined,
  });
}

export { errorHandler, notFound };

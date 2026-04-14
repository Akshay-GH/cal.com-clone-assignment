import { NextFunction, Request, Response } from "express";
import { ZodError, ZodType } from "zod";

function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.flatten(),
        });
      }

      return next(error);
    }
  };
}

export { validateBody };

import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import adminAvailabilityRouter from "./routes/admin/availability";
import adminBookingsRouter from "./routes/admin/bookings";
import adminEventTypesRouter from "./routes/admin/event-types";
import { errorHandler, notFound } from "./middleware/error";
import publicRouter from "./routes/public/booking";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/admin/event-types", adminEventTypesRouter);
app.use("/api/admin/availability", adminAvailabilityRouter);
app.use("/api/admin/bookings", adminBookingsRouter);
app.use("/api/public", publicRouter);

app.use(notFound);
app.use(errorHandler);

export { app };

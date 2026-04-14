import dotenv from "dotenv";

import { app } from "./app";

dotenv.config();

const PORT = Number(process.env.PORT || 3001);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

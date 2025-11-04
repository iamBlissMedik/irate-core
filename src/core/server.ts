import { createApp } from "./app";
const PORT = process.env.PORT || 8000;

(async () => {
  const app = await createApp();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})();

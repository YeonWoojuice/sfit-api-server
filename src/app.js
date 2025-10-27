const express = require("express");
const router = require("./routes");

function createApp() {
  const app = express();

  app.use(express.json());

  app.use("/api", router);

  app.use((req, res) => {
    res.status(404).json({ message: "Not Found" });
  });

  return app;
}

module.exports = createApp;

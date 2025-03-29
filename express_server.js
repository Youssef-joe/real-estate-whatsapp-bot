const express = require("express");
const path = require("path");
const fs = require("fs");

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the presentations directory
app.use(
  "/presentations",
  express.static(path.join(__dirname, "presentations"), {
    setHeaders: (res, path) => {
      if (path.endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
      }
    },
  })
);

// Error handling for static files
app.use((err, req, res, next) => {
  console.error("Static file error:", err);
  res.status(500).send("Error serving file");
});

// Health check endpoint for Render
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Start the server
app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});

module.exports = app;

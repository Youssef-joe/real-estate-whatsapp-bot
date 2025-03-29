const express = require("express");
const path = require("path");
const fs = require("fs");

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the presentations directory
app.use(
  "/presentations",
  express.static(path.join(__dirname, "presentations"))
);

// Health check endpoint for Render
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Start the server
app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});

module.exports = app;

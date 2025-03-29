const express = require("express");
const { google } = require("googleapis");
const fs = require("fs").promises;
const config = require("./config");

const app = express();
const port = process.env.PORT || 3000;

// Initialize OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  config.google.credentials.client_id,
  config.google.credentials.client_secret,
  config.google.credentials.redirect_uris[0]
);

// Load saved credentials if they exist
async function loadCredentials() {
  try {
    const credentials = await fs.readFile("credentials.json", "utf8");
    oAuth2Client.setCredentials(JSON.parse(credentials));
    console.log("Loaded credentials successfully");
    return true;
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Error loading credentials:", error);
    }
    return false;
  }
}

// Load credentials on startup
loadCredentials();

app.get("/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) {
      return res.status(400).send("No code provided");
    }

    // Exchange the code for tokens
    const { tokens } = await oAuth2Client.getToken(code);

    // Make sure we preserve the refresh token if it exists
    if (tokens.refresh_token) {
      console.log("Received refresh token during authentication");

      // Update the refresh token in the .env file if possible
      try {
        const envPath = "./.env";
        const envContent = await fs.readFile(envPath, "utf8");
        const updatedEnvContent = envContent.replace(
          /GOOGLE_REFRESH_TOKEN=.*/,
          `GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`
        );
        await fs.writeFile(envPath, updatedEnvContent);
        console.log("Updated refresh token in .env file");
      } catch (envError) {
        console.error("Could not update refresh token in .env file:", envError);
      }
    }

    // Save tokens to file
    await fs.writeFile("credentials.json", JSON.stringify(tokens));

    // Set credentials
    oAuth2Client.setCredentials(tokens);

    res.send(
      "Authentication successful! You can now use the WhatsApp bot. You can close this window."
    );
  } catch (error) {
    console.error("Error in callback:", error);
    res.status(500).send("Error during authentication");
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

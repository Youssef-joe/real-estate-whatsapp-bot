require("dotenv").config();

module.exports = {
  // Presentation mode ("google" or "pdf")
  presentationMode: process.env.PRESENTATION_MODE || "pdf",
  // Google Slides API credentials
  google: {
    credentials: {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uris: [
        process.env.GOOGLE_REDIRECT_URI,
      ],
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    },
    // The scopes required for Google Slides API
    scopes: [
      "https://www.googleapis.com/auth/presentations",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.metadata",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
      "https://www.googleapis.com/auth/drive.appdata",
      "https://www.googleapis.com/auth/drive.apps.readonly",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.readonly.metadata",
      "https://www.googleapis.com/auth/drive.photos.readonly",
      "https://www.googleapis.com/auth/drive.resource",
    ],
  },
  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },
  // Debug settings
  debug: {
    mode: process.env.DEBUG_MODE === "true",
    logLevel: process.env.LOG_LEVEL || "info",
  },
};

const { google } = require("googleapis");
const fs = require("fs").promises;
const config = require("./config");

class SlidesManager {
  constructor() {
    // Initialize OAuth2 client instead of GoogleAuth
    this.auth = new google.auth.OAuth2(
      config.google.credentials.client_id,
      config.google.credentials.client_secret,
      config.google.credentials.redirect_uris[0]
    );

    // Load saved credentials if they exist
    this.loadCredentials();

    // Initialize API clients with authentication
    this.slides = google.slides({
      version: "v1",
      auth: this.auth,
    });

    this.drive = google.drive({
      version: "v3",
      auth: this.auth,
    });
  }

  async loadCredentials() {
    try {
      const credentials = await fs.readFile("credentials.json", "utf8");
      this.auth.setCredentials(JSON.parse(credentials));
      console.log("Loaded credentials successfully");
    } catch (error) {
      if (error.code === "ENOENT") {
        // If credentials file doesn't exist, try to use refresh token from config
        if (
          config.google.credentials.refresh_token &&
          config.google.credentials.refresh_token !== "your_refresh_token_here"
        ) {
          console.log("Using refresh token from config");
          this.auth.setCredentials({
            refresh_token: config.google.credentials.refresh_token,
          });
        } else {
          console.log(
            "No credentials file found and no valid refresh token in config"
          );
        }
      } else {
        console.error("Error loading credentials:", error);
      }
    }
  }

  async getAuthUrl() {
    const scopes = config.google.scopes;
    const authUrl = this.auth.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      redirect_uri: config.google.credentials.redirect_uris[0],
    });
    return authUrl;
  }

  async setCredentials(code) {
    try {
      const { tokens } = await this.auth.getToken(code);
      this.auth.setCredentials(tokens);
      await fs.writeFile("credentials.json", JSON.stringify(tokens));

      // Reinitialize API clients with new credentials
      this.slides = google.slides({
        version: "v1",
        auth: this.auth,
      });

      this.drive = google.drive({
        version: "v3",
        auth: this.auth,
      });

      return true;
    } catch (error) {
      console.error("Error setting credentials:", error);
      return false;
    }
  }

  async checkAuth(forceRefresh = false) {
    try {
      // Check if we have credentials at all
      if (!this.auth.credentials) {
        console.log("No credentials available. Need to authenticate first.");
        return false;
      }

      // Try to get a new access token using the refresh token
      if (
        this.auth.credentials.refresh_token &&
        (forceRefresh || !this.auth.credentials.access_token)
      ) {
        console.log("Refreshing access token...");
        try {
          await this.auth.refreshAccessToken();
          console.log("Access token refreshed successfully");
        } catch (refreshError) {
          console.error("Error refreshing access token:", refreshError);
          return false;
        }
      }

      // Try a simple API call to check if we're authenticated
      const response = await this.drive.about
        .get({
          fields: "user",
        })
        .catch((error) => {
          console.log("Authentication check failed:", error);
          if (error.code === 401 || error.code === 403) {
            return false;
          }
          throw error;
        });

      console.log("Authentication successful!");
      return true;
    } catch (error) {
      console.error("Authentication check failed:", error);
      return false;
    }
  }

  async createPresentation(title, topics) {
    try {
      // Check if we're authenticated
      if (!(await this.checkAuth())) {
        throw new Error("Not authenticated. Please authenticate first.");
      }

      // Create a new presentation
      const presentation = await this.slides.presentations.create({
        auth: this.auth,
        requestBody: {
          title: title,
        },
      });

      const presentationId = presentation.data.presentationId;

      // Create title slide
      await this.slides.presentations.batchUpdate({
        auth: this.auth,
        presentationId: presentationId,
        requestBody: {
          requests: [
            {
              createSlide: {
                objectId: "titleSlide",
                insertionIndex: 0,
                slideLayoutReference: {
                  predefinedLayout: "TITLE",
                },
                placeholderIdMappings: [
                  {
                    layoutPlaceholder: {
                      type: "CENTERED_TITLE",
                    },
                    objectId: "titleText",
                  },
                ],
              },
            },
            {
              insertText: {
                objectId: "titleText",
                text: title,
              },
            },
          ],
        },
      });

      // Create slides for each topic
      for (let i = 0; i < topics.length; i++) {
        // Create the slide with proper placeholder mappings
        const createSlideResponse = await this.slides.presentations.batchUpdate(
          {
            auth: this.auth,
            presentationId: presentationId,
            requestBody: {
              requests: [
                {
                  createSlide: {
                    objectId: `slide${i + 1}`,
                    insertionIndex: i + 1,
                    slideLayoutReference: {
                      predefinedLayout: "TITLE_AND_BODY",
                    },
                    placeholderIdMappings: [
                      {
                        layoutPlaceholder: {
                          type: "TITLE",
                        },
                        objectId: `title${i + 1}`,
                      },
                      {
                        layoutPlaceholder: {
                          type: "BODY",
                        },
                        objectId: `body${i + 1}`,
                      },
                    ],
                  },
                },
              ],
            },
          }
        );

        // Insert the topic as the slide title
        await this.slides.presentations.batchUpdate({
          auth: this.auth,
          presentationId: presentationId,
          requestBody: {
            requests: [
              {
                insertText: {
                  objectId: `title${i + 1}`,
                  insertionIndex: 0,
                  text: topics[i],
                },
              },
              {
                insertText: {
                  objectId: `body${i + 1}`,
                  insertionIndex: 0,
                  text: "Add content here", // Default placeholder text for the body
                },
              },
            ],
          },
        });
      }

      // Get the presentation URL
      const file = await this.drive.files.get({
        auth: this.auth,
        fileId: presentationId,
        fields: "webViewLink",
      });

      return file.data.webViewLink;
    } catch (error) {
      console.error("Error creating presentation:", error);
      throw error;
    }
  }

  async handleAuthError(error) {
    if (error.code === 401 || error.code === 403) {
      console.log("Authentication error:", error);
      // Handle authentication error
      // For example, you can redirect the user to the authentication page
      // or prompt them to re-authenticate
    } else {
      console.error("Error:", error);
      // Handle other errors
    }
  }
}

module.exports = SlidesManager;

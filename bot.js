const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const config = require("./config");
const supabase = require("./supabase");

// Import the appropriate slides manager based on configuration
let SlidesManager;
if (config.presentationMode === "pdf") {
  SlidesManager = require("./pdf_slides.js");
  console.log("Using PDF-based presentation generator");
} else {
  SlidesManager = require("./slides.js");
  console.log("Using Google Slides presentation generator");
}

// Validate required modules
try {
  if (
    !Client ||
    !LocalAuth ||
    !qrcode ||
    !SlidesManager ||
    !config ||
    !supabase
  ) {
    throw new Error("Required module not available");
  }
} catch (error) {
  console.error("Error loading required modules:", error);
  process.exit(1);
}

// Initialize WhatsApp client with better error handling
const client = new Client({
  authStrategy: new LocalAuth({ clientId: "presentation-bot" }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    executablePath: process.env.CHROME_BIN || null,
  },
});

// Add detailed logging for client events
client.on("qr", (qr) => {
  console.log("QR Code received, scan it with your WhatsApp:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", async () => {
  console.log("WhatsApp client is ready!");

  // Check if we have valid credentials (only needed for Google Slides mode)
  try {
    const isAuthenticated = await slidesManager.checkAuth();
    if (!isAuthenticated && config.presentationMode === 'google') {
      console.log(
        "Bot is not authenticated. Please authenticate with Google first."
      );
      const authUrl = await slidesManager.getAuthUrl();
      console.log("Please authenticate with Google:");
      console.log(authUrl);
      console.log("After authentication, send any message to continue.");
    } else {
      console.log("Bot is authenticated and ready to use!");
    }
  } catch (error) {
    console.error("Error checking authentication:", error);
  }
});

client.on("disconnected", (reason) => {
  console.log("WhatsApp client disconnected:", reason);
  console.log("Attempting to reconnect...");
  client.initialize();
});

// Initialize Slides Manager
const slidesManager = new SlidesManager();

// Rate limiting implementation
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_MESSAGES_PER_WINDOW = 10;

function checkRateLimit(userId) {
  const now = Date.now();
  if (!rateLimits.has(userId)) {
    rateLimits.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  const userLimit = rateLimits.get(userId);
  if (now > userLimit.resetTime) {
    // Reset rate limit window
    rateLimits.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  // Increment count
  userLimit.count++;
  rateLimits.set(userId, userLimit);

  // Check if limit exceeded
  return userLimit.count <= MAX_MESSAGES_PER_WINDOW;
}

// Add error handling for initialization
console.log("Starting WhatsApp client initialization...");
client
  .initialize()
  .then(() => {
    console.log("WhatsApp client initialized successfully!");
  })
  .catch((error) => {
    console.error("Failed to initialize WhatsApp client:", error);
    process.exit(1);
  });

// Periodically clean up rate limit data
setInterval(() => {
  const now = Date.now();
  for (const [userId, limitData] of rateLimits.entries()) {
    if (now > limitData.resetTime) {
      rateLimits.delete(userId);
    }
  }
}, RATE_LIMIT_WINDOW);

// Function to save user data to Supabase with retry mechanism
async function saveUserData(userId, data, retryCount = 0) {
  try {
    const { error } = await supabase.from("users").upsert(
      {
        whatsapp_id: userId,
        data: JSON.stringify(data),
      },
      {
        onConflict: "whatsapp_id",
      }
    );

    if (error) {
      if (retryCount < 3) {
        console.log(`Retrying saveUserData (${retryCount + 1}/3)...`);
        setTimeout(() => saveUserData(userId, data, retryCount + 1), 1000);
      } else {
        console.error("Error saving user data after retries:", error);
      }
    }
  } catch (error) {
    if (retryCount < 3) {
      console.log(`Retrying saveUserData (${retryCount + 1}/3)...`);
      setTimeout(() => saveUserData(userId, data, retryCount + 1), 1000);
    } else {
      console.error("Error in saveUserData after retries:", error);
    }
  }
}

// Function to get user data from Supabase with retry mechanism
async function getUserData(userId, retryCount = 0) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("data")
      .eq("whatsapp_id", userId)
      .single();

    if (error) {
      // If user doesn't exist, create a new record
      if (error.code === "PGRST116") {
        await saveUserData(userId, { state: { step: "initial" } });
        return { state: { step: "initial" } };
      }

      if (retryCount < 3) {
        console.log(`Retrying getUserData (${retryCount + 1}/3)...`);
        return await getUserData(userId, retryCount + 1);
      }
      console.error("Error getting user data after retries:", error);
      return { state: { step: "initial" } };
    }
    return data ? JSON.parse(data.data) : { state: { step: "initial" } };
  } catch (error) {
    if (retryCount < 3) {
      console.log(`Retrying getUserData (${retryCount + 1}/3)...`);
      return await getUserData(userId, retryCount + 1);
    }
    console.error("Error getting user data after retries:", error);
    return { state: { step: "initial" } };
  }
}

// Function to save presentation data
async function savePresentation(userId, presentationData, retryCount = 0) {
  try {
    const { error } = await supabase.from("presentations").insert({
      whatsapp_id: userId,
      title: presentationData.title,
      topics: presentationData.topics,
      presentation_url: presentationData.presentation_url,
      created_at: new Date().toISOString(),
    });

    if (error) {
      if (retryCount < 3) {
        console.log(`Retrying savePresentation (${retryCount + 1}/3)...`);
        setTimeout(
          () => savePresentation(userId, presentationData, retryCount + 1),
          1000
        );
      } else {
        console.error("Error saving presentation after retries:", error);
      }
    }
  } catch (error) {
    if (retryCount < 3) {
      console.log(`Retrying savePresentation (${retryCount + 1}/3)...`);
      setTimeout(
        () => savePresentation(userId, presentationData, retryCount + 1),
        1000
      );
    } else {
      console.error("Error saving presentation after retries:", error);
    }
  }
}

// Improved authentication handling
async function handleAuthentication(chat, userState, userId) {
  try {
    // If using PDF mode, no authentication is needed
    if (config.presentationMode === 'pdf') {
      await chat.sendMessage(
        "Great! What would you like the title of your presentation to be?"
      );
      userState.step = "awaiting_title";
      await saveUserData(userId, { state: userState });
      return true;
    }
    
    // For Google Slides mode, check if we're already authenticated with token refresh
    const isAuthenticated = await slidesManager.checkAuth(true);
    if (isAuthenticated) {
      await chat.sendMessage(
        "Great! What would you like the title of your presentation to be?"
      );
      userState.step = "awaiting_title";
      await saveUserData(userId, { state: userState });
      return true;
    } else {
      // Ask for authentication
      const authUrl = await slidesManager.getAuthUrl();
      console.log("Please authenticate with Google:");
      console.log(authUrl);
      await chat.sendMessage(
        `Please authenticate with Google to create presentations.\n\nI've printed the authentication URL in the terminal. Open it in your browser and follow the instructions.\n\nAfter authentication, send any message to continue.`
      );
      userState.step = "awaiting_auth";
      await saveUserData(userId, { state: userState });
      return false;
    }
  } catch (error) {
    console.error("Authentication error:", error);
    await chat.sendMessage(
      "Error: Could not check authentication status. Please try again later."
    );
    userState.step = "initial";
    await saveUserData(userId, { state: userState });
    return false;
  }
}

// Handle incoming messages
client.on("message", async (message) => {
  const chat = await message.getChat();
  const userId = message.from;

  // Apply rate limiting
  if (!checkRateLimit(userId)) {
    console.log(`Rate limit exceeded for user ${userId}`);
    await chat.sendMessage(
      "You're sending messages too quickly. Please wait a moment before trying again."
    );
    return;
  }

  try {
    // Load user data from Supabase
    const userData = await getUserData(userId);
    let userState = userData?.state || { step: "initial" };

    console.log("Received message:", {
      from: userId,
      body: message.body,
      currentStep: userState.step,
    });

    // Handle greetings and help
    const lowerCaseBody = message.body.toLowerCase();
    if (
      lowerCaseBody.includes("hello") ||
      lowerCaseBody.includes("hi") ||
      lowerCaseBody.includes("hey")
    ) {
      await chat.sendMessage(
        "Hello! I'm your presentation assistant. I can help you create presentations. Would you like to create a new presentation?"
      );
      userState.step = "awaiting_confirmation";
      await saveUserData(userId, { state: userState });
      return;
    }

    if (lowerCaseBody.includes("help")) {
      await chat.sendMessage(
        "I can help you create Google Slides presentations. Here's how to use me:\n\n" +
          "1. Say 'hello' to start\n" +
          "2. Confirm you want to create a presentation\n" +
          "3. Provide a title when asked\n" +
          "4. List your slide topics (one per line)\n" +
          "5. I'll generate your presentation and send you the link\n\n" +
          "You can say 'restart' at any time to start over."
      );
      return;
    }

    if (lowerCaseBody.includes("restart")) {
      await chat.sendMessage(
        "Starting over. Would you like to create a new presentation?"
      );
      userState.step = "awaiting_confirmation";
      await saveUserData(userId, { state: userState });
      return;
    }

    // Handle conversation flow based on user state
    switch (userState.step) {
      case "awaiting_confirmation":
        if (
          lowerCaseBody.includes("yes") ||
          lowerCaseBody.includes("yeah") ||
          lowerCaseBody.includes("sure")
        ) {
          await handleAuthentication(chat, userState, userId);
        } else if (
          lowerCaseBody.includes("no") ||
          lowerCaseBody.includes("nope")
        ) {
          await chat.sendMessage(
            "No problem! Let me know when you want to create a presentation. Just say hello to start."
          );
          userState.step = "initial";
          await saveUserData(userId, { state: userState });
        } else {
          await chat.sendMessage(
            'I didn\'t understand that. Please say "yes" or "no" to continue, or "help" for assistance.'
          );
        }
        break;

      case "awaiting_auth":
      case "awaiting_auth_retry":
        // Consolidated authentication handling for both states
        await handleAuthentication(chat, userState, userId);
        break;

      case "awaiting_title":
        try {
          // Check if we have a valid title
          const title = message.body.trim();
          console.log("Processing title:", title);
          if (title && title.length > 0) {
            userState.presentationInfo = userState.presentationInfo || {};
            userState.presentationInfo.title = title;
            await chat.sendMessage(
              "Please provide the topics for your presentation (one per line):"
            );
            userState.step = "awaiting_topics";
            await saveUserData(userId, { state: userState });
          } else {
            await chat.sendMessage(
              "Please provide a title for your presentation. The title cannot be empty."
            );
          }
        } catch (error) {
          console.error("Error handling title:", error);
          await chat.sendMessage(
            'Error: Could not process your title. Please try again or type "restart" to start over.'
          );
        }
        break;

      case "awaiting_topics":
        try {
          const topics = message.body.trim();
          console.log("Processing topics:", topics);
          if (topics && topics.length > 0) {
            userState.presentationInfo.topics = topics
              .split("\n")
              .filter((topic) => topic.trim());

            if (userState.presentationInfo.topics.length === 0) {
              await chat.sendMessage(
                "I couldn't find any topics in your message. Please provide at least one topic per line:"
              );
              return;
            }

            await chat.sendMessage(
              "Great! I'll start creating your presentation. This might take a moment..."
            );

            try {
              // Verify auth status before creating presentation (only for Google Slides mode)
              if (config.presentationMode === 'google') {
                const isAuthenticated = await slidesManager.checkAuth(true);
                if (!isAuthenticated) {
                  await chat.sendMessage(
                    "Authentication expired. Let's authenticate again."
                  );
                  await handleAuthentication(chat, userState, userId);
                  return;
                }
              }

              const presentationUrl = await slidesManager.createPresentation(
                userState.presentationInfo.title,
                userState.presentationInfo.topics
              );

              // Save presentation data to Supabase
              await savePresentation(userId, {
                title: userState.presentationInfo.title,
                topics: userState.presentationInfo.topics,
                presentation_url: presentationUrl,
              });

              await chat.sendMessage(
                `✨ Your presentation is ready! Here's the link:\n${presentationUrl}`
              );
              await chat.sendMessage(
                "Would you like to create another presentation?"
              );
              userState.step = "awaiting_confirmation";
              await saveUserData(userId, { state: userState });
            } catch (error) {
              console.error("Error creating presentation:", error);
              await chat.sendMessage(
                'Error creating presentation. Please try again or type "restart" to start over.'
              );
              userState.step = "initial";
              await saveUserData(userId, { state: userState });
            }
          } else {
            await chat.sendMessage(
              "Please provide the topics for your presentation (one per line):"
            );
          }
        } catch (error) {
          console.error("Error handling topics:", error);
          await chat.sendMessage(
            'Error: Could not process your topics. Please try again or type "restart" to start over.'
          );
        }
        break;

      default:
        await chat.sendMessage(
          "I'm not sure what you're trying to do. Please say 'hello' to start, or 'help' for assistance."
        );
        userState.step = "initial";
        await saveUserData(userId, { state: userState });
        break;
    }
  } catch (error) {
    console.error("Error in message handler:", error);
    await chat.sendMessage(
      'Sorry, there was an error. Please try again by saying "hello".'
    );
    try {
      await saveUserData(userId, { state: { step: "initial" } });
    } catch (saveError) {
      console.error("Error saving reset state:", saveError);
    }
  }
});

// Error handling for unexpected crashes
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Attempt to gracefully restart
  setTimeout(() => {
    console.log("Attempting to restart after uncaught exception...");
    client.initialize();
  }, 5000);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Continue running
});
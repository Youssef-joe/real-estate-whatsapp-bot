const fsPromises = require("fs").promises;
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const supabase = require("./supabase");

class PDFSlidesManager {
  constructor() {
    // Create output directory if it doesn't exist
    this.outputDir = path.join(__dirname, "presentations");
    this.ensureOutputDirExists();
  }

  async ensureOutputDirExists() {
    try {
      await fsPromises.mkdir(this.outputDir, { recursive: true });
      console.log("Output directory created or already exists");
    } catch (error) {
      console.error("Error creating output directory:", error);
    }
  }

  // No authentication needed for PDF generation
  async checkAuth() {
    return true;
  }

  // No authentication URL needed
  async getAuthUrl() {
    return null;
  }

  // No credentials to set
  async setCredentials() {
    return true;
  }

  async createPresentation(title, topics) {
    try {
      // Generate a unique filename based on title and timestamp
      const timestamp = new Date().getTime();
      const safeTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const filename = `${safeTitle}_${timestamp}.pdf`;
      const outputPath = path.join(this.outputDir, filename);

      // Create a new PDF document
      const doc = new PDFDocument({
        autoFirstPage: false,
        size: "A4",
        layout: "landscape",
        margin: 0,
      });

      // Pipe output to file
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Create title slide
      this.createTitleSlide(doc, title);

      // Create content slides for each topic
      for (const topic of topics) {
        this.createContentSlide(doc, topic);
      }

      // Finalize the PDF
      doc.end();

      // Return a promise that resolves when the PDF is written
      return new Promise((resolve, reject) => {
        writeStream.on("finish", () => {
          // Require BASE_URL to be set in production
          if (!process.env.BASE_URL && process.env.NODE_ENV === "production") {
            reject(
              new Error(
                "BASE_URL environment variable must be set in production. For Render deployments, this should be your Render service URL (e.g., https://your-service-name.onrender.com). Set it in your Render dashboard under Environment Variables."
              )
            );
            return;
          }

          // Get the base URL from environment variable (required for cloud deployment)
          const baseUrl = process.env.BASE_URL;
          if (!baseUrl) {
            throw new Error(
              "BASE_URL environment variable must be set for cloud deployment. For Render, this is your service URL (e.g., https://your-service-name.onrender.com)."
            );
          }
          // Create a web URL to the PDF file
          const relativePath = path
            .relative(this.outputDir, outputPath)
            .replace(/\\/g, "/");
          const fileUrl = `${baseUrl}/presentations/${relativePath}`;
          console.log(`PDF presentation created at: ${outputPath}`);
          console.log(`PDF accessible at URL: ${fileUrl}`);
          resolve(fileUrl);
        });

        writeStream.on("error", (error) => {
          console.error("Error writing PDF:", error);
          reject(error);
        });
      });
    } catch (error) {
      console.error("Error creating PDF presentation:", error);
      throw error;
    }
  }

  createTitleSlide(doc, title) {
    // Add a new page for the title slide
    doc.addPage();

    // Set background color
    doc.rect(0, 0, doc.page.width, doc.page.height).fill("#f0f0f0");

    // Add title
    doc
      .font("Helvetica-Bold")
      .fontSize(48)
      .fillColor("#333333")
      .text(title, 0, doc.page.height / 2 - 24, {
        align: "center",
      });

    // Add date
    const date = new Date().toLocaleDateString();
    doc
      .font("Helvetica")
      .fontSize(16)
      .fillColor("#666666")
      .text(`Created on ${date}`, 0, doc.page.height - 50, {
        align: "center",
      });
  }

  createContentSlide(doc, topic) {
    // Add a new page for each content slide
    doc.addPage();

    // Set background color
    doc.rect(0, 0, doc.page.width, doc.page.height).fill("#ffffff");

    // Add slide header/border
    doc.rect(0, 0, doc.page.width, 60).fill("#4285f4");

    // Add topic as slide title
    doc
      .font("Helvetica-Bold")
      .fontSize(36)
      .fillColor("#ffffff")
      .text(topic, 40, 15);

    // Add placeholder for content
    doc
      .font("Helvetica")
      .fontSize(24)
      .fillColor("#333333")
      .text("Add content here", 40, 100);

    // Add bullet points as placeholders
    const bulletPoints = [
      "Point 1: Add details here",
      "Point 2: Add details here",
      "Point 3: Add details here",
    ];

    doc.font("Helvetica").fontSize(18).fillColor("#555555");

    let yPosition = 160;
    for (const point of bulletPoints) {
      doc.circle(50, yPosition, 3).fill("#4285f4");
      doc.text(point, 70, yPosition - 6);
      yPosition += 40;
    }

    // Add page number
    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor("#999999")
      .text(
        `Slide ${doc.bufferedPageRange().count - 1}`,
        doc.page.width - 100,
        doc.page.height - 30
      );
  }

  // Helper method to handle authentication errors (not needed for PDF generation)
  async handleAuthError(error) {
    console.error("Error:", error);
  }
}

module.exports = PDFSlidesManager;

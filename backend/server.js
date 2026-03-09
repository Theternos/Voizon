import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs-extra";
// Import pdf-parse differently to avoid the test file issue
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import textract from "textract";
import htmlPdf from "html-pdf-node";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import Razorpay from "razorpay";
import crypto from "crypto";
import * as Busboy from "busboy";
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { createServer } from "http";
import WebSocket from "ws";
import axios from "axios";
import puppeteer from "puppeteer";


import csv from "csv-parser";



marked.setOptions({
  gfm: true,
  breaks: true,
  smartypants: true,
  headerIds: false,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const port = process.env.PORT || 5000;
const app = express();
app.use(cors());

// Initialize the Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "gs://ternos-voizon.firebasestorage.app",
  });
}
const db = admin.firestore();

const bucket = admin.storage().bucket(); // Uses default bucket

// Configure multer for memory storage (since we're uploading to Firebase)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".pdf", ".doc", ".docx"];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC, and DOCX files are allowed"));
    }
  },
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "5mb" }));

// Helper function to upload buffer to Firebase Storage
async function uploadToFirebase(
  buffer,
  fileName,
  folder = "",
  customMetadata = {}
) {
  const filePath = folder ? `${folder}/${fileName}` : fileName;
  const file = bucket.file(filePath);

  const stream = file.createWriteStream({
    metadata: {
      contentType: getContentType(fileName),
      metadata: customMetadata, // ✅ add metadata.email here
    },
    resumable: false,
  });

  return new Promise((resolve, reject) => {
    stream.on("error", reject);
    stream.on("finish", async () => {
      resolve({
        fileName,
        filePath,
        publicUrl: `https://storage.googleapis.com/${bucket.name}/${filePath}`,
      });
    });
    stream.end(buffer);
  });
}

// Helper function to get content type based on file extension
function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const contentTypes = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
  };
  return contentTypes[ext] || "application/octet-stream";
}

// Helper function to download file from Firebase Storage
async function downloadFromFirebase(filePath) {
  try {
    const file = bucket.file(filePath);
    const [buffer] = await file.download();
    return buffer;
  } catch (error) {
    throw new Error(`Failed to download from Firebase: ${error.message}`);
  }
}

// Helper function to delete file from Firebase Storage
async function deleteFromFirebase(filePath) {
  try {
    const file = bucket.file(filePath);
    await file.delete();
    console.log(`✅ Deleted from Firebase: ${filePath}`);
    return true;
  } catch (error) {
    if (error.code === 404) {
      console.warn(`⚠️ File not found in Firebase: ${filePath}`);
      return true; // Consider it successful if file doesn't exist
    }
    throw new Error(`Failed to delete from Firebase: ${error.message}`);
  }
}

// Helper function to check if file exists in Firebase Storage
async function fileExistsInFirebase(filePath) {
  try {
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    return false;
  }
}

// Add this function to your existing code (likely at the top with other imports/functions)
// Unified model configuration
const MODEL_CONFIGS = {
  "Gemini 2.5 Flash": {
    apiKey: process.env.OPENROUTER_GEMINI_API_KEY,
    model: "google/gemini-2.5-flash",
    maxTokens: 1200,
  },
  "GPT-4o Mini": {
    apiKey: process.env.OPENROUTER_GPT_4O_MINI_API_KEY,
    model: "openai/gpt-4o-mini",
    maxTokens: 1200,
  },
  "LLaMA 3.3 8B": {
    apiKey: process.env.OPENROUTER_API_KEY,
    model: "meta-llama/llama-3.3-8b-instruct:free",
    maxTokens: 1200,
  },
  "Mistral 7B": {
    apiKey: process.env.OPENROUTER_MISTRAL_7B_API_KEY,
    model: "mistralai/mistral-7b-instruct:free",
    maxTokens: 1200,
  },
};

const FALLBACK_MODELS = {
  "Gemini 2.5 Flash": ["GPT-4o Mini", "LLaMA 3.3 8B", "Mistral 7B"],
  "GPT-4o Mini": ["Gemini 2.5 Flash", "LLaMA 3.3 8B", "Mistral 7B"],
  "LLaMA 3.3 8B": ["Mistral 7B", "GPT-4o Mini", "Gemini 2.5 Flash"],
  "Mistral 7B": ["GPT-4o Mini", "Gemini 2.5 Flash", "LLaMA 3.3 8B"],
};

// Generate natural, conversational system prompt
function createSystemPrompt(resume) {
  const basePrompt = `You're helping someone during a live interview. Respond as if you're the candidate, using natural, conversational language.

Key Guidelines:
- Answer like you're speaking to the interviewer - simple, clear, and confident
- Use complete paragraphs (2-3 sentences max) - avoid bullet points/lists
- Keep technical terms **bold** and code snippets in \`backticks\`
- For longer code examples, use:
\`\`\`python
# Properly formatted code block
\`\`\`
- Be honest but positive about your experience
- Use friendly Indian English - natural but professional

Response Structure:
1. Start with a direct, one-sentence answer
2. Follow with brief context/explanation if needed
3. Include code only when directly relevant

${resume.trim() ? `Candidate Background:\n${resume}\n` : ""}

Remember: You're having a conversation, not giving a presentation. Keep it human and engaging.`;

  return basePrompt;
}

// Normalize chat history for consistent role mapping
function normalizeMessages(chat, question, resume) {
  const messages = [];

  // Add system prompt
  messages.push({
    role: "system",
    content: createSystemPrompt(resume),
  });

  // Add chat history with smart role mapping
  chat.forEach((entry, index) => {
    if (!entry.content?.trim()) return;

    const role = ["user", "human"].includes(entry.role) ? "user" : "assistant";
    messages.push({
      role,
      content: entry.content.trim(),
    });
  });

  // Add current question
  messages.push({
    role: "user",
    content: question,
  });

  return messages;
}

// Unified API call function
async function callModel(modelName, question, chat = [], resume = "") {
  const config = MODEL_CONFIGS[modelName];
  if (!config) throw new Error(`Unknown model: ${modelName}`);

  try {
    if (config.isGemini) {
      return await callGeminiModel(question, chat, resume);
    } else {
      return await callOpenRouterModel(config, question, chat, resume);
    }
  } catch (error) {
    console.error(`❌ ${modelName} failed:`, error.message);
    throw error;
  }
}

// Gemini-specific handler
async function callGeminiModel(question, chat, resume) {
  const contents = [];

  // Add system context
  contents.push({
    role: "user",
    parts: [{ text: createSystemPrompt(resume) }],
  });

  // Add chat history
  chat.forEach((entry) => {
    if (entry.content?.trim()) {
      contents.push({
        role: entry.role === "user" ? "user" : "model",
        parts: [{ text: entry.content.trim() }],
      });
    }
  });

  // Add current question
  contents.push({
    role: "user",
    parts: [{ text: question }],
  });

  const result = await ai.models.generateContent({
    model: MODEL_CONFIGS["Gemini 2.5 Flash"].model,
    contents,
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 800,
      topP: 0.9,
    },
  });

  return result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

// OpenRouter API handler
async function callOpenRouterModel(config, question, chat, resume) {
  const messages = normalizeMessages(chat, question, resume);

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.FRONTEND_URL,
        "X-Title": process.env.YOUR_SITE_NAME,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: 0.8, // Higher for more natural responses
        top_p: 0.95,
        frequency_penalty: 0.3, // Reduce repetition
        presence_penalty: 0.2,
        stream: false,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `API error: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }

  const data = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    throw new Error("Invalid response structure");
  }

  return data.choices[0].message.content.trim();
}

// Main API endpoint
app.post("/api/ask", async (req, res) => {
  const { question, chat = [], resume = "", model } = req.body;

  if (!question?.trim()) {
    return res.status(400).json({ error: "Question is required" });
  }

  const tryModels = [model, ...(FALLBACK_MODELS[model] || [])];

  for (const currentModel of tryModels) {
    try {
      console.log(`🤖 Trying ${currentModel}...`);

      const answer = await callModel(currentModel, question, chat, resume);

      if (answer) {
        console.log(`✅ ${currentModel} responded successfully`);
        return res.json({
          answer: answer.trim(),
          actualModelUsed: currentModel,
        });
      }
    } catch (error) {
      console.error(`❌ ${currentModel} failed:`, error.message);
      continue;
    }
  }

  return res.status(500).json({
    error: "All models failed to respond. Please try again.",
  });
});

app.post("/api/upload-resume", upload.single("resume"), async (req, res) => {
  try {
    console.log("Upload request received:", {
      file: req.file ? req.file.originalname : "No file",
      body: req.body,
    });

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { email, companyName, role, jobDescription } = req.body;

    // Validate required fields
    if (!email || !companyName || !role) {
      return res.status(400).json({
        error: "Missing required fields: email, companyName, or role",
      });
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileName = `resume-${uniqueSuffix}${path.extname(
      req.file.originalname
    )}`;

    // Upload to Firebase Storage
    const uploadResult = await uploadToFirebase(
      req.file.buffer,
      fileName,
      "uploads"
    );

    const responseData = {
      message: "Resume uploaded successfully",
      fileName: uploadResult.fileName,
      originalName: req.file.originalname,
      filePath: uploadResult.filePath,
      publicUrl: uploadResult.publicUrl,
      fileSize: req.file.size,
      email,
      companyName,
      role,
      jobDescription: jobDescription || "",
    };

    console.log("Resume uploaded successfully:", responseData);

    res.json(responseData);
  } catch (error) {
    console.error("Upload error:", error);
    res
      .status(500)
      .json({ error: "Failed to upload resume: " + error.message });
  }
});

app.post("/api/read-resume", async (req, res) => {
  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({ error: "Missing resume filename." });
  }

  const filePath = `uploads/${filename}`;

  try {
    // Check if file exists in Firebase
    const exists = await fileExistsInFirebase(filePath);
    if (!exists) {
      return res.status(404).json({ error: "Resume file not found." });
    }

    // Download file from Firebase
    const fileBuffer = await downloadFromFirebase(filePath);
    const ext = path.extname(filename).toLowerCase();

    let text = "";

    if (ext === ".pdf") {
      const data = await pdfParse(fileBuffer);
      text = data.text;
    } else if (ext === ".doc" || ext === ".docx") {
      // For .doc/.docx files, we need to save temporarily for textract
      const tempDir = path.join(__dirname, "temp");
      await fs.ensureDir(tempDir);
      const tempFilePath = path.join(tempDir, filename);

      try {
        await fs.writeFile(tempFilePath, fileBuffer);

        text = await new Promise((resolve, reject) => {
          textract.fromFileWithPath(tempFilePath, (err, content) => {
            if (err) return reject(err);
            resolve(content);
          });
        });

        // Clean up temp file
        await fs.remove(tempFilePath);
      } catch (tempError) {
        // Ensure temp file is cleaned up even on error
        if (await fs.pathExists(tempFilePath)) {
          await fs.remove(tempFilePath);
        }
        throw tempError;
      }
    } else {
      return res.status(400).json({ error: "Unsupported file format." });
    }

    res.json({ content: text.trim() });
  } catch (error) {
    console.error("Error reading resume:", error);
    res.status(500).json({ error: "Failed to read resume content." });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Error middleware triggered:", error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File too large. Maximum size is 5MB.",
      });
    }
    return res.status(400).json({
      error: "File upload error: " + error.message,
    });
  }

  res.status(500).json({
    error: error.message || "Internal server error",
  });
});

function generateResponseHTML(responses, metadata) {
  const formatResponse = (response, index) => {
    const rawAnswer =
      response.candidateResponse || response.answer || "No response recorded";

    // Convert markdown to HTML and sanitize
    const htmlAnswer = DOMPurify.sanitize(marked.parse(rawAnswer));

    return `
    <div class="response-item">
      <div class="question-header">
        <span class="question-number">Q${index + 1}</span>
        <h3 class="question-text">${response.question || "Question not available"
      }</h3>
      </div>

      <div class="response-content">
        <div class="response-section">
          <h4>Candidate Response:</h4>
          <div class="response-text">${htmlAnswer}</div>
        </div>

        ${response.feedback
        ? `
          <div class="response-section">
            <h4>AI Feedback:</h4>
            <div class="feedback-text">${response.feedback}</div>
          </div>`
        : ""
      }

        ${response.score
        ? `
          <div class="response-section">
            <h4>Score:</h4>
            <div class="score-badge">${response.score}/10</div>
          </div>`
        : ""
      }

        ${response.suggestions
        ? `
          <div class="response-section">
            <h4>Suggestions for Improvement:</h4>
            <div class="suggestions-text">${response.suggestions}</div>
          </div>`
        : ""
      }
      </div>

      ${response.timestamp
        ? `
        <div class="response-timestamp">
          Answered on: ${new Date(response.timestamp).toLocaleString()}
        </div>`
        : ""
      }
    </div>
  `;
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Interview Response Report</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background: #fff;
        }
        
        .header {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          padding: 2rem;
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        
        .header .subtitle {
          font-size: 1.1rem;
          opacity: 0.9;
        }
        
        .metadata {
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          border-left: 4px solid #3b82f6;
        }
        
        .metadata-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        
        .metadata-item {
          display: flex;
          flex-direction: column;
        }
        
        .metadata-label {
          font-weight: 600;
          color: #64748b;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }
        
        .metadata-value {
          font-weight: 500;
          color: #1e293b;
        }
        
        .responses-container {
          max-width: 100%;
        }
        
        .response-item {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-bottom: 2rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          page-break-inside: avoid;
        }
        
        .question-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #f1f5f9;
        }
        
        .question-number {
          background: #3b82f6;
          color: white;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          flex-shrink: 0;
        }
        
        .question-text {
          color: #1e293b;
          font-size: 1.1rem;
          font-weight: 600;
          line-height: 1.4;
        }
        
        .response-section {
          margin-bottom: 1.5rem;
        }
        
        .response-section h4 {
          color: #374151;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          padding-left: 0.5rem;
          border-left: 3px solid #3b82f6;
        }
        
        .response-text, .feedback-text, .suggestions-text {
          background: #f8fafc;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          white-space: pre-wrap;
          line-height: 1.6;
        }
        
        .feedback-text {
          background: #fefce8;
          border-color: #fde047;
        }
        
        .suggestions-text {
          background: #ecfdf5;
          border-color: #86efac;
        }
        
        .score-badge {
          display: inline-block;
          background: #16a34a;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 1.1rem;
        }
        
        .response-timestamp {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 0.875rem;
          font-style: italic;
        }
        
        .footer {
          margin-top: 3rem;
          padding: 2rem;
          background: #f8fafc;
          text-align: center;
          border-top: 1px solid #e2e8f0;
        }
        
        .footer p {
          color: #64748b;
          font-size: 0.875rem;
        }
        
        @media print {
          .response-item {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }

      pre {
        background: #0f172a;
        color: #e2e8f0;
        padding: 1rem;
        border-radius: 6px;
        font-size: 13px;
        font-family: 'Fira Code', 'Courier New', monospace;
        overflow-x: auto;
        overflow-wrap: break-word;
        white-space: pre-wrap;
        line-height: 1.6;
        margin: 1rem 0;
        border: 1px solid #334155;
        word-break: break-word;
      }

      code {
        font-family: inherit;
        color: inherit;
        background: transparent;
        padding: 0;
      }


      </style>
    </head>
    <body>
      <div class="header">
        <h1>Interview Response Report</h1>
        <div class="subtitle">Comprehensive Analysis & Feedback</div>
      </div>
      
      <div class="metadata">
        <div class="metadata-grid">
          <div class="metadata-item">
            <div class="metadata-label">Company</div>
            <div class="metadata-value">${metadata.companyName}</div>
          </div>
          <div class="metadata-item">
            <div class="metadata-label">Role</div>
            <div class="metadata-value">${metadata.role}</div>
          </div>
          <div class="metadata-item">
            <div class="metadata-label">Candidate</div>
            <div class="metadata-value">${metadata.candidateName}</div>
          </div>
          <div class="metadata-item">
            <div class="metadata-label">Interview ID</div>
            <div class="metadata-value">${metadata.interviewId}</div>
          </div>
          <div class="metadata-item">
            <div class="metadata-label">Generated On</div>
            <div class="metadata-value">${metadata.generatedAt}</div>
          </div>
          <div class="metadata-item">
            <div class="metadata-label">Total Questions</div>
            <div class="metadata-value">${responses.length}</div>
          </div>
        </div>
      </div>
      
      <div class="responses-container">
        ${responses
      .map((response, index) => formatResponse(response, index))
      .join("")}
      </div>
      
      <div class="footer">
        <p>Generated by Voizon AI Interview Platform</p>
        <p>This report contains confidential interview data and should be handled accordingly.</p>
      </div>
    </body>
    </html>
  `;
}

app.post("/api/generate-response-pdf", async (req, res) => {
  try {
    const {
      responses,
      customFileName,
      interviewId,
      companyName,
      role,
      candidateName,
      candidateEmail,
    } = req.body;

    // Validate required fields
    if (!responses || !customFileName || !interviewId) {
      return res.status(400).json({
        error:
          "Missing required fields: responses, customFileName, and interviewId are required",
      });
    }

    // Generate HTML content for PDF
    const htmlContent = generateResponseHTML(responses, {
      companyName: companyName || "N/A",
      role: role || "N/A",
      candidateName: candidateName || "Candidate",
      interviewId,
      generatedAt: new Date().toLocaleString(),
    });

    // PDF generation options
    const options = {
      format: "A4",
      margin: {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm",
      },
      printBackground: true,
      preferCSSPageSize: true,
    };

    // Generate PDF
    const file = { content: htmlContent };
    const pdfBuffer = await htmlPdf.generatePdf(file, options);

    // Upload PDF to Firebase Storage
    const fileName = `${interviewId}.pdf`;
    const uploadResult = await uploadToFirebase(
      pdfBuffer,
      fileName,
      "responses",
      {
        email: candidateEmail, // ✅ Make sure this is passed in req.body
      }
    );

    console.log(`✅ PDF generated and uploaded successfully: ${fileName}`);

    // Return success response
    res.json({
      success: true,
      message: "PDF generated and saved successfully",
      fileName: uploadResult.fileName,
      filePath: uploadResult.filePath,
      publicUrl: uploadResult.publicUrl,
      fileSize: pdfBuffer.length,
    });
  } catch (error) {
    console.error("❌ Error generating PDF:", error);
    res.status(500).json({
      error: "Failed to generate PDF",
      details: error.message,
    });
  }
});

app.get("/api/download-response/:fileName", async (req, res) => {
  try {
    const { fileName } = req.params;
    const customName = req.query.name || fileName; // fallback if not provided
    const filePath = `responses/${fileName}`;

    const file = admin.storage().bucket().file(filePath);

    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: "File not found" });
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${customName}"`
    );
    res.setHeader("Content-Type", "application/pdf");

    file.createReadStream().pipe(res);
  } catch (error) {
    console.error("❌ Failed to stream file:", error);
    res.status(500).json({ error: "Download failed" });
  }
});

app.post("/api/preview-response-pdf", async (req, res) => {
  try {
    const { responses, interviewId, companyName, role, candidateName } =
      req.body;

    if (!responses || !interviewId) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const htmlContent = generateResponseHTML(responses, {
      companyName: companyName || "N/A",
      role: role || "N/A",
      candidateName: candidateName || "Candidate",
      interviewId,
      generatedAt: new Date().toLocaleString(),
    });

    const file = { content: htmlContent };
    const options = {
      format: "A4",
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
      printBackground: true,
    };

    const pdfBuffer = await htmlPdf.generatePdf(file, options);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${interviewId}.pdf"`,
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ Preview PDF error:", err);
    res.status(500).json({ error: "Failed to generate preview PDF" });
  }
});

// Create Order
app.post('/api/create-order', async (req, res) => {
  const { amount, currency, planId } = req.body;

  const options = {
    amount: amount,
    currency: currency,
    receipt: `plan_${planId}_${Date.now()}`
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Payment
app.post('/api/verify-payment', async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, planId, email } = req.body;

  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest('hex');

  if (generated_signature === razorpay_signature) {
    // Payment is valid
    // Update user's plan in Firestore
    await admin.firestore().collection('userPlans').doc(email).set({
      planId: planId,
      isActive: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, error: "Invalid signature" });
  }
});

// Create Top-up Order
app.post('/api/create-topup-order', async (req, res) => {
  const { amount, currency, mocks, scans, aiAssists } = req.body;

  const options = {
    amount: amount,
    currency: currency,
    receipt: `topup_${mocks}_${scans}_${aiAssists}_${Date.now()}`
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Top-up Payment
app.post('/api/verify-topup-payment', async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, mocks, scans, aiAssists, email } = req.body;

  // Validate the payment signature
  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest('hex');

  if (generated_signature !== razorpay_signature) {
    return res.status(400).json({ success: false, error: "Invalid signature" });
  }

  try {
    const db = admin.firestore();
    const batch = db.batch();

    // 1. Record the top-up purchase in history
    const topUpRef = db.collection('topUps-history').doc();
    batch.set(topUpRef, {
      email: email,
      mocks: parseInt(mocks) || 0,
      scans: parseInt(scans) || 0,
      aiAssists: parseInt(aiAssists) || 0,
      purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: 'completed'
    });

    // 2. Update or create the user's top-ups document
    const userTopUpsRef = db.collection('topUps').doc(email);

    // Get current top-ups if they exist
    const userTopUpsDoc = await userTopUpsRef.get();

    if (userTopUpsDoc.exists) {
      // Document exists - increment values
      const currentData = userTopUpsDoc.data();
      batch.update(userTopUpsRef, {
        mocks: (currentData.mocks || 0) + parseInt(mocks) || 0,
        scans: (currentData.scans || 0) + parseInt(scans) || 0,
        aiAssists: (currentData.aiAssists || 0) + parseInt(aiAssists) || 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Document doesn't exist - create new with initial values
      batch.set(userTopUpsRef, {
        email: email,
        mocks: parseInt(mocks) || 0,
        scans: parseInt(scans) || 0,
        aiAssists: parseInt(aiAssists) || 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Execute all operations as a single transaction
    await batch.commit();

    res.json({ success: true });
  } catch (err) {
    console.error("Error processing top-up:", err);
    res.status(500).json({ success: false, error: "Database update failed" });
  }
});

// Profile photo upload using multer memory storage
const uploadProfilePhoto = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log("File filter - Field name:", file.fieldname);
    console.log("File filter - MIME type:", file.mimetype);

    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files allowed"));
    }
    cb(null, true);
  },
});

app.post(
  "/api/upload-profile-pic",
  uploadProfilePhoto.single("photo"),
  async (req, res) => {
    try {
      console.log("Profile pic upload request received");

      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded." });
      }

      const email = req.body.email;
      if (!email) {
        return res.status(400).json({ error: "Email is required." });
      }

      // Delete existing profile photo if it exists
      const existingPhotoPath = `profile_pics/${email}.png`;
      const exists = await fileExistsInFirebase(existingPhotoPath);
      if (exists) {
        await deleteFromFirebase(existingPhotoPath);
        console.log("Removed existing profile photo");
      }

      // Upload new profile photo to Firebase
      const fileName = `${email}.png`;
      const uploadResult = await uploadToFirebase(
        req.file.buffer,
        fileName,
        "profile_pics"
      );

      console.log("Profile photo uploaded successfully:", {
        email: email,
        filename: uploadResult.fileName,
        size: req.file.size,
      });

      res.json({
        success: true,
        path: uploadResult.publicUrl,
        message: "Profile photo uploaded successfully",
        filename: uploadResult.fileName,
      });
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      res
        .status(500)
        .json({ error: "Failed to upload profile photo: " + error.message });
    }
  }
);

app.post(
  "/api/upload-profile-pic-simple",
  uploadProfilePhoto.single("photo"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded." });
      }

      const email = req.body.email;
      if (!email) {
        return res.status(400).json({ error: "Email is required." });
      }

      // Delete existing profile photo if it exists
      const existingPhotoPath = `profile_pics/${email}.png`;
      const exists = await fileExistsInFirebase(existingPhotoPath);
      if (exists) {
        await deleteFromFirebase(existingPhotoPath);
      }

      // Upload new profile photo
      const fileName = `${email}.png`;
      const uploadResult = await uploadToFirebase(
        req.file.buffer,
        fileName,
        "profile_pics"
      );

      console.log("Profile photo uploaded successfully");

      res.json({
        success: true,
        path: uploadResult.publicUrl,
        message: "Profile photo uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      res
        .status(500)
        .json({ error: "Failed to upload profile photo: " + error.message });
    }
  }
);

// Remove Profile Picture
app.post("/api/remove-profile-pic", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const filePath = `profile_pics/${email}.png`;

  try {
    const exists = await fileExistsInFirebase(filePath);

    if (exists) {
      await deleteFromFirebase(filePath);
      console.log(`✅ Deleted profile photo: ${filePath}`);
      return res.json({ success: true, message: "Photo removed" });
    } else {
      console.warn(`⚠️ Photo not found: ${filePath}`);
      return res.json({ success: true, message: "No photo found to delete" });
    }
  } catch (err) {
    console.error("❌ Failed to delete profile photo:", err);
    return res.status(500).json({ error: "Failed to delete photo" });
  }
});

// Delete all files for a user
app.post("/api/delete-user-files", async (req, res) => {
  const { email, interviewIds, resumePaths } = req.body;

  if (!email || !Array.isArray(interviewIds) || !Array.isArray(resumePaths)) {
    return res.status(400).send("Missing email, interviewIds, or resumePaths");
  }

  try {
    // 1. Delete resumes from Firebase Storage
    for (const filename of resumePaths) {
      const filePath = `uploads/${filename}`;
      try {
        await deleteFromFirebase(filePath);
        console.log(`✅ Deleted resume: ${filename}`);
      } catch (error) {
        console.warn(`⚠️ Failed to delete resume ${filename}:`, error.message);
      }
    }

    // 2. Delete response PDFs from Firebase Storage
    for (const interviewId of interviewIds) {
      const filePath = `responses/${interviewId}.pdf`;
      try {
        await deleteFromFirebase(filePath);
        console.log(`✅ Deleted PDF: ${interviewId}.pdf`);
      } catch (error) {
        console.warn(
          `⚠️ Failed to delete PDF ${interviewId}.pdf:`,
          error.message
        );
      }
    }

    // 3. Delete profile picture
    const profilePicPath = `profile_pics/${email}.png`;
    try {
      await deleteFromFirebase(profilePicPath);
      console.log(`✅ Deleted profile picture for: ${email}`);
    } catch (error) {
      console.warn(
        `⚠️ Failed to delete profile picture for ${email}:`,
        error.message
      );
    }

    res.send({ success: true });
  } catch (err) {
    console.error("❌ File deletion error:", err);
    res.status(500).send("Failed to delete user files");
  }
});

// Get file URL from Firebase Storage (useful for serving files)
app.get("/api/file-url/:folder/:filename", async (req, res) => {
  try {
    const { folder, filename } = req.params;
    const filePath = `${folder}/${filename}`;

    const exists = await fileExistsInFirebase(filePath);
    if (!exists) {
      return res.status(404).json({ error: "File not found" });
    }

    const file = bucket.file(filePath);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    res.json({ url });
  } catch (error) {
    console.error("Error getting file URL:", error);
    res.status(500).json({ error: "Failed to get file URL" });
  }
});

app.post("/send-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Missing email or OTP" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail", // or your email provider
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Voizon" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Voizon OTP Code",
      html: `
<div style="font-family: sans-serif; background: #f8fafc; padding: 2rem; border: 1px solid #e2e8f0; max-width: 500px; margin: 2rem auto; border-radius: 12px; color: #1e293b;">
  <h2 style="margin-bottom: 1rem; font-size: 1.5rem;">Here's your login code</h2>

  <div style="font-size: 2rem; font-weight: bold; color: #3b82f6; margin: 1rem 0; background: #f1f5f9; padding: 1rem 2rem; border-radius: 8px; display: inline-block; border: 1px solid #cbd5e1;">
    ${otp}
  </div>

  <p style="margin-top: 1.5rem; color: #475569; font-size: 0.95rem;">
    This code is valid for <strong>5 minutes</strong>. Do not share it with anyone.
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0;" />

  <p style="font-size: 0.85rem; color: #64748b; margin: 0;">
    Sent securely by <strong style="color: #3b82f6;">Voizon Team</strong>
  </p>
</div>

      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Failed to send OTP email:", err);
    return res.status(500).json({ error: "Failed to send email" });
  }
});

const httpServer = createServer(app);
const wss = new WebSocket.Server({ server: httpServer });

wss.on("connection", async (ws) => {
  console.log("🔗 New WebSocket connection established");

  const dg = createClient(process.env.DEEPGRAM_API_KEY);
  let dgConn;

  try {
    dgConn = dg.listen.live({
      model: "nova-2",
      language: "en-US",
      encoding: "linear16",
      sample_rate: 16000,
      channels: 1,
      interim_results: true,
      endpointing: 1200, // Longer endpointing for better sentence detection
      smart_format: true,
      punctuate: true,
      utterance_end_ms: 5000, // Longer utterance detection
      vad_events: true,
      no_delay: false, // Allow some delay for better accuracy
    });

    dgConn.on(LiveTranscriptionEvents.Open, () => {
      console.log("✅ Deepgram WebSocket opened successfully");
      // Send connection confirmation to client
      ws.send(
        JSON.stringify({
          type: "connection_status",
          status: "connected",
          message: "Deepgram connection established",
        })
      );
    });

    // Transcript buffering for sentence combination
    let transcriptBuffer = "";
    let bufferTimeout = null;
    const BUFFER_TIMEOUT_MS = 2000; // Wait 2 seconds for continuation

    dgConn.on(LiveTranscriptionEvents.Transcript, (data) => {
      try {
        const transcript = data.channel.alternatives[0]?.transcript;
        const confidence = data.channel.alternatives[0]?.confidence;
        const is_final = data.is_final;

        if (transcript && transcript.trim()) {
          console.log(
            `📡 Transcript (${is_final ? "final" : "interim"}):`,
            transcript
          );

          if (is_final) {
            // Add to buffer with proper spacing
            if (transcriptBuffer.trim()) {
              transcriptBuffer += " " + transcript.trim();
            } else {
              transcriptBuffer = transcript.trim();
            }

            // Clear existing timeout
            if (bufferTimeout) {
              clearTimeout(bufferTimeout);
            }

            // Set timeout to send buffered transcript
            bufferTimeout = setTimeout(() => {
              if (transcriptBuffer.trim()) {
                console.log(
                  "📡 Sending combined transcript:",
                  transcriptBuffer
                );
                ws.send(
                  JSON.stringify({
                    type: "transcript",
                    transcript: transcriptBuffer.trim(),
                    confidence,
                    is_final: true,
                    timestamp: new Date().toISOString(),
                  })
                );
                transcriptBuffer = "";
              }
            }, BUFFER_TIMEOUT_MS);
          }
        }
      } catch (err) {
        console.error("❌ Error processing transcript:", err);
      }
    });

    dgConn.on(LiveTranscriptionEvents.UtteranceEnd, (data) => {
      console.log("🔚 Utterance ended - flushing buffer");

      // Immediately send any buffered transcript on utterance end
      if (bufferTimeout) {
        clearTimeout(bufferTimeout);
        bufferTimeout = null;
      }

      if (transcriptBuffer.trim()) {
        console.log("📡 Sending final buffered transcript:", transcriptBuffer);
        ws.send(
          JSON.stringify({
            type: "transcript",
            transcript: transcriptBuffer.trim(),
            confidence: 1.0,
            is_final: true,
            timestamp: new Date().toISOString(),
          })
        );
        transcriptBuffer = "";
      }

      ws.send(
        JSON.stringify({
          type: "utterance_end",
          timestamp: new Date().toISOString(),
        })
      );
    });

    dgConn.on(LiveTranscriptionEvents.Error, (err) => {
      console.error("❌ Deepgram error:", err);
      // Send error details to client
      ws.send(
        JSON.stringify({
          type: "error",
          error: err.message || "Deepgram connection error",
          code: err.code || "UNKNOWN_ERROR",
        })
      );
    });

    dgConn.on(LiveTranscriptionEvents.Close, (closeEvent) => {
      console.log("🔒 Deepgram connection closed:", closeEvent);
    });

    // Handle incoming audio data
    ws.on("message", (msg) => {
      try {
        // Check if Deepgram connection is ready
        if (dgConn && dgConn.getReadyState() === 1) {
          console.log(
            "🔁 Forwarding audio buffer:",
            msg.byteLength || msg.length,
            "bytes"
          );
          dgConn.send(msg);
        } else {
          console.warn("⚠️ Deepgram not ready, discarding audio data");
        }
      } catch (err) {
        console.error("❌ Error sending audio to Deepgram:", err);
      }
    });

    ws.on("close", (code, reason) => {
      console.log(
        `🚪 WebSocket connection closed by client (${code}): ${reason}`
      );

      // Clear any pending timeouts
      if (bufferTimeout) {
        clearTimeout(bufferTimeout);
      }

      try {
        if (dgConn) {
          dgConn.finish();
        }
      } catch (err) {
        console.error("❌ Error closing Deepgram connection:", err);
      }
    });

    ws.on("error", (err) => {
      console.error("❌ WebSocket error:", err);
    });
  } catch (err) {
    console.error("❌ Failed to initialize Deepgram connection:", err);
    ws.send(
      JSON.stringify({
        type: "error",
        error: "Failed to initialize speech recognition",
        details: err.message,
      })
    );
    ws.close(1011, "Internal server error");
  }
});

// Node.js with Gemini Flash or GPT-4o
app.post("/api/extract-keywords", async (req, res) => {
  const { jobDescription } = req.body;

  if (!jobDescription || jobDescription.trim().length < 3) {
    return res.status(400).json({ error: "Job description is too short." });
  }

  const prompt = `
Extract the top 8 most relevant technical and professional keywords or phrases from this job description.

Focus on:
- Programming languages
- Frameworks and libraries
- Tools or platforms (like AWS, Docker, etc.)
- Soft skills (if clearly mentioned)
- Job-specific terms (e.g., microservices, REST, leadership)

Return **only** a JSON array of strings. No other explanation or formatting.

Job Description:
"""
${jobDescription}
"""`;

  try {
    const keywordsText = await callModel("Gemini 2.5 Flash", prompt);

    // ✅ Remove ```json or ``` wrappers if present
    const cleaned = keywordsText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const keywords = JSON.parse(cleaned);

    if (!Array.isArray(keywords)) {
      throw new Error("Model output is not a valid JSON array.");
    }

    res.json({ keywords });
  } catch (error) {
    console.error("❌ Failed to extract keywords:", error);
    res.status(500).json({
      error: "Failed to extract keywords using Gemini.",
      details: error.message,
    });
  }
});

app.post("/api/generate-mock-questions", async (req, res) => {
  const { email, mockInterviewId } = req.body;

  if (!email || !mockInterviewId) {
    return res.status(400).json({ error: "Missing email or mockInterviewId" });
  }

  try {
    const existingDoc = await db
      .collection("mockInterviewQuestions")
      .doc(mockInterviewId)
      .get();

    if (existingDoc.exists) {
      return res.json({
        success: true,
        message: "Questions already exist",
        questions: existingDoc.data().questions,
      });
    }

    const snapshot = await db
      .collection("practiceMockInterviews")
      .where("email", "==", email)
      .where("mockInterviewId", "==", mockInterviewId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "Interview not found" });
    }

    const interviewData = snapshot.docs[0].data();
    const keywords = interviewData.keywords || [];
    const company = interviewData.companyName || "the company";
    const role = interviewData.role || "the role";
    const difficulty = interviewData.difficulty || "Medium";
    const resumePath = interviewData.resumePathName;

    if (!keywords.length) {
      return res
        .status(400)
        .json({ error: "No keywords found to generate questions" });
    }

    // ✅ Step: Read resume content from Firebase
    let resumeText = "";
    if (resumePath) {
      try {
        const filePath = `uploads/${resumePath}`;
        const exists = await fileExistsInFirebase(filePath);
        if (exists) {
          const fileBuffer = await downloadFromFirebase(filePath);
          const ext = path.extname(resumePath).toLowerCase();

          if (ext === ".pdf") {
            const data = await pdfParse(fileBuffer);
            resumeText = data.text.trim();
          } else if (ext === ".doc" || ext === ".docx") {
            const tempFilePath = path.join(
              __dirname,
              "temp_resume_" + Date.now() + ext
            );
            await fs.outputFile(tempFilePath, fileBuffer);
            resumeText = await new Promise((resolve, reject) => {
              textract.fromFileWithPath(tempFilePath, (err, content) => {
                if (err) reject(err);
                else resolve(content);
              });
            });
            await fs.remove(tempFilePath);
          }
        }
      } catch (err) {
        console.warn(
          "⚠️ Could not read resume for question generation:",
          err.message
        );
      }
    }

    // ✅ Prompt with company, role, keywords, resume
    const prompt = `
You are generating mock interview questions for a candidate applying for the **${role}** role at **${company}** (difficulty: ${difficulty}).

Instructions:

For each section below, generate either 1 or 2 realistic interview questions (in simple English).
Do not always generate 2 questions. Make the number of questions feel natural and varied.
Some sections can have only 1 question, while others may have 2.

Avoid mentioning anything about randomness or quantity in your output. Just follow the structure.

Sections to include:

1. Introductory questions
2. Resume-based questions
3. Behavioral questions
4. For each keyword provided below, generate 1 or 2 technical questions


Keywords:
${keywords.map((k) => `- ${k}`).join("\n")}

Resume:
"""
${resumeText}
"""

Return JSON in the following format:
{
  "intro": [{ "text": "question here", "used": false }],
  "resumeBased": [{ "text": "question here", "used": false }],
  "behavioral": [{ "text": "question here", "used": false }],
  "technical": [
    {
      "keyword": "Python",
      "questions": [{ "text": "question here", "used": false }]
    }
  ]
}

⚠️ Rules:
- Only valid JSON (no explanation, no markdown)
- Do not return the same number of questions for every section.
`.trim();

    const generated = await callModel("Gemini 2.5 Flash", prompt);
    const cleaned = generated.replace(/```json|```/g, "").trim();

    let questionsData;
    try {
      questionsData = JSON.parse(cleaned);
    } catch (err) {
      console.error("❌ Failed to parse model output:", cleaned);
      return res.status(500).json({
        error: "Gemini returned invalid JSON. Please retry.",
        modelOutput: cleaned,
      });
    }

    await db.collection("mockInterviewQuestions").doc(mockInterviewId).set({
      email,
      mockInterviewId,
      company,
      role,
      difficulty,
      questions: questionsData,
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, questions: questionsData });
  } catch (error) {
    console.error("❌ Failed to generate questions:", error);
    res.status(500).json({ error: "Failed to generate mock questions" });
  }
});

// Evaluate answer and provide score
app.post("/api/evaluate-answer", async (req, res) => {
  const { question, answer, interviewId, email } = req.body;

  if (!question || !answer || !interviewId || !email) {
    return res.status(400).json({
      error: "Missing one or more required fields: question, answer, interviewId, email",
    });
  }


  const prompt = `
You are a senior interviewer conducting a friendly mock interview.

🎯 Your Task:

Given a candidate's answer to your interview question, return a JSON object with:

1. "score" (1–10): Based on how well the answer addressed the question
2. "feedback": One clear, concise sentence offering constructive feedback
3. "acknowledgment": A short, natural-sounding sentence that mimics what you'd say in a live interview

💬 Tone Guide for Acknowledgment:
- Keep it human and varied — like you're having a real conversation
- Encourage strong answers warmly:
  - “Nice, that was clear and confident.”
  - “Solid explanation — you really thought that through.”
- Be kind and supportive if the answer is weak or incorrect:
  - “I see where you’re coming from. Let’s build on that.”
  - “Okay, that’s an interesting start. Let’s revisit it in a bit.”
  - “Not quite, but no worries — let’s try another.”

❌ Avoid robotic phrases like “Thanks for your response.”  
✅ Make it sound like a real human talking live.

📦 Return only this exact JSON format:
{
  "score": 6,
  "feedback": "Decent attempt, but lacks accuracy and technical depth.",
  "acknowledgment": "Ex: I appreciate the try — let’s sharpen that a little."
}

---

Question: {{question}}
Answer: {{candidateAnswer}}

---

Question: ${question}
Answer: ${answer}
`;



  try {
    const evaluationText = await callModel("Gemini 2.5 Flash", prompt);
    const cleaned = evaluationText.replace(/```json|```/g, "").trim();
    const evaluation = JSON.parse(cleaned);

    // Validate score
    evaluation.score = Math.min(10, Math.max(1, Math.round(evaluation.score)));

    res.json(evaluation);
  } catch (error) {
    console.error("Evaluation error:", error);
    res.status(500).json({
      score: 5,
      feedback: "Could not evaluate answer properly",
    });
  }
});

// Generate follow-up question
app.post("/api/generate-followup", async (req, res) => {
  const { originalQuestion, answer, score, feedback, interviewId, email } =
    req.body;

  const prompt = `
You are a strict JSON-generating bot.

🎯 Task: Generate one concise follow-up interview question (1 sentence max) that:
- Focuses on the weakness in the candidate's answer
- Explores missing details or technical depth
- Aligns with the job context

🚫 DO NOT explain or greet. DO NOT say "Here's your question" or any extra text.

📦 Return ONLY valid JSON like this (no markdown, no quotes outside JSON):

{
  "followUpQuestion": "Your follow-up question here?"
}

🔍 Context:
Original Question: ${originalQuestion}
Candidate Answer: ${answer}
Score: ${score}/10
Feedback: ${feedback}
`;

  try {
    const followUpText = await callModel("Gemini 2.5 Flash", prompt);
    const cleaned = followUpText.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleaned);

    res.json(result);
  } catch (error) {
    console.error("Follow-up generation error:", error);
    res.status(500).json({
      followUpQuestion: "Can you elaborate more on that answer?",
    });
  }
});

app.post("/api/evaluate-communication", async (req, res) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({
      error: "Missing question or answer",
    });
  }

  const prompt = `
You are a communication coach evaluating a candidate's spoken answer.

Analyze their response and return the following JSON (no extra explanation):

{
  "grammar": 8.5,
  "vocabulary": 7.8,
  "confidence": 7.0,
  "communication": 7.8,
  "feedback": "Your grammar is mostly accurate with good vocabulary. Try to sound more confident in tone and reduce filler words."
}

Focus only on the textual answer, assuming it's transcribed from speech.

Question: ${question}
Answer: ${answer}
  `.trim();

  // Try each model until one works
  const tryModels = ["Gemini 2.5 Flash", ...(FALLBACK_MODELS["Gemini 2.5 Flash"] || [])];

  for (const currentModel of tryModels) {
    try {
      console.log(`🧠 [Comm Eval] Trying model: ${currentModel}`);
      const result = await callModel(currentModel, prompt);

      const cleaned = result.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // Clamp all numeric scores to 1–10 range
      for (let key of ["grammar", "vocabulary", "confidence", "communication"]) {
        parsed[key] = Math.round(Math.max(1, Math.min(10, parsed[key])) * 10) / 10;
      }

      return res.json(parsed);
    } catch (err) {
      console.warn(`⚠️ ${currentModel} failed during communication evaluation: ${err.message}`);
      continue; // try the next one
    }
  }

  // If none work:
  return res.status(503).json({
    error: "All communication models failed. Please try again shortly.",
  });
});



app.post('/api/generate-interview-summary', async (req, res) => {
  const { interviewId, questions, overallMetrics, categoryAverages, skillRatings } = req.body;

  try {
    // Prepare prompt for LLM
    const prompt = `
You are an expert career coach analyzing a mock interview. Provide a concise summary in JSON format with:
1. 3 key strengths
2. 3 areas needing improvement
3. 3 actionable recommendations

Base this on:
- Overall score: ${overallMetrics.score}/10
- Communication: ${overallMetrics.communication}/10
- Technical scores: ${JSON.stringify(categoryAverages)}
- Skill ratings: ${JSON.stringify(skillRatings)}

Return ONLY valid JSON in this exact format:
{
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
}

Avoid markdown or extra text. Focus on specific, actionable insights.
`;

    // Call LLM (Gemini as primary, with fallbacks)
    const tryModels = ["Gemini 2.5 Flash", ...(FALLBACK_MODELS["Gemini 2.5 Flash"] || [])];

    for (const model of tryModels) {
      try {
        const summaryText = await callModel(model, prompt);
        const cleaned = summaryText.replace(/```json|```/g, "").trim();
        const summary = JSON.parse(cleaned);

        // Validate structure
        if (summary.strengths && summary.improvements && summary.recommendations) {
          return res.json(summary);
        }
      } catch (err) {
        console.warn(`⚠️ ${model} failed for interview summary:`, err.message);
        continue;
      }
    }

    throw new Error('All models failed to generate valid summary');
  } catch (error) {
    console.error('❌ Summary generation error:', error);
    res.status(500).json({
      error: 'Failed to generate summary',
      details: error.message
    });
  }
});





// Function to clean HTML tags and styles from text
const cleanHtml = (text) => {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^\s*[\r\n]+/gm, '')
    .trim();
};


const extractPhoneNumber = (text) => {
  // Common phone number patterns (more comprehensive)
  const phonePatterns = [
    // Indian mobile numbers with country code (with various separators)
    /(\+91[\s-]?|0?[6-9])[1-9]\d{4}[\s-]?\d{5}/g,
    // Standard 10-digit number (with various separators)
    /([6-9]\d{2})[\s.-]?(\d{3})[\s.-]?(\d{4})/g,
    // Numbers with country code
    /(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    // Numbers in parentheses
    /\(\d{3}\)\s?\d{3}[-.]?\d{4}/g,
    // Simple 10-digit number
    /[6-9]\d{9}/g,
    // Numbers with spaces or dots
    /(\d{3}[-.\s]?){2}\d{4}/g
  ];

  // Try each pattern until we find a match
  for (const pattern of phonePatterns) {
    const matches = text.match(pattern);
    if (matches && matches[0]) {
      // Clean and format the number
      let number = matches[0].replace(/[^\d+]/g, '');

      // If it's a valid Indian mobile number without country code, add +91
      if (/^[6-9]\d{9}$/.test(number)) {
        // Check if it's a valid Indian mobile number
        const firstDigit = number.charAt(0);
        if (['6', '7', '8', '9'].includes(firstDigit)) {
          return `+91${number}`;
        }
      }

      // If it's a valid international number, return as is
      if (/^\+\d{10,15}$/.test(number)) {
        return number;
      }

      // For other cases, return the cleaned number
      return number;
    }
  }
  return 'Not found';
};

// Function to count words in text
const countWords = (text) => {
  if (!text || typeof text !== 'string') return 0;

  // Remove punctuation and HTML tags (if any)
  const cleaned = text.replace(/<[^>]*>/g, '').replace(/[^\w\s]|_/g, '');

  const words = cleaned.trim().split(/\s+/);

  return words.filter(word => word.length > 0).length;
};

// Function to analyze and format dates in the resume
const analyzeDateFormats = (text) => {
  if (!text || typeof text !== "string") {
    return {
      format_issue: false,
      existing_format: "",
      order_issue: false,
      formatted_dates: []
    };
  }

  const datePatterns = [
    // YYYY-MM
    /(?:\b|\D)(20\d{2}[-/](?:0[1-9]|1[0-2]))(?:\b|\D)/g,

    // MM/YYYY or MM-YYYY
    /(?:\b|\D)((?:0[1-9]|1[0-2])[-/](20\d{2}))(?:\b|\D)/g,

    // MMM YYYY (e.g., Jan 2023)
    /(?:\b|\D)(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[ ]20\d{2}(?:\b|\D)/gi,

    // MMMM YYYY (e.g., January 2023)
    /(January|February|March|April|May|June|July|August|September|October|November|December)[ ]20\d{2}/gi,

    // YYYY/MM/DD or YYYY-MM-DD
    /(20\d{2}[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12][0-9]|3[01]))/g,

    // DD/MM/YYYY or DD-MM-YYYY
    /(?:\b|\D)((?:0[1-9]|[12][0-9]|3[01])[-/](?:0[1-9]|1[0-2])[-/]20\d{2})(?:\b|\D)/g
  ];

  const foundDates = [];
  let hasOrderIssue = false;

  // Extract all date strings using defined patterns
  for (const pattern of datePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let raw = match[0];
      let cleaned = raw.replace(/[\s\-\/]+/g, " ").trim(); // normalize

      // Try to parse the date using Date constructor
      const parsedDate = new Date(cleaned);

      if (!isNaN(parsedDate.getTime())) {
        foundDates.push({
          original: raw,
          date: parsedDate,
          formatted: parsedDate.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric"
          }).replace(" ", " ")
        });
      }
    }
  }

  // Sort dates chronologically
  const sortedDates = [...foundDates].sort((a, b) => b.date - a.date);

  // Check for reverse chronological order (most recent first)
  for (let i = 1; i < sortedDates.length; i++) {
    if (sortedDates[i].date > sortedDates[i - 1].date) {
      hasOrderIssue = true;
      break;
    }
  }

  // Detect format inconsistencies
  const formatSet = new Set(foundDates.map(d => d.original.trim()));
  const hasFormatIssue = formatSet.size > 1;

  // Detect most common format
  const formatCounts = {};
  for (const d of foundDates) {
    const key = d.original.trim();
    formatCounts[key] = (formatCounts[key] || 0) + 1;
  }

  let mostCommonFormat = "";
  let maxCount = 0;
  for (const [format, count] of Object.entries(formatCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonFormat = format;
    }
  }

  return {
    format_issue: hasFormatIssue,
    existing_format: mostCommonFormat || "",
    order_issue: hasOrderIssue,
    formatted_dates: foundDates.map(d => ({
      original: d.original,
      formatted: d.formatted
    }))
  };
};



app.post("/api/analyze-resume", async (req, res) => {
  let { resumeText, jobDescription, email } = req.body;

  if (!resumeText || !jobDescription) {
    return res.status(400).json({
      error: "Both resumeText and jobDescription are required",
    });
  }

  // Clean the job description to remove any HTML tags and styles
  jobDescription = cleanHtml(jobDescription);
  // Also clean the resume text just in case
  resumeText = cleanHtml(resumeText);

  // Function to try multiple models for a given prompt
  const tryModels = async (prompt, parseFunction, defaultResponse) => {
    const models = ["Gemini 2.5 Flash", ...(FALLBACK_MODELS["Gemini 2.5 Flash"] || [])];

    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
        const result = await callModel(model, prompt);
        const parsed = parseFunction(result, null);
        if (parsed !== null) {
          return parsed;
        }
      } catch (error) {
        console.warn(`⚠️ ${model} failed:`, error.message);
        continue;
      }
    }

    console.warn("All models failed, using default response");
    return defaultResponse;
  };

  // Helper function to parse JSON with fallback
  const parseJSON = (jsonString, fallback) => {
    if (!jsonString || typeof jsonString !== 'string') {
      console.warn('Invalid input for JSON parsing:', typeof jsonString);
      return fallback;
    }

    // Step 1: Clean the input string
    let cleaned = jsonString
      .replace(/```json|```/g, "")
      .replace(/^(Here's|Here is|Okay,|Sure,|I'll|The|This is).*?(\{|\[)/i, "$2")
      .replace(/^[^{\[]*(\{|\[)/, "$1")
      .trim();

    // Step 2: Try multiple parsing strategies
    const strategies = [
      // Strategy 1: Direct parse
      (str) => JSON.parse(str),

      // Strategy 2: Remove trailing commas
      (str) => {
        const withoutTrailingCommas = str
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/,(\s*,)/g, '$1');
        return JSON.parse(withoutTrailingCommas);
      },

      // Strategy 3: Remove comments and fix common issues
      (str) => {
        const withoutComments = str
          .replace(/\/\/.*$/gm, '') // Remove single-line comments
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
          .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double quotes
          .trim();
        return JSON.parse(withoutComments);
      },

      // Strategy 4: Extract valid JSON using regex
      (str) => {
        const match = str.match(/^(\{[\s\S]*?\}|\[[\s\S]*?\])$/);
        if (!match) throw new Error('No valid JSON structure found');
        return JSON.parse(match[1]);
      },

      // Strategy 5: Try to fix bracket/brace mismatches
      (str) => {
        let fixed = str;

        // Count and balance braces
        const openBraces = (fixed.match(/\{/g) || []).length;
        const closeBraces = (fixed.match(/\}/g) || []).length;

        if (openBraces > closeBraces) {
          fixed += '}'.repeat(openBraces - closeBraces);
        } else if (closeBraces > openBraces) {
          fixed = fixed.replace(/\}+$/, '');
          fixed += '}'.repeat(openBraces);
        }

        // Count and balance brackets
        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/\]/g) || []).length;

        if (openBrackets > closeBrackets) {
          fixed += ']'.repeat(openBrackets - closeBrackets);
        } else if (closeBrackets > openBrackets) {
          fixed = fixed.replace(/\]+$/, '');
          fixed += ']'.repeat(openBrackets);
        }

        return JSON.parse(fixed);
      },

      // Strategy 6: Use a more aggressive regex extraction
      (str) => {
        // Look for the first complete JSON object or array
        let depth = 0;
        let start = -1;
        let end = -1;

        for (let i = 0; i < str.length; i++) {
          const char = str[i];

          if (char === '{' || char === '[') {
            if (start === -1) start = i;
            depth++;
          } else if (char === '}' || char === ']') {
            depth--;
            if (depth === 0 && start !== -1) {
              end = i;
              break;
            }
          }
        }

        if (start !== -1 && end !== -1) {
          const extracted = str.substring(start, end + 1);
          return JSON.parse(extracted);
        }

        throw new Error('Could not extract valid JSON');
      }
    ];

    // Try each strategy
    for (let i = 0; i < strategies.length; i++) {
      try {
        const result = strategies[i](cleaned);

        // Validate that we got a proper object/array
        if (result !== null && typeof result === 'object') {
          return result;
        }
      } catch (error) {
        console.warn(`Strategy ${i + 1} failed:`, error.message);
        continue;
      }
    }

    // If all strategies fail, log the original string for debugging
    console.error('All JSON parsing strategies failed for:', {
      originalLength: jsonString.length,
      cleanedLength: cleaned.length,
      preview: cleaned.substring(0, 200) + (cleaned.length > 200 ? '...' : ''),
      firstChar: cleaned[0],
      lastChar: cleaned[cleaned.length - 1]
    });

    return fallback;
  };


  try {
    // Step 1: Extract contact information
    const contactPrompt = `
CRITICAL: Return ONLY valid JSON. DO NOT include any extra text, markdown, or explanations.

🎯 TASK:
Extract the candidate's **email** and **phone number** from this resume text.

📦 RESPONSE FORMAT (return exactly this structure):
{
  "email": "email@example.com",
  "phone": "+14155552671"
}

📜 RULES:
- Extract the most professional-looking email address.
- Phone numbers **must** be returned in full **E.164 format**, which includes:
  - A plus sign (+)
  - The country code (e.g., +1 for USA, +91 for India, etc.)
  - Followed by the national number without spaces or dashes

📌 FORMATTING RULES:
- Do NOT include any additional text, explanation, headings, or markdown
- Return empty string "" for either field if not found
- No bullet points. No commentary. Just the JSON object.

📄 Resume:
"""
${resumeText}
"""
`;

    let contactData = { email: "", phone: "" };
    let llmContactData = {};

    // First try to extract phone number using regex directly
    const extractedPhone = extractPhoneNumber(resumeText);
    if (extractedPhone && extractedPhone !== 'Not found') {
      contactData.phone = extractedPhone;
    } else {
      // Fall back to LLM if regex fails
      const llmContactData = await tryModels(
        contactPrompt,
        (result) => {
          const data = parseJSON(result, null);
          return data && (data.phone || data.email) ? data : null;
        },
        { phone: "", email: "" }
      );
      if (llmContactData.phone) {
        contactData.phone = llmContactData.phone;
      }
    }

    // Extract email using regex as fallback if needed
    const emailMatch = resumeText.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/);
    if (emailMatch) {
      contactData.email = emailMatch[0];
    } else if (llmContactData && llmContactData.email) {
      contactData.email = llmContactData.email;
    }

    const accomplishmentsPrompt = `
    CRITICAL: Return ONLY valid JSON array. DO NOT include any explanations, markdown, or extra text.
    
    🎯 TASK:
    Extract ONLY true, quantifiable accomplishments from the resume. If no valid accomplishments are found, return an empty array.
    
    ✅ A valid accomplishment MUST:
    - Be 1 line only
    - Start with a strong action verb (Led, Delivered, Reduced, Improved, Built, Won, Generated, Increased, Developed, Automated, Achieved, etc.)
    - Include a clear outcome, quantifiable result, or measurable impact (e.g., 40% reduction, Rs. 45,000 budget, 95% speed improvement)
    - Show individual or team ownership — not vague tasks
    
    🚫 Do NOT include:
    - Descriptions of projects or tools used
    - Education details (e.g., CGPA, semester info)
    - Responsibilities or duties ("worked on", "used", "helped")
    - Vague results without metrics ("improved UX" without data)
    - Any line that doesn't clearly show impact
    
    📦 RESPONSE FORMAT (copy exactly):
    [
      "Reduced appointment scheduling time by 60% through automation",
      "Achieved 95% speed improvement in robotic maze solving competition",
      "Won hackathon for building Automated Invigilation System to be implemented in college"
    ]
    
    🔒 RULES:
    - Return only 3–7 high-impact lines — no more than 7
    - Return ONLY lines that meet all 3 criteria: [Verb] + [Action] + [Measurable Result]
    - Return a maximum of 7 lines
    - Return fewer than 7 if not enough valid accomplishments exist
    - Do NOT include filler to meet the number — quality over quantity

    
    📄 Resume:
    """
    ${resumeText}
    """
    `;



    const accomplishmentsResult = await callModel("Gemini 2.5 Flash", accomplishmentsPrompt);
    const accomplishmentsData = parseJSON(accomplishmentsResult, []);

    const skillsPrompt = `
CRITICAL: Return ONLY valid JSON array with NO explanations, markdown, or extra text.

🎯 TASK:
Extract all technical skills from the resume below.

✅ Include:
- Programming languages (e.g., JavaScript, Python)
- Frameworks & libraries (e.g., React, Django, Pandas)
- Databases (e.g., MySQL, MongoDB)
- DevOps & cloud tools (e.g., Docker, AWS, Git, Jenkins)
- Data tools (e.g., Tableau, Power BI, NumPy)
- Tech platforms & APIs (e.g., Firebase, REST APIs)
- Software or IDEs if technical (e.g., Postman, VS Code, Figma if used for dev)

🚫 Exclude:
- Soft skills (e.g., Leadership, Communication)
- Roles/titles (e.g., Full Stack Developer)
- Certifications or course names
- Generic terms (e.g., Web development, Coding, Project)

📦 FORMAT:
Return an array of strings:
[
  "JavaScript",
  "React",
  "MySQL"
]

📌 RULES:
- Deduplicate exact and similar entries (e.g., "Python" only once)
- No grouping — flat list only
- Capitalize as commonly written (e.g., "HTML", not "html")
- Return only a JSON array. No markdown. No commentary.

📄 Resume:
"""
${resumeText}
"""
`;


    const skillsResult = await callModel("Gemini 2.5 Flash", skillsPrompt);
    const skillsData = parseJSON(skillsResult, []);

    // Step 4: Analyze high impact skills
    const highImpactPrompt = `
CRITICAL: Return ONLY valid JSON. Do NOT include explanations, markdown, or extra text.

🎯 TASK:
Identify the high-impact technical skills that are clearly mentioned in the job description but are not present in the candidate's resume.

These are the must-have hard skills typically prioritized by recruiters and ATS systems (e.g., Python, SQL, Docker, Power BI, REST APIs, etc.)

📦 RESPONSE FORMAT (return this exact structure):
{
  "title": "Hard Skills",
  "matchPercentage": 65,
  "missingCount": 3,
  "description": "These are critical technical skills from the job description that are missing from the resume.",
  "keywords": ["Data Validation", "Dashboards", "Power BI"]
}

📊 RULES:
- ✅ Only include skills that:
  - Appear in the job description
  - Do NOT appear in the resume (case-insensitive match)
  - Are technical: languages, tools, platforms, APIs, frameworks

- ❌ Exclude:
  - Soft skills (e.g., Communication, Leadership)
  - Generic words (e.g., System, Technology, Process)
  - Reworded duplicates

- "matchPercentage":
  - Reflects how many required hard skills were found vs. missing
  - (e.g., if 7 of 10 technical skills are missing → 30%)

- "missingCount": Number of missing technical keywords

- "description":
  - 1 sentence, human-readable explanation (no AI tone)
  - Don't restate the skill names. No markdown.

🔐 NO:
- No commentary
- No headings or markdown
- No guesswork — ONLY the JSON object

📄 Resume:
"""
${resumeText}
"""

📌 Job Description:
"""
${jobDescription}
"""
`;


    const highImpactResult = await callModel("Gemini 2.5 Flash", highImpactPrompt);
    const highImpactData = parseJSON(highImpactResult, { title: "Hard Skills", matchPercentage: 0, missingCount: 0, description: "Not analyzed", keywords: [] });

    // Step 5: Analyze medium impact skills
    const mediumImpactPrompt = `
    CRITICAL: Return ONLY valid JSON. DO NOT include explanations, markdown, or extra text.
    
    🎯 TASK:
    Identify soft skills and interpersonal traits that are clearly mentioned in the job description, but are missing from the candidate's resume.
    
    These are typically non-technical but important for team culture, communication, and leadership.
    
    📦 RESPONSE FORMAT (return exactly this):
    {
      "title": "Soft Skills",
      "matchPercentage": 60,
      "missingCount": 3,
      "description": "These soft skills and behavioral traits are expected for this role but are not evident in the resume.",
      "keywords": ["Strategic Thinking", "Team Collaboration", "Adaptability"]
    }
    
    📊 RULES:
    - ✅ Include ONLY soft skills that:
      - Appear clearly in the job description
      - Do NOT appear in the resume (case-insensitive match)
      - Reflect interpersonal, communication, or mindset traits
    
    - ❌ Do NOT include:
      - Technical or hard skills (e.g., Python, Excel, SQL)
      - Redundant synonyms or fluff terms
      - Common resume filler like "dedicated" unless explicitly required
    
    - "matchPercentage":
      - Based on the proportion of soft skills in the job description that are missing from the resume
      - Round to nearest whole number (0–100)
    
    - "missingCount": number of soft skills missing from resume
    
    - "description":
      - 1 clear sentence (no lists, no markdown, no AI-fluff)
      - Should not repeat the keywords — keep it natural
    
    🔐 ABSOLUTELY NO:
    - Explanations
    - Markdown
    - Commentary or disclaimers
    - Additional formatting
    
    📄 Resume:
    """
    ${resumeText}
    """
    
    📌 Job Description:
    """
    ${jobDescription}
    """
    `;


    const mediumImpactResult = await callModel("Gemini 2.5 Flash", mediumImpactPrompt);
    const mediumImpactData = parseJSON(mediumImpactResult, { title: "Soft Skills", matchPercentage: 0, missingCount: 0, description: "Not analyzed", keywords: [] });

    // Step 6: Analyze low impact skills
    const lowImpactPrompt = `
    CRITICAL: Return ONLY valid JSON. DO NOT include explanations, markdown, or extra text.
    
    🎯 TASK:
    Identify low-impact or secondary skills that are mentioned in the job description but are not found in the resume.
    
    These skills are typically nice-to-have, contextual, or supportive — not core technical or soft skills, but they complement the candidate's profile.
    
    📦 RESPONSE FORMAT (return exactly this):
    {
      "title": "Other Skills",
      "matchPercentage": 45,
      "missingCount": 4,
      "description": "These additional skills could add value to your profile, though they are not critical requirements.",
      "keywords": ["Documentation", "Operations", "Scheduling", "Reporting"]
    }
    
    📌 INCLUDE ONLY:
    - Contextual skills from the JD that:
      - Are relevant but not mandatory
      - Are not already included as technical or soft skills
      - Are missing in the resume
    
    📌 Examples of valid low-impact skills:
    - Documentation
    - Report generation
    - SLA tracking
    - Workflow tools (e.g., Jira, Trello, CRM)
    - Process management
    - Admin tasks
    - Record-keeping
    - Support operations
    
    🚫 DO NOT INCLUDE:
    - Hard skills like "Python", "SQL", "React"
    - Soft skills like "Teamwork", "Communication"
    - Any skill already listed in previous skill categories
    
    📊 SCORING:
    - "matchPercentage": % of nice-to-have JD terms that are missing
    - "missingCount": Number of missing secondary keywords
    - "description": 1 sentence — natural tone, no buzzwords, no repetition of keyword list
    
    🧠 NOTES:
    - Keep keywords lowercase unless they are tool names (e.g., "Jira", "Trello")
    - Return ONLY a flat array of unique, clean strings
    - No commentary, markdown, explanations, or formatting tricks
    
    📄 Resume:
    """
    ${resumeText}
    """
    
    📌 Job Description:
    """
    ${jobDescription}
    """
    `;


    const lowImpactResult = await callModel("Gemini 2.5 Flash", lowImpactPrompt);
    const lowImpactData = parseJSON(lowImpactResult, { title: "Other Skills", matchPercentage: 0, missingCount: 0, description: "Not analyzed", keywords: [] });

    // Step 7: Analyze buzzwords
    const buzzwordsPrompt = `
CRITICAL: Return ONLY valid JSON with NO explanations, markdown, or extra text.

🎯 TASK:
Analyze the resume and identify **overused, generic buzzwords** that weaken its professional impact. Then, suggest **stronger, more specific alternatives** for each one.

📦 RESPONSE FORMAT (return exactly this structure):
{
  "title": "Overused Buzzwords",
  "description": "These common phrases weaken your resume's impact and can be replaced with more specific language.",
  "words": ["Achieved", "Collaborated", "Responsible for"],
  "alternate": ["Delivered measurable results", "Worked cross-functionally with [team/context]", "Led or executed specific tasks with outcomes"]
}

📌 WHAT TO FLAG AS BUZZWORDS:
- Generic verbs: "Achieved", "Worked on", "Handled", "Managed", "Responsible for"
- Filler phrases: "Hardworking", "Go-getter", "Team player", "Detail-oriented"
- Passive or vague statements: "Involved in", "Participated in", "Assisted with"

📌 WHAT TO SUGGEST INSTEAD:
- **Action + impact** phrasing (e.g., "Reduced API latency by 40%")
- **Clear contribution** with context (e.g., "Led a team of 5 to build X")
- Measurable results, concise ownership verbs

🚫 DO NOT:
- Suggest skills or technologies as replacements
- Repeat the same alternate multiple times
- Include any explanation, markdown, headings, or extra formatting

📌 RULES:
- Match terms case-insensitively
- Return up to **7 buzzwords**

RESPONSE FORMAT (copy exactly):
{
  "title": "Overused Buzzwords",
  "description": "These common phrases weaken your resume's impact and can be replaced with more specific language.",
  "words": ["Achieved", "Collaborated", "Hardworking"],
  "alternate": ["Delivered measurable results", "Worked cross-functionally with engineers", "Demonstrated persistence through project delivery"]
}


📄 Resume:
"""
${resumeText}
"""
`;


    const buzzwordsResult = await callModel("Gemini 2.5 Flash", buzzwordsPrompt);
    const buzzwordsData = parseJSON(buzzwordsResult, { title: "Overused Buzzwords", description: "Not analyzed", words: [] });

    // Step 8: Analyze verbs
    const verbsPrompt = `
    CRITICAL: Return ONLY valid JSON. DO NOT include markdown, explanations, or extra text.
    
    🎯 TASK:
    Analyze the resume and identify:
    - Weak or generic action verbs used
    - Strong action verbs that are **missing but expected**
    Then suggest better, stronger alternatives to improve impact.
    
    📦 RESPONSE FORMAT (return exactly this structure):
    {
      "title": "Verb Strength",
      "description": "Replace weak or missing action verbs with stronger, more impactful alternatives.",
      "words": ["Assisted", "Helped with", "Worked on"],
      "alternate": ["Executed independently", "Led key deliverables", "Engineered or built with impact"]
    }
    
    📌 WHAT TO FLAG:
    - Weak verbs in the resume like: "Helped", "Assisted", "Worked on", "Handled", "Did", "Made"
    - Or identify missing strong verbs if the accomplishments lack action entirely
    
    📌 WHAT TO SUGGEST:
    - Specific verbs that imply ownership, leadership, or measurable results, e.g.:
      - "Optimized", "Delivered", "Engineered", "Reduced", "Developed", "Designed", "Launched", "Spearheaded"
    
    📌 RULES:
    - words[]: 3–7 weak verbs or missing strong verbs
    - alternate[]: 1:1 aligned with stronger replacements
    - Case-insensitive match
    - Do NOT include explanations or markdown
    - Do NOT suggest tech skills (e.g., "Python") as replacements
    
    📄 Resume:
    """
    ${resumeText}
    """
    `;

    const verbsResult = await callModel("Gemini 2.5 Flash", verbsPrompt);
    const verbsData = parseJSON(verbsResult, { title: "Verb Strength", description: "Not analyzed", words: [] });

    // Step 9: Analyze pronouns
    const pronounsPrompt = `
    CRITICAL: Return ONLY valid JSON. DO NOT include explanations, markdown, or extra text.
    
    🎯 TASK:
    Identify any **first-person pronouns** used in the resume and suggest **professional replacements** for each to make the resume sound formal and ATS-friendly.
    
    📦 RESPONSE FORMAT (use exactly this structure):
      {
        "title": "First-Person Language",
        "description": "These first-person pronouns make your resume sound informal or self-centered:",
        "words": ["my", "we", "our"],
        "alternate": ["the", "the team", "the company"]
      }

    
    📌 INSTRUCTIONS:
    - Check for first-person words like: "I", "me", "my", "mine", "we", "our", "us"
    - ONLY include words that are actually present in the resume
    - In the "alternate" array, give a replacement for each word in "words[]"
    - Alternatives should sound natural in a **third-person, professional resume tone**
    
    📌 Examples:
    - "I" → "" (just remove it or start with a verb)
    - "my project" → "the project"
    - "our system" → "the system"
    
    🛑 DO NOT:
    - Repeat the same replacement for all words
    - Suggest vague words like "one" or "someone"
    - Include explanations, markdown, or extra text — only the JSON
    
    📄 Resume:
    """
    ${resumeText}
    """
    `;


    const pronounsResult = await callModel("Gemini 2.5 Flash", pronounsPrompt);
    const pronounsData = parseJSON(pronounsResult, { title: "First-Person Language", description: "Not analyzed", words: [] });

    // Step 10: Extract keywords
    const keywordsPrompt = `
CRITICAL: Return ONLY valid JSON array with no explanations, markdown, or other text.

Extract all keywords from the job description. Then, check whether each of these keywords also appears in the resume.

Resume:
"""
${resumeText}
"""

Job Description:
"""
${jobDescription}
"""

RESPONSE FORMAT (copy exactly):
[
  {
    "keyword": "Analytics",
    "type": "Hard",
    "score": 100,
    "resumeCount": 1,
    "jobCount": 1
  }
]

RULES:

INCLUDE ONLY:
- All keywords that appear in the job description.
- Whether or not they're in the resume.

DO NOT INCLUDE:
- Keywords that are only found in the resume but not in the job description.

FOR EACH KEYWORD:
- "score":
  - 100 if the keyword is also found in the resume.
  - 0 if it's NOT found in the resume.
- "resumeCount": How many times this keyword appears in the resume.
- "jobCount": How many times this keyword appears in the job description.
- "type" must be one of:
  - "Hard" for technical tools/skills (e.g., SQL, Python, Tableau)
  - "Soft" for people or communication skills (e.g., Collaboration, Communication)
  - "Other" for general job terms (e.g., Operations, Reporting, Dashboards)

DO NOT include explanations, markdown, headings, or commentary.
DO return only a clean JSON array.

`;

    const keywordsResult = await callModel("Gemini 2.5 Flash", keywordsPrompt);
    const keywordsData = parseJSON(keywordsResult, []);

    // Step 11: Calculate word count and analyze dates
    const wordCount = countWords(resumeText);
    const dateAnalysis = analyzeDateFormats(resumeText);

    // Build the initial report data without match score
    const initialReportData = {
      resumeInfo: {
        wordCount,
        phone: contactData.phone || "Not found",
        email: contactData.email || email || "Not found",
        accomplishments: accomplishmentsData.slice(0, 7),
      },
      skills: {
        highImpact: highImpactData,
        mediumImpact: mediumImpactData,
        lowImpact: lowImpactData
      },
      writingAnalysis: {
        buzzwords: buzzwordsData,
        verbs: verbsData,
        pronouns: pronounsData
      },
      dateCheck: dateAnalysis,
      keywords: keywordsData,
      jobDescription: jobDescription.slice(0, 500), // Truncate for response
    };

    // Step 12: Calculate final match score based on all analysis data
    const finalMatchScorePrompt = `
⚠️ STRICT INSTRUCTION:  
Return ONLY valid JSON — no markdown, no explanation, no comments.  
Do NOT include “json” or anything extra. Just return the JSON object.

🎯 OBJECTIVE:  
Evaluate the candidate’s resume strictly by comparing it against the Job Description (JD). Use the provided Analysis Data only as a secondary hint to confirm or support deductions. DO NOT give benefit of doubt unless supported directly by the resume content.

Begin each score at 0 and add ONLY when strong, explicit, job-relevant evidence is found.

---

📦 FINAL JSON FORMAT (MANDATORY):
{
  "technicalSkills": 0,
  "keywordMatch": 0,
  "experience": 0,
  "writingQuality": 0,
  "softSkills": 0,
  "projectRelevance": 0,
  "achievementImpact": 0,
  "educationFit": 0,
  "certifications": 0,
  "overallClarity": 0
}

---

🔍 SCORING INSTRUCTIONS:

🔧 technicalSkills (Max 45)
- Match % < 40% → 0 pts
- 40–60% = 10–25 pts (if relevant techs partially match)
- >60% match = 25–35 pts
- All key techs from JD + strong context = 40–45 pts
- Mentioned but no usage = low score

🧠 keywordMatch (Max 25)
- Hard skills = up to 15
- Domain/business terms from JD = up to 10
- Use of fluff/synonyms only = <10 pts

💼 experience (Max 20)
- Industry or role relevance = 5–10
- Specific company/role evidence = 5–10
- No timelines, unclear roles = <5 pts

📝 writingQuality (Max 5)
- Clear sections, verbs, bullet points = 4–5
- Passive or generic = 2–3
- Messy structure or all fluff = 0–1

👥 softSkills (Max 5)
- Only count skills aligned with JD (e.g. collaboration, leadership)
- Clear achievement context = full credit
- Generic mentions = 0–1

💡 projectRelevance (Max 10)
- Projects aligned with job goals = 5–7
- Measurable output = +2
- Side projects, vague context = 0–3

🏆 achievementImpact (Max 10)
- Quantifiable wins: % savings, revenue, performance boosts = 6–10
- Generic “handled”, “worked on” = 0–2
- Partial numbers = 3–5

🎓 educationFit (Max 5)
- JD requires specific degree and resume matches = 5
- Somewhat relevant = 2–4
- Not mentioned or irrelevant = 0

📄 certifications (Max 5)
- Relevant certs (JD-required or preferred) = up to 5
- Nice-to-have certs = 1–2
- No certs mentioned = 0

🌟 overallClarity (Max 5)
- Consistent formatting, fonts, headings = 4–5
- Some structure but visual noise = 2–3
- Chaotic layout or inconsistent = 0–1

---

📄 Resume:
"""
${resumeText}
"""

📌 Job Description:
"""
${jobDescription}
"""

📊 Analysis Data:
${JSON.stringify(initialReportData, null, 2)}

---

🚨 RETURN RULES:
- Format must be VALID JSON
- Do NOT calculate total score
- Do NOT return explanation or markdown
- Do NOT hallucinate evidence
`;


    const finalMatchScoreResult = await callModel("Gemini 2.5 Flash", finalMatchScorePrompt);

    // Parse individual category scores
    const breakdown = parseJSON(finalMatchScoreResult, {
      technicalSkills: 0,
      keywordMatch: 0,
      experience: 0,
      writingQuality: 0,
      softSkills: 0
    });

    // Calculate final score from breakdown
    const finalScore = breakdown.technicalSkills
      + breakdown.keywordMatch
      + breakdown.experience
      + breakdown.writingQuality
      + breakdown.softSkills;

    // Create realistic message based on final score
    let message = "Poor match for the role.";
    if (finalScore >= 70) message = "Strong match for the role.";
    else if (finalScore >= 60) message = "Good match with some gaps.";
    else if (finalScore >= 50) message = "Moderate match for the role.";
    else if (finalScore >= 40) message = "Weak match with significant gaps.";

    const finalMatchScoreData = {
      value: finalScore,
      message,
      description: "Final score calculated from strict category-based breakdown."
    };

    // Combine with full report
    const finalReportData = {
      ...initialReportData,
      matchScore: finalMatchScoreData,
      scoreBreakdown: breakdown // Add this to help debugging/fine-tuning later
    };

    res.json(finalReportData);
  } catch (error) {
    console.error("❌ Resume analysis error:", error);

    // Enhanced error handling with fallback models
    const tryModels = ["GPT-4o Mini", "LLaMA 3.3 8B", "Mistral 7B"];

    for (const model of tryModels) {
      try {
        console.log(`🔄 Trying fallback model: ${model}`);

        // Simplified fallback analysis
        const fallbackPrompt = `
Analyze this resume against the job description and return a basic match score:

Resume: ${resumeText.slice(0, 3000)}
Job Description: ${jobDescription.slice(0, 1000)}

Return ONLY this JSON:
{
  "value": 50,
  "message": "Basic analysis completed",
  "description": "Fallback analysis due to primary model failure"
}`;

        const result = await callModel(model, fallbackPrompt);
        const cleaned = result.replace(/```json|```/g, "").trim();
        const data = JSON.parse(cleaned);

        // Return minimal response for fallback
        const fallbackReport = {
          matchScore: data,
          resumeInfo: {
            wordCount: resumeText.split(/\s+/).filter(Boolean).length,
            phone: "Not analyzed",
            email: email || "Not found",
            accomplishments: ["Analysis incomplete due to model failure"]
          },
          skills: {
            highImpact: { title: "Hard Skills", matchPercentage: 0, missingCount: 0, description: "Not analyzed", keywords: [] },
            mediumImpact: { title: "Soft Skills", matchPercentage: 0, missingCount: 0, description: "Not analyzed", keywords: [] },
            lowImpact: { title: "Other Skills", matchPercentage: 0, missingCount: 0, description: "Not analyzed", keywords: [] }
          },
          writingAnalysis: {
            buzzwords: { title: "Overused Buzzwords", description: "Not analyzed", words: [] },
            verbs: { title: "Verb Strength", description: "Not analyzed", words: [] },
            pronouns: { title: "First-Person Language", description: "Not analyzed", words: [] }
          },
          keywords: [],
          jobDescription: jobDescription.slice(0, 500)
        };

        return res.json(fallbackReport);
      } catch (fallbackError) {
        console.warn(`⚠️ ${model} failed:`, fallbackError.message);
        continue;
      }
    }

    res.status(500).json({
      error: "All models failed to analyze resume",
      details: error.message,
    });
  }
});



app.get('/api/questions', (req, res) => {
  const results = [];
  const csvPath = path.join(__dirname, 'data', 'part_questions.csv');

  // Check if file exists
  if (!fs.existsSync(csvPath)) {
    return res.status(404).json({ error: 'Question database not found' });
  }

  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (data) => {
      // Clean up the data if needed
      const cleanedData = {};
      for (const key in data) {
        cleanedData[key.trim()] = data[key].trim();
      }
      results.push(cleanedData);
    })
    .on('end', () => {
      res.json(results);
    })
    .on('error', (err) => {
      console.error('Error reading CSV:', err);
      res.status(500).json({ error: 'Failed to read question database' });
    });
});


































// Server
app.get("/api/roles", async (req, res) => {
  const companyQuery = req.query.company;
  if (!companyQuery) return res.status(400).json({ error: "Missing 'company'" });

  const searchUrl = `https://www.glassdoor.com/Search/results.htm?keyword=${encodeURIComponent(companyQuery)}`;

  try {
    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0");

    // Function to search for company with retry
    const searchCompanyWithRetry = async (attempt = 1) => {
      console.log(`🔍 Attempt ${attempt}: Searching Glassdoor for: ${companyQuery}`);
      await page.goto(searchUrl, { waitUntil: "domcontentloaded" });

      const companyInterviewUrl = await page.evaluate(() => {
        const link = document.querySelector('a[href*="/Overview/Working-at"]');
        if (!link) return null;

        const href = link.getAttribute("href");
        return href
          ? `https://www.glassdoor.com${href.replace("/Overview/", "/Interview/").replace(".htm", "-Interview-Questions.htm")}`
          : null;
      });

      if (!companyInterviewUrl && attempt < 2) {
        console.log(`⚠️ Company not found, retrying...`);
        await page.waitForTimeout(1000);
        return searchCompanyWithRetry(attempt + 1);
      }

      return companyInterviewUrl;
    };

    // STEP 1: Search for company with retry
    const companyInterviewUrl = await searchCompanyWithRetry();

    if (!companyInterviewUrl) {
      await browser.close();
      console.log(`❌ Company not found after 2 attempts`);
      return res.status(404).json({ error: "Company not found" });
    }

    console.log(`✅ Found company interview page: ${companyInterviewUrl}`);

    // Function to get roles with retry
    const getRolesWithRetry = async (attempt = 1) => {
      console.log(`🔍 Attempt ${attempt}: Fetching roles from interview page`);
      await page.goto(companyInterviewUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);

      const result = await page.evaluate(() => {
        // Get roles
        const container = document.querySelector(".InterviewsForTopJobs_jobTitleList__ZG6G9");
        const roleData = container
          ? Array.from(container.querySelectorAll("a")).map((a) => ({
            title: a.textContent.trim(),
            href: a.href,
          }))
          : [];

        // Get logo URL
        const logoImg = document.querySelector('img[class*="employer-header_employerImage"]');
        const logoSrc = logoImg ? logoImg.src : null;

        return {
          roles: roleData,
          logoUrl: logoSrc,
        };
      });

      if ((!result.roles || result.roles.length === 0) && attempt < 2) {
        console.log(`⚠️ No roles found, retrying...`);
        await page.waitForTimeout(1000);
        return getRolesWithRetry(attempt + 1);
      }

      return result;
    };

    // STEP 2: Get job roles and logo with retry
    const { roles, logoUrl } = await getRolesWithRetry();

    await browser.close();

    if (!roles || roles.length === 0) {
      console.log(`❌ No roles found after 2 attempts`);
      return res.status(404).json({
        companyInterviewUrl,
        logoUrl,
        error: "No roles found for this company"
      });
    }

    console.log(`🎯 Scraped ${roles.length} roles & logo`);
    res.json({ companyInterviewUrl, roles, logoUrl });

  } catch (err) {
    console.error("❌ Error in /api/roles:", err.message);
    res.status(500).json({ error: "Could not fetch roles" });
  }
});

const activeScrapes = new Map();

// Server
app.get("/api/interview-questions", async (req, res) => {
  let { url, clientId } = req.query;

  if (!url || !clientId) {
    return res.status(400).json({ error: "Missing url or clientId" });
  }

  url = decodeURIComponent(url);
  console.log("🔗 Scraping URL:", url);

  // Cancel any existing session for this client
  const existing = activeScrapes.get(clientId);
  if (existing) {
    console.log(`🛑 Aborting previous scrape for client ${clientId}`);
    try {
      existing.res.end();
      await existing.browser.close();
    } catch (e) {
      console.warn("Error closing previous browser:", e.message);
    }
    activeScrapes.delete(clientId);
  }

  // SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const sendData = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  };

  const sendError = (error) => {
    res.write(`data: ${JSON.stringify({ type: 'error', error })}\n\n`);
  };

  const sendComplete = () => {
    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    res.end();
  };

  try {
    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0");

    activeScrapes.set(clientId, { res, browser });

    // First, get the last page number
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const lastPageNumber = await page.evaluate(() => {
      const liTags = document.querySelectorAll('ol.pagination_PaginationOrderedList__zgUNU > li');
      if (liTags.length >= 2) {
        const secondLastLi = liTags[liTags.length - 2];
        return parseInt(secondLastLi.textContent.trim());
      }
      return 1; // If no pagination found, assume only 1 page
    });

    console.log(`📖 Found ${lastPageNumber} pages to scrape`);

    // Send initial metadata
    sendData('metadata', { totalPages: lastPageNumber });

    // Scrape each page and send data progressively
    for (let currentPage = 1; currentPage <= lastPageNumber; currentPage++) {
      const pageUrl = url.replace(/_IP\d+\.htm/, `_IP${currentPage}.htm`);
      console.log(`📄 Scraping page ${currentPage} of ${lastPageNumber}: ${pageUrl}`);

      // Send progress update
      sendData('progress', {
        currentPage,
        totalPages: lastPageNumber,
        message: `Loading page ${currentPage} of ${lastPageNumber}...`
      });

      try {
        await page.goto(pageUrl, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2000);
        await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
        await page.waitForTimeout(2000);

        const pageData = await page.evaluate(() => {
          const getText = selector =>
            document.querySelector(selector)?.textContent?.trim() || "N/A";

          // Header stuff (only needed for first page)
          const title = getText("h1 span span");
          const updated = getText("div[data-test='interview-page-subHeading']");
          const difficulty = getText(".interview-overview_difficultyRating__oAEul");

          const experience = Array.from(
            document.querySelectorAll('[data-test="interviewExperience"] .common-barChartBar_barText__3F1eB')
          ).map(e => e.textContent.trim());

          const sources = Array.from(
            document.querySelectorAll('[data-test="interviewSource"] .common-barChartBar_barText__3F1eB')
          ).map(e => e.textContent.trim());

          // Scrape all interview blocks
          const allInterviews = Array.from(
            document.querySelectorAll(
              ".interview-details_interviewDetailsContainer__7_y0H, .review-details-container_reviewTopContainer__BZyU2"
            )
          ).map(block => {
            const interviewTitle = block.querySelector("h3.heading_Heading__BqX5J, h2.interview-details_interviewTitle__3k2I9")?.textContent.trim() || "N/A";
            const date = block.querySelector("span.timestamp_reviewDate__dsF9n")?.textContent.trim() || "N/A";

            const summaryItems = Array.from(block.querySelectorAll("span"))
              .map(span => span.textContent.trim())
              .filter(txt => /experience|offer|difficulty/i.test(txt));

            const detailsElement = block.querySelector(".interview-details_interviewText__YH2ZO");
            let details = "N/A";
            if (detailsElement) {
              const truncated = detailsElement.querySelector(".truncated-text_truncate__021Uu");
              details = truncated ? truncated.textContent.trim() : detailsElement.textContent.trim();
            }

            const questions = [];
            const questionBlocks = block.querySelectorAll(".interview-question");

            if (questionBlocks.length > 0) {
              questionBlocks.forEach(q => {
                const questionText =
                  q.querySelector(".interview-question-question")?.textContent.trim() ||
                  q.querySelector("span")?.textContent.trim() ||
                  "N/A";

                questions.push({
                  questionText,
                  answerPrompt: q.querySelector(".interview-question-answer")?.textContent.trim() || "Answer question"
                });
              });
            } else {
              const potentialQuestions = block.querySelectorAll(".truncated-text_truncate__021Uu, .interview-question");
              potentialQuestions.forEach(q => {
                const questionText = q.textContent.trim();
                if (
                  questionText &&
                  !questionText.includes("Interview for") &&
                  !summaryItems.some(item => item.includes(questionText))
                ) {
                  questions.push({
                    questionText,
                    answerPrompt: "Answer not available"
                  });
                }
              });
            }

            return {
              title: interviewTitle,
              date,
              summary: summaryItems,
              details,
              questions
            };
          });

          // Merge title/date with details/questions
          const interviews = [];
          for (let i = 0; i < allInterviews.length; i += 2) {
            if (i + 1 < allInterviews.length) {
              const titleDateItem = allInterviews[i];
              const detailsItem = allInterviews[i + 1];

              interviews.push({
                title: titleDateItem.title,
                date: titleDateItem.date,
                summary: detailsItem.summary,
                details: detailsItem.details,
                questions: detailsItem.questions
              });
            }
          }

          return {
            header: { title, updated, difficulty, experience, sources },
            interviews
          };
        });

        // Send page data immediately
        sendData('pageData', {
          page: currentPage,
          totalPages: lastPageNumber,
          header: currentPage === 1 ? pageData.header : null,
          interviews: pageData.interviews,
          interviewCount: pageData.interviews.length
        });

        console.log(`✅ Page ${currentPage} scraped successfully (${pageData.interviews.length} interviews)`);

      } catch (err) {
        console.error(`⚠️ Error scraping page ${currentPage}:`, err.message);
        sendError(`Error Loading page ${currentPage}: ${err.message}`);
        // Continue to next page even if one fails
      }
    }

    await browser.close();
    sendComplete();
    activeScrapes.delete(clientId);

  } catch (err) {
    console.error("❌ Scraping failed:", err.message);
    sendError(`Loading failed: ${err.message}`);
    try {
      const active = activeScrapes.get(clientId);
      if (active) await active.browser.close();
    } catch (e) { }
    res.end();
    activeScrapes.delete(clientId);
  }
});


app.post("/api/stop-scraping", async (req, res) => {
  const { clientId } = req.body;

  if (!clientId) return res.status(400).json({ error: "Missing clientId" });

  const session = activeScrapes.get(clientId);
  if (session) {
    try {
      session.res.end();
      await session.browser.close();
    } catch (e) {
      console.warn("Error closing browser on cancel:", e.message);
    }
    activeScrapes.delete(clientId);
  }

  res.json({ message: "Scraping session stopped" });
});
















app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});



app.get("/health", async (req, res) => {
  res.status(200).json({ status: "ok", model: "auto-fallback-enabled" });
});

httpServer.listen(port, () => {
  console.log(`🚀 Server + WebSocket server listening on ${port}`);
});

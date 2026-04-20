import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fbConfig from "./firebase-applet-config.json" with { type: "json" };
import sgMail from "@sendgrid/mail";

// Configure SendGrid
const sgApiKey = process.env.SENDGRID_API_KEY;
if (sgApiKey) {
  sgMail.setApiKey(sgApiKey);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Firebase Admin
  try {
    admin.initializeApp({
      projectId: fbConfig.projectId,
    });
    console.log("Firebase Admin initialized");
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error);
  }

  const db = getFirestore(fbConfig.firestoreDatabaseId);

  // Firestore Listener for Task Notifications (Email Trigger)
  console.log("Setting up Task Notifications listener...");
  db.collection("tasks").onSnapshot((snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const task = change.doc.data();
        
        console.log(`New task detected: ${change.doc.id}. Checking for notification...`);

        // Skip if assignedToEmail is missing
        if (!task.assignedToEmail) {
          console.log(`Task ${change.doc.id} has no assignedToEmail. Skipping notification.`);
          return;
        }

        // Skip if dummy or missing API key
        if (!sgApiKey) {
          console.warn("SENDGRID_API_KEY is not set. Email notification skipped.");
          return;
        }

        try {
          console.log(`Attempting to send email to ${task.assignedToEmail} for task: ${task.nextAction || task.summary}`);
          
          const msg = {
            to: task.assignedToEmail,
            from: process.env.SENDGRID_FROM_EMAIL || "no-reply@example.com",
            subject: "New Task Assigned: " + (task.nextAction || 'Action Required'),
            text: `
              Hello ${task.assignedToName || 'Team Member'},

              A new task has been assigned to you.

              Task: ${task.nextAction || task.summary || 'Follow-up Task'}
              Customer: ${task.customerName || 'Internal/General'}
              Due Date: ${task.nextActionDate ? (task.nextActionDate.toDate ? task.nextActionDate.toDate().toLocaleDateString() : new Date(task.nextActionDate).toLocaleDateString()) : 'N/A'}
              
              Assigned By: ${task.createdBy || 'System'}

              Please log in to SensorCRM to view details.
            `,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #6366f1; margin-top: 0;">New Task Assigned</h2>
                <p>Hello <strong>${task.assignedToName || 'Team Member'}</strong>,</p>
                <p>A new task has been assigned to you in SensorCRM by ${task.createdBy || 'the system'}.</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #edf2f7;">
                  <p style="margin: 0 0 10px 0;"><strong>Task:</strong> ${task.nextAction || task.summary || 'Follow-up Task'}</p>
                  <p style="margin: 0 0 10px 0;"><strong>Customer:</strong> ${task.customerName || 'Internal/General'}</p>
                  <p style="margin: 0 0 10px 0;"><strong>Due Date:</strong> ${task.nextActionDate ? (task.nextActionDate.toDate ? task.nextActionDate.toDate().toLocaleDateString() : new Date(task.nextActionDate).toLocaleDateString()) : 'N/A'}</p>
                  <p style="margin: 0;"><strong>Priority:</strong> ${task.priority || 'Medium'}</p>
                </div>
                <p>Log in to your dashboard to view details and take action.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #94a3b8;">This is an automated notification from SensorCRM. Please do not reply to this email.</p>
              </div>
            `,
          };

          const [response] = await sgMail.send(msg);
          console.log(`Email success! Status: ${response.statusCode}. Task notification sent to ${task.assignedToEmail}`);
        } catch (error: any) {
          console.error("SendGrid error details:");
          if (error.response) {
            console.error(error.response.body);
          } else {
            console.error(error.message);
          }
        }
      }
    });
  }, (error) => {
    console.error("Firestore Task listener encountered an error:", error);
  });

  app.use(express.json());

  // API Route: Promote Admin (for ghorpadeshaileshgs@gmail.com)
  app.get("/api/admin/promote-shailesh", async (req, res) => {
    const email = "ghorpadeshaileshgs@gmail.com";
    try {
      console.log(`Manual promotion requested for ${email}`);
      const userSnapshot = await db.collection("users").where("email", "==", email).get();
      if (userSnapshot.empty) {
        // Try getting from Auth
        try {
          const userRecord = await admin.auth().getUserByEmail(email);
          await db.collection("users").doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: email,
            displayName: userRecord.displayName || "Admin User",
            role: "Admin",
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          return res.json({ success: true, message: `Created Admin profile for ${email}` });
        } catch (e: any) {
          console.error(`Auth lookup failed for ${email}:`, e.message);
          return res.status(404).json({ error: `User ${email} not found in Auth. Please sign in to the app first so Firebase Auth registers you.` });
        }
      } else {
        const userDoc = userSnapshot.docs[0];
        await userDoc.ref.update({ role: "Admin", isActive: true });
        return res.json({ success: true, message: `Updated ${email} to Admin.` });
      }
    } catch (error: any) {
      console.error("Promotion Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Routes
  app.post("/api/admin/create-user", async (req, res) => {
    const { email, password, displayName, role, department, reportingManager } = req.body;
    
    // Check if requester is Admin (simplified for this environment)
    // In a real app, you'd verify the ID token from the Authorization header
    
    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
      });

      // After Auth creation, we sync to the Firestore 'users' collection
      const db = getFirestore(fbConfig.firestoreDatabaseId);
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        displayName,
        role: role || 'Sales',
        department: department || 'Sales',
        isActive: true,
        reportingManager: reportingManager || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ success: true, uid: userRecord.uid });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:3000`);
    
    // Auto-promote admin on startup
    const email = "ghorpadeshaileshgs@gmail.com";
    try {
      const userSnapshot = await db.collection("users").where("email", "==", email).get();
      if (userSnapshot.empty) {
        try {
          const userRecord = await admin.auth().getUserByEmail(email);
          await db.collection("users").doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: email,
            displayName: userRecord.displayName || "Admin User",
            role: "Admin",
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`Auto-promoted ${email} to Admin`);
        } catch (e) {}
      } else {
        const userDoc = userSnapshot.docs[0];
        await userDoc.ref.update({ role: "Admin", isActive: true });
        console.log(`Auto-updated ${email} to Admin`);
      }
    } catch (e) {}
  });
}

startServer();

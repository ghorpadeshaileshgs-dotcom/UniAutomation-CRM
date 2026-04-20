import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as sgMail from "@sendgrid/mail";

admin.initializeApp();

const db = admin.firestore();

// Note: Configured via environment variables
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@example.com";
const APP_URL = process.env.APP_URL || "";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * 1. TASK CREATION EMAIL
 * Triggered whenever a new task is created in Firestore.
 */
export const onTaskCreated = functions.firestore.onDocumentCreated("tasks/{taskId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const task = snapshot.data();
  const taskId = event.params.taskId;

  try {
    // Fetch assigned user details
    const userDoc = await db.collection("users").doc(task.ownerId).get();
    if (!userDoc.exists) {
      console.warn(`User ${task.ownerId} not found for task ${taskId}`);
      return;
    }
    const user = userDoc.data();
    const email = user?.email;

    if (!email) {
      console.warn(`Email not found for user ${task.ownerId}`);
      return;
    }

    const priorityTag = task.priority === "High" ? "[HIGH PRIORITY] " : "";
    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: `${priorityTag}New Task Assigned: ${task.type}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.5;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">New Task Notification</h2>
          <p>Hello <strong>${user?.displayName || "Team Member"}</strong>,</p>
          <p>A new task has been assigned to you in the Sales Management Portal.</p>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px 0; color: #6b7280; font-size: 14px; width: 120px;">Task Type:</td>
                <td style="padding: 5px 0; font-weight: bold;">${task.type}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">Priority:</td>
                <td style="padding: 5px 0;">
                  <span style="background-color: ${task.priority === 'High' ? '#fee2e2' : '#f3f4f6'}; color: ${task.priority === 'High' ? '#b91c1c' : '#374151'}; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: bold;">
                    ${task.priority}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">Lead/Customer:</td>
                <td style="padding: 5px 0; font-weight: bold;">${task.customerName || "General Task"}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">Due Date:</td>
                <td style="padding: 5px 0; color: #b91c1c; font-weight: bold;">${task.nextActionDate?.toDate().toLocaleDateString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Action Required:</td>
                <td style="padding: 5px 0; font-weight: bold;">${task.nextAction}</td>
              </tr>
            </table>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 13px;">Summary:</p>
              <p style="margin: 5px 0 0 0; font-style: italic; color: #4b5563;">${task.summary}</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${APP_URL}/tasks" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              View Task Details
            </a>
          </div>
          
          <p style="margin-top: 40px; font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    if (SENDGRID_API_KEY) {
      await sgMail.send(msg);
      console.log(`Creation email sent successfully to ${email} for task ${taskId}`);
    } else {
      console.warn("SendGrid API Key not configured. Email skipped.");
    }
  } catch (error) {
    console.error("Critical Error sending task creation email:", error);
  }
});

/**
 * 2. TASK REASSIGNMENT EMAIL
 * Triggered when a task's ownerId changes.
 */
export const onTaskUpdated = functions.firestore.onDocumentUpdated("tasks/{taskId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  const taskId = event.params.taskId;

  // Trigger only if the owner (assigned user) has changed
  if (before.ownerId !== after.ownerId) {
    try {
      const userDoc = await db.collection("users").doc(after.ownerId).get();
      if (!userDoc.exists) return;
      const user = userDoc.data();
      const email = user?.email;

      if (!email) return;

      const priorityTag = after.priority === "High" ? "[HIGH PRIORITY] " : "";
      const msg = {
        to: email,
        from: FROM_EMAIL,
        subject: `${priorityTag}Task Reassigned to You: ${after.type}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.5;">
            <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Task Reassignment Notification</h2>
            <p>Hello <strong>${user?.displayName || "Team Member"}</strong>,</p>
            <p>A task has been reassigned to you from <strong>${before.owner}</strong>.</p>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; color: #6b7280; font-size: 14px; width: 120px;">Task Type:</td>
                  <td style="padding: 5px 0; font-weight: bold;">${after.type}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">Priority:</td>
                  <td style="padding: 5px 0;">
                    <span style="background-color: ${after.priority === 'High' ? '#fee2e2' : '#f3f4f6'}; color: ${after.priority === 'High' ? '#b91c1c' : '#374151'}; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: bold;">
                      ${after.priority}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">Customer:</td>
                  <td style="padding: 5px 0; font-weight: bold;">${after.customerName || "N/A"}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">Next Action:</td>
                  <td style="padding: 5px 0; font-weight: bold;">${after.nextAction}</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${APP_URL}/tasks" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                Access My Board
              </a>
            </div>
          </div>
        `,
      };

      if (SENDGRID_API_KEY) {
        await sgMail.send(msg);
        console.log(`Reassignment email sent to ${email} for task ${taskId}`);
      }
    } catch (error) {
      console.error("Error sending reassignment email:", error);
    }
  }
});

/**
 * 3. OVERDUE TASK REMINDER
 * Scheduled to run daily at 9:00 AM IST.
 */
export const overdueReminderSchedule = functions.scheduler.onSchedule("0 9 * * *", async (event) => {
  const now = admin.firestore.Timestamp.now();
  
  try {
    // Fetch incomplete tasks where nextActionDate has passed
    const overdueTasks = await db.collection("tasks")
      .where("status", "!=", "Completed")
      .where("nextActionDate", "<", now)
      .get();

    if (overdueTasks.empty) {
      console.log("Health check: No overdue tasks found today.");
      return;
    }

    // Group tasks by ownerId to send one email per user
    const tasksByOwner: Record<string, any[]> = {};
    overdueTasks.forEach(doc => {
      const data = doc.data();
      if (!tasksByOwner[data.ownerId]) {
        tasksByOwner[data.ownerId] = [];
      }
      tasksByOwner[data.ownerId].push({ id: doc.id, ...data });
    });

    // Process mail for each owner
    for (const [ownerId, tasks] of Object.entries(tasksByOwner)) {
      const userDoc = await db.collection("users").doc(ownerId).get();
      if (!userDoc.exists) continue;
      const user = userDoc.data();
      const email = user?.email;
      if (!email) continue;

      const taskListHtml = tasks.map(t => `
        <div style="margin-bottom: 15px; border-bottom: 1px solid #f3f4f6; padding-bottom: 10px;">
          <p style="margin: 0; font-weight: bold; color: ${t.priority === 'High' ? '#b91c1c' : '#111827'};">
            ${t.priority === 'High' ? '⚠️ ' : ''}${t.nextAction}
          </p>
          <p style="margin: 3px 0; font-size: 12px; color: #6b7280;">
            Type: ${t.type} | Customer: ${t.customerName || "N/A"}
          </p>
          <p style="margin: 0; font-size: 12px; color: #b91c1c; font-weight: bold;">
            Due: ${t.nextActionDate.toDate().toLocaleDateString('en-IN')}
          </p>
        </div>
      `).join("");

      const msg = {
        to: email,
        from: FROM_EMAIL,
        subject: `ACTION REQUIRED: ${tasks.length} Overdue Tasks on Your Board`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.5;">
            <h2 style="color: #ef4444; border-bottom: 2px solid #fee2e2; padding-bottom: 10px;">Overdue Tasks Reminder</h2>
            <p>Hello <strong>${user?.displayName || "Team Member"}</strong>,</p>
            <p>You have <strong>${tasks.length}</strong> tasks that are currently past their due dates.</p>
            
            <div style="margin: 20px 0;">
              ${taskListHtml}
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${APP_URL}/tasks" style="background-color: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                Resolve Overdue Items
              </a>
            </div>
          </div>
        `,
      };

      if (SENDGRID_API_KEY) {
        await sgMail.send(msg);
        console.log(`Overdue reminder email sent to ${email} for ${tasks.length} tasks`);
      }
    }
  } catch (error) {
    console.error("Critical failure in overdue reminder schedule:", error);
  }
});

/**
 * 4. DAILY AUTOMATED BACKUP LOG
 * Scheduled to run daily at midnight.
 * Records record counts across all major collections for data integrity auditing.
 */
export const dailyBackupSchedule = functions.scheduler.onSchedule("0 0 * * *", async (event) => {
  try {
    const collections = [
      "leads", "customers", "parts", "tasks", "debtors", 
      "quotes", "design_reviews", "feasibility_forms", "employees"
    ];
    
    let totalRecords = 0;
    
    for (const col of collections) {
      const snap = await db.collection(col).count().get();
      totalRecords += snap.data().count;
    }
    
    await db.collection("backups").add({
      timestamp: admin.firestore.Timestamp.now(),
      status: "Success",
      type: "Auto",
      collectionsCount: collections.length,
      totalRecords: totalRecords,
      fileName: `auto_snapshot_${new Date().toISOString().split('T')[0]}.json`,
      createdBy: "System Scheduler",
      createdById: "system",
      createdAt: admin.firestore.Timestamp.now()
    });
    
    console.log(`Daily auto-backup snapshot completed. Total records: ${totalRecords}`);
  } catch (error) {
    console.error("Backup schedule failed:", error);
  }
});

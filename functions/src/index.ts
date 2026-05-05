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
 * SHARED HELPER: Resolve email + name for a given ID.
 * Looks up users collection first, then falls back to employees collection.
 */
async function resolveEmail(id: string): Promise<{ email: string; name: string } | null> {
  if (!id) return null;

  // Try users collection first
  let docSnap = await db.collection("users").doc(id).get();
  if (docSnap.exists && docSnap.data()?.email) {
    return {
      email: docSnap.data()!.email,
      name: docSnap.data()!.displayName || docSnap.data()!.name || "",
    };
  }

  // Fallback: try employees collection
  docSnap = await db.collection("employees").doc(id).get();
  if (docSnap.exists && docSnap.data()?.email) {
    return {
      email: docSnap.data()!.email,
      name: docSnap.data()!.name || docSnap.data()!.employeeName || "",
    };
  }

  return null;
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
    // Use assignedTo first, fall back to ownerId
    const assigneeId = task.assignedTo || task.ownerId;
    const assignee = await resolveEmail(assigneeId);

    if (!assignee) {
      console.warn(`Assignee not found for task ${taskId} (id: ${assigneeId})`);
      return;
    }

    const priorityTag = task.priority === "High" ? "[HIGH PRIORITY] " : "";
    const msg = {
      to: assignee.email,
      from: FROM_EMAIL,
      subject: `${priorityTag}New Task Assigned: ${task.type}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.5;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">New Task Notification</h2>
          <p>Hello <strong>${assignee.name || "Team Member"}</strong>,</p>
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
      console.log(`Creation email sent successfully to ${assignee.email} for task ${taskId}`);
    } else {
      console.warn("SendGrid API Key not configured. Email skipped.");
    }
  } catch (error) {
    console.error("Critical Error sending task creation email:", error);
  }
});

/**
 * 2. TASK REASSIGNMENT EMAIL
 * Triggered when a task's assignedTo or ownerId changes.
 */
export const onTaskUpdated = functions.firestore.onDocumentUpdated("tasks/{taskId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  const taskId = event.params.taskId;

  // Trigger only if the assignee has changed
  const beforeAssignee = before.assignedTo || before.ownerId;
  const afterAssignee = after.assignedTo || after.ownerId;

  if (beforeAssignee !== afterAssignee) {
    try {
      const assignee = await resolveEmail(afterAssignee);
      if (!assignee?.email) return;

      const priorityTag = after.priority === "High" ? "[HIGH PRIORITY] " : "";
      const msg = {
        to: assignee.email,
        from: FROM_EMAIL,
        subject: `${priorityTag}Task Reassigned to You: ${after.type}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.5;">
            <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Task Reassignment Notification</h2>
            <p>Hello <strong>${assignee.name || "Team Member"}</strong>,</p>
            <p>A task has been reassigned to you from <strong>${before.assignedToName || before.owner}</strong>.</p>
            
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
        console.log(`Reassignment email sent to ${assignee.email} for task ${taskId}`);
      }
    } catch (error) {
      console.error("Error sending reassignment email:", error);
    }
  }
});

/**
 * 3. OVERDUE TASK REMINDER
 * Scheduled to run daily at 9:00 AM IST (3:30 AM UTC).
 */
export const overdueReminderSchedule = functions.scheduler.onSchedule("30 3 * * *", async (event) => {
  const now = admin.firestore.Timestamp.now();
  
  try {
    // Fetch incomplete tasks where nextActionDate has passed
    const overdueTasksSnap = await db.collection("tasks")
      .where("status", "!=", "Completed")
      .where("nextActionDate", "<", now)
      .get();

    if (overdueTasksSnap.empty) {
      console.log("Health check: No overdue tasks found today.");
      return;
    }

    // Group tasks by assignee ID (assignedTo first, fallback to ownerId)
    const tasksByAssignee: Record<string, any[]> = {};
    overdueTasksSnap.forEach(docSnap => {
      const data = docSnap.data();
      const assigneeId = data.assignedTo || data.ownerId;
      if (!assigneeId) return;
      if (!tasksByAssignee[assigneeId]) tasksByAssignee[assigneeId] = [];
      tasksByAssignee[assigneeId].push({ id: docSnap.id, ...data });
    });

    // Process mail for each assignee
    for (const [assigneeId, tasks] of Object.entries(tasksByAssignee)) {
      const assignee = await resolveEmail(assigneeId);
      if (!assignee?.email) continue;

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
        to: assignee.email,
        from: FROM_EMAIL,
        subject: `ACTION REQUIRED: ${tasks.length} Overdue Tasks on Your Board`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.5;">
            <h2 style="color: #ef4444; border-bottom: 2px solid #fee2e2; padding-bottom: 10px;">Overdue Tasks Reminder</h2>
            <p>Hello <strong>${assignee.name || "Team Member"}</strong>,</p>
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
        console.log(`Overdue reminder email sent to ${assignee.email} for ${tasks.length} tasks`);
      }
    }
  } catch (error) {
    console.error("Critical failure in overdue reminder schedule:", error);
  }
});

/**
 * 4. UPCOMING TASK REMINDER (2 DAYS BEFORE DUE)
 * Scheduled daily at 7:00 AM IST (1:30 AM UTC).
 */
export const upcomingTaskReminderSchedule = functions.scheduler.onSchedule("30 1 * * *", async (event) => {
  const now = new Date();

  // Tomorrow 00:00 local
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Day after tomorrow 00:00 local
  const dayAfterTomorrow = new Date(now);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  dayAfterTomorrow.setHours(0, 0, 0, 0);

  const tomorrowTs = admin.firestore.Timestamp.fromDate(tomorrow);
  const dayAfterTs = admin.firestore.Timestamp.fromDate(dayAfterTomorrow);

  try {
    // Tasks due in exactly 2 days that are still open
    const upcomingSnap = await db.collection("tasks")
      .where("status", "!=", "Completed")
      .where("nextActionDate", ">=", tomorrowTs)
      .where("nextActionDate", "<", dayAfterTs)
      .get();

    if (upcomingSnap.empty) {
      console.log("Upcoming reminder: No tasks due in 2 days.");
      return;
    }

    // Group by assignee
    const tasksByAssignee: Record<string, any[]> = {};
    upcomingSnap.forEach(docSnap => {
      const data = docSnap.data();
      const assigneeId = data.assignedTo || data.ownerId;
      if (!assigneeId) return;
      if (!tasksByAssignee[assigneeId]) tasksByAssignee[assigneeId] = [];
      tasksByAssignee[assigneeId].push({ id: docSnap.id, ...data });
    });

    for (const [assigneeId, tasks] of Object.entries(tasksByAssignee)) {
      const assignee = await resolveEmail(assigneeId);
      if (!assignee?.email) continue;

      const taskListHtml = tasks.map(t => `
        <div style="margin-bottom: 15px; border-bottom: 1px solid #f3f4f6; padding-bottom: 10px;">
          <p style="margin: 0; font-weight: bold; color: #1e40af;">${t.type}: ${t.nextAction}</p>
          <p style="margin: 3px 0; font-size: 12px; color: #6b7280;">
            Customer: ${t.customerName || "N/A"}
          </p>
          <p style="margin: 3px 0; font-size: 12px; color: #d97706; font-weight: bold;">
            Due: ${t.nextActionDate.toDate().toLocaleDateString('en-IN')}
          </p>
        </div>
      `).join("");

      const msg = {
        to: assignee.email,
        from: FROM_EMAIL,
        subject: `REMINDER: Task Due in 2 Days – Action Required`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.5;">
            <h2 style="color: #d97706; border-bottom: 2px solid #fef3c7; padding-bottom: 10px;">Upcoming Task Reminder</h2>
            <p>Hello <strong>${assignee.name || "Team Member"}</strong>,</p>
            <p>You have <strong>${tasks.length}</strong> task(s) due in <strong>2 days</strong>. Please plan accordingly.</p>
            
            <div style="margin: 20px 0;">
              ${taskListHtml}
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${APP_URL}/tasks" style="background-color: #d97706; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                View My Tasks
              </a>
            </div>

            <p style="margin-top: 40px; font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px;">
              This is an automated reminder. Please do not reply to this email.
            </p>
          </div>
        `,
      };

      if (SENDGRID_API_KEY) {
        await sgMail.send(msg);
        console.log(`Upcoming reminder sent to ${assignee.email} for ${tasks.length} tasks due in 2 days`);
      }
    }
  } catch (error) {
    console.error("Critical failure in upcoming task reminder schedule:", error);
  }
});

/**
 * 5. DAILY AUTOMATED BACKUP LOG
 * Scheduled to run daily at midnight.
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

/**
 * 6. COMPLAINT SLA BREACH NOTIFICATIONS
 * Runs daily at 8:00 AM IST (2:30 AM UTC).
 * Checks Acknowledgement, Containment, RCA, and Closure SLAs.
 */
export const complaintSLABreach = functions.scheduler.onSchedule("30 2 * * *", async (event) => {
  const now = new Date();
  const nowMs = now.getTime();

  // SLA definitions (in milliseconds)
  const SLA: Record<string, Record<string, number>> = {
    acknowledgement: { Critical: 4 * 60 * 60 * 1000, Major: 24 * 60 * 60 * 1000, Minor: 48 * 60 * 60 * 1000 },
    containment:     { Critical: 1 * 86400000, Major: 2 * 86400000, Minor: 5 * 86400000 },
    rca:             { Critical: 3 * 86400000, Major: 7 * 86400000, Minor: 14 * 86400000 },
    closure:         { Critical: 10 * 86400000, Major: 21 * 86400000, Minor: 30 * 86400000 },
  };

  try {
    const snap = await db.collection("complaints").where("status", "!=", "Closed").get();
    if (snap.empty) {
      console.log("complaintSLABreach: No open complaints.");
      return;
    }

    const sendBreachEmail = async (toId: string, subject: string, bodyHtml: string) => {
      const recipient = await resolveEmail(toId);
      if (!recipient?.email) return;
      if (!SENDGRID_API_KEY) { console.warn("SendGrid not configured, email skipped."); return; }
      await sgMail.send({ to: recipient.email, from: FROM_EMAIL, subject, html: bodyHtml });
      console.log(`SLA breach email sent to ${recipient.email}: ${subject}`);
    };

    const emailBody = (title: string, rows: string) => `
      <div style="font-family:sans-serif;padding:20px;color:#333;line-height:1.5;">
        <h2 style="color:#dc2626;border-bottom:2px solid #fee2e2;padding-bottom:8px;">${title}</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
          <tr style="background:#f9fafb;">
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:left;">Field</th>
            <th style="padding:6px 10px;border:1px solid #e5e7eb;text-align:left;">Value</th>
          </tr>${rows}
        </table>
        <p style="margin-top:20px;font-size:11px;color:#9ca3af;">This is an automated SLA breach alert from SensorCRM Pro.</p>
      </div>`;

    const row = (label: string, val: string) =>
      `<tr><td style="padding:5px 10px;border:1px solid #e5e7eb;">${label}</td><td style="padding:5px 10px;border:1px solid #e5e7eb;font-weight:bold;">${val}</td></tr>`;

    for (const docSnap of snap.docs) {
      const c = docSnap.data();
      const sev: string = c.severity || "Minor";
      const complaintMs = c.complaintDate?.toDate?.()?.getTime?.() ?? nowMs;
      const age = nowMs - complaintMs;
      const cid = c.complaintId || docSnap.id;

      const subjectPrefix = `SLA BREACH [${sev}] Complaint ${cid}`;

      // (a) Acknowledgement SLA
      if (!c.acknowledgedDate && age > SLA.acknowledgement[sev]) {
        const assigneeId = c.assignedToId || c.createdById;
        if (assigneeId) {
          await sendBreachEmail(
            assigneeId,
            `${subjectPrefix} — Acknowledgement overdue`,
            emailBody(
              `⚠️ Acknowledgement SLA Breach — ${cid}`,
              row("Complaint ID", cid) +
              row("Customer", c.customerName || "N/A") +
              row("Severity", sev) +
              row("Stage", "Acknowledgement") +
              row("Age (hrs)", String(Math.round(age / 3600000)))
            )
          );
        }
      }

      // (b) Containment SLA
      if (c.containmentStatus !== "Done" && age > SLA.containment[sev]) {
        const ownerId = c.containmentOwnerId || c.assignedToId;
        if (ownerId) {
          await sendBreachEmail(
            ownerId,
            `${subjectPrefix} — Containment overdue`,
            emailBody(
              `⚠️ Containment SLA Breach — ${cid}`,
              row("Complaint ID", cid) +
              row("Customer", c.customerName || "N/A") +
              row("Severity", sev) +
              row("Stage", "Containment") +
              row("Age (days)", String(Math.round(age / 86400000)))
            )
          );
        }
      }

      // (c) RCA SLA
      if (!c.rcaCompletedDate && age > SLA.rca[sev]) {
        const assigneeId = c.assignedToId;
        if (assigneeId) {
          await sendBreachEmail(
            assigneeId,
            `${subjectPrefix} — RCA overdue`,
            emailBody(
              `⚠️ RCA SLA Breach — ${cid}`,
              row("Complaint ID", cid) +
              row("Customer", c.customerName || "N/A") +
              row("Severity", sev) +
              row("Stage", "Root Cause Analysis") +
              row("Age (days)", String(Math.round(age / 86400000)))
            )
          );
        }
      }

      // (d) Closure SLA — escalate to assignee AND their reporting manager
      if (age > SLA.closure[sev]) {
        const assigneeId = c.assignedToId;
        if (assigneeId) {
          const closureBody = emailBody(
            `🚨 Closure SLA Escalation — ${cid}`,
            row("Complaint ID", cid) +
            row("Customer", c.customerName || "N/A") +
            row("Severity", sev) +
            row("Stage", "Closure") +
            row("Age (days)", String(Math.round(age / 86400000))) +
            row("SLA Target (days)", String(SLA.closure[sev] / 86400000))
          );
          await sendBreachEmail(assigneeId, `${subjectPrefix} — Closure SLA escalation`, closureBody);

          // Look up reporting manager
          try {
            const userDoc = await db.collection("users").doc(assigneeId).get();
            const managerId = userDoc.data()?.reportingManager;
            if (managerId) {
              await sendBreachEmail(managerId, `[ESCALATION] ${subjectPrefix} — Closure SLA breach`, closureBody);
            }
          } catch (e) {
            console.warn("Could not fetch reporting manager for", assigneeId);
          }
        }
      }
    }

    console.log(`complaintSLABreach: Processed ${snap.size} open complaints.`);
  } catch (error) {
    console.error("complaintSLABreach failed:", error);
  }
});

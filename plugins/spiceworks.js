const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const email = process.env.SWAPI_EMAIL;
const password = process.env.SWAPI_PASS;
const sessionFilePath = path.join(__dirname, "session.json");
const baseUrl = "https://bortonsupport.on.spiceworks.com";

async function login() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/login`);

  await page.type("input[name=email]", email);
  await page.type("input[name=password]", password);
  await page.click("input[type=submit]");

  await page.waitForNavigation();

  const cookies = await page.cookies();

  if (cookies.length) {
    fs.writeFileSync(sessionFilePath, JSON.stringify(cookies));
    console.log("Logged in successfully");
    console.log("Cookies:", cookies);
  } else {
    throw new Error("Failed to log in");
  }

  await browser.close();
}

async function getSessionCookies() {
  if (!fs.existsSync(sessionFilePath)) {
    await login();
  }

  const sessionCookies = JSON.parse(fs.readFileSync(sessionFilePath, "utf8"));

  // Check if the session is still valid by making a request to a protected resource
  const ticketUrl = `${baseUrl}/api/main/tickets/21059`; // Replace with a valid resource URL
  try {
    await axios.get(ticketUrl, {
      headers: {
        Cookie: sessionCookies
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join("; "),
      },
    });
    console.log("Session is still valid");
  } catch (error) {
    console.log("Session is no longer valid, logging in again");
    await login();
    return getSessionCookies();
  }

  return sessionCookies;
}

async function getTicket(ticketId) {
    const sessionCookies = await getSessionCookies();
    const ticketUrl = `${baseUrl}/api/main/tickets/${ticketId}`;
  
    const response = await axios.get(ticketUrl, {
      headers: {
        Cookie: sessionCookies
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join("; "),
      },
    });
  
    const { ticket } = response.data;
  
    const assigneeName = ticket.assignee ? ticket.assignee.name : 'Unassigned';
    const creatorName = ticket.creator ? ticket.creator.name : 'Unknown';
    const watchersNames = ticket.watchers ? ticket.watchers.map(watcher => watcher.name).join(", ") : '';
    
    return {
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      createdAt: ticket.created_at,
      assigneeName,
      creatorName,
      dueAt: ticket.due_at,
      organizationId: ticket.organization_id,
      ticketCategoryId: ticket.ticket_category_id,
      priority: ticket.priority,
      status: ticket.status,
      summary: ticket.summary,
      updatedAt: ticket.updated_at,
      customValues: ticket.custom_values,
      alerted: ticket.alerted,
      muted: ticket.muted,
      description: ticket.description,
      timeSpentLabel: ticket.time_spent_label,
      firstResponseSecs: ticket.first_response_secs,
      closeTimeSecs: ticket.close_time_secs,
      files: ticket.files,
      deviceReferenceIds: ticket.device_reference_ids,
      ticketAlertIds: ticket.ticket_alert_ids,
      taskIds: ticket.task_ids,
      watchersNames,
    };
  }
  

  function init(botbuilder) {
    return {
      onTurn: async (context) => {
        if (context.activity.type === botbuilder.ActivityTypes.Message) {
          const text = context.activity.text || "";
          const ticketMatch = text.match(/^ticket #?(\d+)$/i); // add a #? to match an optional hashtag
    
          if (ticketMatch) {
            const ticketId = ticketMatch[1];
            await context.sendActivity(`Fetching ticket ${ticketId}...`);
  
            try {
              const ticket = await getTicket(ticketId);
              const subtitle = `Assignee: ${ticket.assigneeName}, Creator: ${ticket.creatorName}`;
              const text = `Watchers: ${ticket.watchersNames}`;
  
              const card = botbuilder.CardFactory.heroCard(
                `Ticket #${ticket.ticketNumber}: ${ticket.summary}`,
                ticket.description,
                null,
                null,
                {
                  subtitle,
                  text,
                }
              );
  
              const message = botbuilder.MessageFactory.attachment(card);
              await context.sendActivity(message);
            } catch (error) {
              console.error(`Error: ${error}`);
              await context.sendActivity(`Error: ${error.message}`);
            }
          }
        }
      },
    };
  }
  
  
  module.exports = {
    init: init,
  };

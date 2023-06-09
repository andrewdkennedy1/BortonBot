const { getUserSessions, executePowerShellCommand } = require("./lib/utils");

async function logoffSession(pc, sessionId) {
  try {
    await executePowerShellCommand(`logoff ${sessionId} /server:${pc}`);
    console.log(`Logged off session ${sessionId} on ${pc}`);
  } catch (error) {
    console.error(`PowerShell error: ${error.message}`);
    throw error;
  }
}

function createSessionListCard(pc, sessions, state) {
  const activeSessions = sessions.filter(
    (session) => session.sessionId !== "Disc"
  );
  const disconnectedSessions = sessions.filter(
    (session) => session.sessionId === "Disc"
  );

  const columns = [
    {
      type: "Column",
      width: "auto",
      items: [
        { type: "TextBlock", text: "Username", weight: "bolder" },
        ...activeSessions.map(({ username }) => ({
          type: "TextBlock",
          text: username,
        })),
        ...disconnectedSessions.map(({ username }) => ({
          type: "TextBlock",
          text: username,
        })),
      ],
    },
    {
      type: "Column",
      width: "auto",
      items: [
        {
          type: "TextBlock",
          text: "Session ID",
          weight: "bolder",
        },
        ...activeSessions.map(({ sessionId }) => ({
          type: "TextBlock",
          text: sessionId,
        })),
        ...disconnectedSessions.map(({ sessionName }) => ({
          type: "TextBlock",
          text: sessionName,
        })),
      ],
    },
    {
      type: "Column",
      width: "auto",
      items: [
        {
          type: "TextBlock",
          text: "State",
          weight: "bolder",
        },
        ...activeSessions.map(({ state }) => ({
          type: "TextBlock",
          text: state,
        })),
        ...disconnectedSessions.map(() => ({
          type: "TextBlock",
          text: "Disconnected",
        })),
      ],
    },
  ];

  return {
    type: "AdaptiveCard",
    body: [
      {
        type: "TextBlock",
        text: `${pc} has the following sessions:`,
        wrap: true,
      },
      {
        type: "ColumnSet",
        columns,
      },
      {
        type: "Input.Text",
        id: "sessionId",
        placeholder: "Enter session ID to kick",
      },
    ],
    actions: [
      {
        type: "Action.Submit",
        title: "Kick Session",
        data: {
          msteams: {
            type: "invoke",
            value: {
              type: "kick",
              sessionId: "${sessionId}",
              pc: pc,
              state: state,
            },
          },
        },
        associatedInputs: "auto",
      },
    ],
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.0",
    channelData: state,
  };
}

async function init(botbuilder) {
  const onTurn = async (context, res) => {
    if (context.activity.type === botbuilder.ActivityTypes.Message) {
      const text = context.activity.text || "";
      if (text.startsWith("kick ")) {
        const pc = text.substring(5).trim();
        await context.sendActivity(`Fetching user sessions for ${pc}...`);

        try {
          const sessions = await getUserSessions(pc);
          if (!sessions || !sessions.length) {
            await context.sendActivity(`No sessions found for ${pc}.`);
            return;
          }

          const state = { pc, sessions };
          const card = createSessionListCard(pc, sessions, state);
          const message = botbuilder.MessageFactory.attachment(
            botbuilder.CardFactory.adaptiveCard(card)
          );
          await context.sendActivity(message);

          context.turnState.set("state", state);
        } catch (error) {
          console.error(`Error: ${error}`);
          await context.sendActivity(`Error: ${error.message}`);
        }
      } else if (
        text.startsWith("kick") &&
        context.turnState.get("state") &&
        context.turnState.get("state").pc &&
        context.turnState.get("state").sessions
      ) {
        await context.sendActivity(
          `Please use the card input to enter a Session ID.`
        );
      }
    } else if (context.activity.type === botbuilder.ActivityTypes.Invoke) {
      console.log("Received invoke activity");
      const buttonType = context.activity.value && context.activity.value.type;
      console.log("Button type:", buttonType);

      if (buttonType === "kick" && context.activity.value) {
        console.log("User clicked the button!");
        const sessionId = context.activity.value.sessionId;
        console.log("Session ID:", sessionId);
        const pc = context.activity.value.pc;
        console.log("pc name:", pc);

        if (sessionId) {
          await context.sendActivity(
            `Kicking session ${sessionId} on ${pc}...`
          );
          try {
            await logoffSession(pc, sessionId);
            await context.sendActivity(
              `Session ${sessionId} on ${pc} has been logged off.`
            );
          } catch (error) {
            console.error(`Error: ${error}`);
            await context.sendActivity(`Error: ${error.message}`);
          }
        } else {
          await context.sendActivity(`Invalid session ID. Please try again.`);
        }

        context.turnState.set("state", {});
      }

      const response = { status: 200 };
      res.json(response);
    }
  };

  return { onTurn: onTurn, commandPrefix: "kick " };
}

module.exports = {
  init: init,
};

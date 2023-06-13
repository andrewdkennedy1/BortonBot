const { getUserSessions } = require("./lib/utils");

function createSessionListCard(pc, sessions, state, context) {
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
    {
      type: "Column",
      width: "auto",
      items: [
        {
          type: "TextBlock",
          text: "IP Address",
          weight: "bolder",
        },
        ...activeSessions.map(({ ipAddress }) => ({
          type: "TextBlock",
          text: ipAddress || "",
        })),
        ...disconnectedSessions.map(() => ({
          type: "TextBlock",
          text: "", // Placeholder for disconnected sessions
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
        id: "sessionIdInput",
        placeholder: "Enter Session ID",
        maxLength: 50,
      },
      {
        type: "ActionSet",
        actions: [
          {
            type: "Action.Submit",
            title: "Shadow Session",
            data: {
              msteams: {
                type: "invoke",
                value: {
                  type: "shadow",
                  pc: pc,
                  state: state,
                  sessionIdInput: "${sessionIdInput}",
                },
              },
            },
            associatedInputs: "auto",
          },
        ],
      },
    ],
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.0",
    channelData: state,
  };
}

async function init(botbuilder) {
  const onTurn = async (context) => {
    if (context.activity.type === botbuilder.ActivityTypes.Message) {
      const text = context.activity.text || "";
      if (text.startsWith("shadow ")) {
        const pc = text.substring(7).trim();
        await context.sendActivity(`Fetching user sessions for ${pc}...`);

        try {
          const sessions = await getUserSessions(pc);
          if (!sessions || !sessions.length) {
            await context.sendActivity(`No sessions found for ${pc}.`);
            return;
          }

          const state = { pc, sessions };
          const card = createSessionListCard(pc, sessions, state, context);
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
        text.startsWith("shadow") &&
        context.turnState.get("state") &&
        context.turnState.get("state").pc &&
        context.turnState.get("state").sessions
      ) {
        await context.sendActivity(
          "Please use the card input to enter a Session ID."
        );
      }
    } else if (context.activity.type === botbuilder.ActivityTypes.Invoke) {
      const buttonType = context.activity.value && context.activity.value.type;
      if (buttonType === "shadow" && context.activity.value) {
        const sessionId = context.activity.value.sessionIdInput;
        if (!sessionId) {
          await context.sendActivity(`Invalid session ID. Please try again.`);
          return;
        }
        const pc = context.activity.value.pc;
        const sessions = await getUserSessions(pc);
        console.log(`Sessions:`, sessions); // Log the sessions array
        const session = sessions.find(
          (s) => String(s.sessionId) === String(sessionId) // Comparing as strings
        );
        console.log(`Found session:`, session); // Log the found session
        if (!session) {
          await context.sendActivity(
            `Session ID ${sessionId} not found. Please try again.`
          );
          return;
        }
        const sessionUsername = session.username;
        const url = `https://chat.bortonsupport.com:8082/rdp/${pc}/${sessionId}`;
        const message = botbuilder.MessageFactory.text(
          `[Click here to shadow ${sessionUsername}'s session on ${pc}](${url}) or do this in a run command: \`\`\`mstsc.exe /v:${pc} /shadow:${sessionId} /admin /noConsentPrompt /control\`\`\``
        );

        await context.sendActivity(message);
        return;
      }

      context.turnState.set("state", {});

      const response = { status: 200 };
      await context.sendActivity({ type: "invokeResponse", value: response });
    }
  };

  return { onTurn: onTurn, commandPrefix: "shadow " };
}

module.exports = {
  init: init,
};

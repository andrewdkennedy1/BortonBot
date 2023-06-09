async function init(botbuilder) {
  const commands = require('./db/commands.json');

  const tableRows = commands
    .map((c) => `| ${c.name} | ${c.description} | ${c.examples ? c.examples.join(", ") : "-"} |`)
    .join("\n");

  const table = `
| Command | Description | Examples |
|---------|-------------|----------|
${tableRows}
  `;

  return {
    onTurn: async (context) => {
      if (
        context.activity.type === botbuilder.ActivityTypes.Message &&
        context.activity.text &&
        context.activity.text.toLowerCase().startsWith("help")
      ) {
        const message = botbuilder.MessageFactory.text(table);
        message.textFormat = "markdown";
        await context.sendActivity(message);
      }
    },
  };
}

module.exports = {
  init: init,
};

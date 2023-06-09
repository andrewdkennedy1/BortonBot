const { executePowerShellCommand } = require("./lib/utils.js");

async function getComputerInfo(description) {
  const command = `powershell.exe -NoProfile -Command "Get-ADComputer -Filter 'description -like ''*${description}*''' -Properties DNSHOSTNAME, WhenChanged, description | Select-Object DNSHOSTNAME, WhenChanged, description | ConvertTo-Json"`;
  console.log(`Executing PowerShell command: ${command}`);

  try {
    const result = await executePowerShellCommand(command);
    let results = JSON.parse(result);
    console.log("Results:", results);

    // Check if results is an object (not an array or null)
    if (results && typeof results === "object" && !Array.isArray(results)) {
      results = [results];
    }

    return results || [];
  } catch (error) {
    console.error(`Error: ${error}`);
    throw error;
  }
}

function createComputerInfoTable(results) {
  const data = Array.isArray(results) ? results : results ? [results] : [];
  const rows = [
    ["PC-Name", "Description", "Last Logon"],
    ...data.map(({ DNSHOSTNAME, description, WhenChanged }) => [
      DNSHOSTNAME.split(".")[0],
      description || "-",
      new Date(parseInt(WhenChanged.substring(6))).toLocaleString(),
    ]),
  ];

  const columnWidths = [20, 40, 20];
  const divider =
    "|" +
    columnWidths.map((w) => ":" + "-".repeat(w - 2) + ":").join("|") +
    "|";

  const lines = rows.map(
    (row, i) =>
      "|" +
      row
        .map((cell, j) =>
          i > 0 && j == 0
            ? `[${cell}](https://chat.bortonsupport.com:8082/anydesk/pc=${cell})`
            : j == 1
            ? cell.padStart(columnWidths[j])
            : cell
        )
        .join("|") +
      "|"
  );

  return [lines[0], divider, ...lines.slice(1)].join("\n");
}

async function init(botbuilder) {
  const onTurn = async (context) => {
    if (context.activity.type === botbuilder.ActivityTypes.Message) {
      const text = (context.activity.text || "").trim();
      const match = text.match(/^who\s+(.+)/i);
      if (match) {
        const description = match[1];
        await context.sendActivity(
          `Fetching computer information for "${description}"...`
        );

        try {
          const results = await getComputerInfo(description);
          if (!results || !results.length) {
            await context.sendActivity(
              `No computers found matching "${description}".`
            );
            return;
          }

          const table = createComputerInfoTable(results);
          const message = botbuilder.MessageFactory.text(table);
          message.textFormat = "markdown";
          await context.sendActivity(message);
        } catch (error) {
          console.error(`Error: ${error}`);
          await context.sendActivity(`Error: ${error.message}`);
        }
      }
    }
  };

  return {
    onTurn: onTurn,
  };
}

module.exports = {
  init: init,
};

const { executePowerShellCommand } = require("./lib/utils.js");

async function getPrinterIp(server, printername) {
  const command = `$printers = Get-Printer -ComputerName '${server}' | Where-Object { $_.Name -like '*${printername}*'}; if($printers) { $printers | Select-Object Name, PortName | ConvertTo-Json -Depth 1 } else {Write-Output 'Printer ''${printername}'' not found on server ''${server}''.'}`;
  console.log(`Executing PowerShell command: ${command}`);
  try {
    const stdout = await executePowerShellCommand(command);
    console.log(`PowerShell stdout:\n${stdout}`);
    return JSON.parse(stdout.trim());
  } catch (error) {
    console.error(`PowerShell error: ${error.message}`);
    throw error;
  }
}

async function init(botbuilder) {
  async function onTurn(context) {
    if (context.activity.type === botbuilder.ActivityTypes.Message) {
      const text = (context.activity.text || "").trim();
      const match = text.match(/^pp\s+(\S+)/i);
      if (match) {
        const printername = match[1];
        let server = "bpc-vm-printers";
        if (text.match(/^pp\s+\S+\s+(\S+)/i)) {
          server = match[2];
        }
        await context.sendActivity(
          `Fetching printer IP for "${printername}" on server "${server}"...`
        );

        try {
          const result = await getPrinterIp(server, printername);
          if (Array.isArray(result) && result.length > 0) {
            let table = "| Printer name | Port IP |\n| ------------ | --------- |\n";
            result.forEach((printer) => {
              table += `| ${printer.Name} | ${printer.PortName} |\n`;
            });
            const message = botbuilder.MessageFactory.text(table);
            message.textFormat = "markdown";
            await context.sendActivity(message);
          } else if (result && result.Name && result.PortName) {
            const message = botbuilder.MessageFactory.text(`Printer name: ${result.Name}\nPort IP: ${result.PortName}`);
            await context.sendActivity(message);
          } else {
            await context.sendActivity(
              `No printers found matching "${printername}" on server "${server}".`
            );
          }
        } catch (error) {
          console.error(`Error: ${error.message}`);
          await context.sendActivity(`Error: ${error.message}`);
        }
      }
    }
  }

  return {
    onTurn: onTurn,
  };
}

module.exports = {
  init: init,
};

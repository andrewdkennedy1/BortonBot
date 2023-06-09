const { executePowerShellCommand } = require("./lib/utils");

async function getSpoolerStatus(pcName) {
  const command = `Get-Service -ComputerName ${pcName} -Name spooler | Select-Object Name, Status | ConvertTo-Json`;
  console.log(`Executing PowerShell command: ${command}`);

  try {
    const stdout = await executePowerShellCommand(command);
    const status = JSON.parse(stdout.trim());
    const statusMap = {
      1: "Stopped",
      2: "StartPending",
      3: "StopPending",
      4: "Running",
      5: "ContinuePending",
      6: "PausePending",
      7: "Paused",
    };

    status.Status = statusMap[status.Status] || "Unknown";
    return JSON.stringify(status);
  } catch (error) {
    console.error(`PowerShell error: ${error.message}`);
    throw error;
  }
}

async function spoolerCommand(pcName, command) {
  const commandMap = {
    start: "Start-Service",
    stop: "Stop-Service",
    restart: "Restart-Service",
  };

  const cmd = commandMap[command];
  if (!cmd) {
    throw new Error(`Invalid command "${command}".`);
  }

  const commandStr = `Invoke-Command -ComputerName ${pcName} -ScriptBlock { ${cmd} -Name spooler }`;
  const stdout = await executePowerShellCommand(commandStr);

  return stdout.trim();
}

async function init(botbuilder) {
  const onTurn = async (context) => {
    if (context.activity.type === botbuilder.ActivityTypes.Message) {
      const text = (context.activity.text || "").trim();
      if (text.startsWith("spooler")) {
        const parts = text.split(" ");
        const pcName = parts[1];
        const action = parts[2];

        if (action && ["start", "stop", "restart"].includes(action)) {
          await context.sendActivity(
            `Sending spooler ${action} command to "${pcName}"...`
          );
          try {
            await spoolerCommand(pcName, action);
            await context.sendActivity(
              `Spooler ${action} command executed successfully on ${pcName}.`
            );
          } catch (error) {
            console.error(`Error: ${error}`);
            await context.sendActivity(`Error: ${error.message}`);
          }
        } else {
          await context.sendActivity(
            `Fetching spooler status for "${pcName}"...`
          );

          try {
            const result = await getSpoolerStatus(pcName);
            const status = JSON.parse(result);

            if (!status) {
              await context.sendActivity(
                `Could not retrieve spooler status for "${pcName}".`
              );
              return;
            }

            const message = botbuilder.MessageFactory.attachment(
              botbuilder.CardFactory.heroCard(
                `${pcName} Spooler Status`,
                `Status: ${status.Status}`,
                null,
                botbuilder.CardFactory.actions([
                  {
                    type: botbuilder.ActionTypes.ImBack,
                    title: "Start",
                    value: `spooler ${pcName} start`,
                  },
                  {
                    type: botbuilder.ActionTypes.ImBack,
                    title: "Stop",
                    value: `spooler ${pcName} stop`,
                  },
                  {
                    type: botbuilder.ActionTypes.ImBack,
                    title: "Restart",
                    value: `spooler ${pcName} restart`,
                  },
                ])
              )
            );

            await context.sendActivity(message);
          } catch (error) {
            console.error(`Error: ${error}`);
            await context.sendActivity(`Error: ${error.message}`);
          }
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

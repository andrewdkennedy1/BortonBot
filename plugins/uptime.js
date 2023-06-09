const { executePowerShellCommand } = require("./lib/utils");

async function getUptime(pcName) {
    const command = `Get-CimInstance -ComputerName ${pcName} Win32_OperatingSystem | Select-Object -ExpandProperty LastBootUpTime`;
    console.log(`Executing PowerShell command: ${command}`);
  
    try {
      const stdout = await executePowerShellCommand(command);
      console.log(`PowerShell command output: ${stdout}`);
      const output = stdout.trim();
      const match = /^(\w+,\s+\w+\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}:\d{2}\s+\w+)/.exec(output);
      if (!match) {
        throw new Error(`Could not parse output: ${output}`);
      }
  
      const lastBootUpTime = new Date(match[1]);
      const now = new Date();
      const uptimeMs = now.getTime() - lastBootUpTime.getTime();
      const uptimeSeconds = Math.floor(uptimeMs / 1000);
      const uptimeMinutes = Math.floor(uptimeSeconds / 60);
      const uptimeHours = Math.floor(uptimeMinutes / 60);
      const uptimeDays = Math.floor(uptimeHours / 24);
  
      return `${pcName} has been powered on for ${uptimeDays} days, ${uptimeHours % 24} hours, ${uptimeMinutes % 60} minutes.`;
    } catch (error) {
      console.error(`PowerShell error: ${error.message}`);
      throw error;
    }
  }
  

async function init(botbuilder) {
  const onTurn = async (context) => {
    if (context.activity.type === botbuilder.ActivityTypes.Message) {
      const text = (context.activity.text || "").trim();
      if (text.startsWith("uptime")) {
        const parts = text.split(" ");
        const pcName = parts[1];

        await context.sendActivity(`Fetching uptime for "${pcName}"...`);
        try {
          const result = await getUptime(pcName);
          await context.sendActivity(result);
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

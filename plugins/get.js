const { executePowerShellCommand } = require("./lib/utils");
const { exec } = require("child_process");

async function getMacAddress(target) {
  return new Promise((resolve, reject) => {
    exec(`ping -n 1 ${target}`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      const ipMatch = /\[(.*?)\]/.exec(stdout);
      if (!ipMatch || !ipMatch[1]) {
        reject(new Error(`Failed to resolve IP address for "${target}".`));
        return;
      }

      const ipAddress = ipMatch[1];
      exec(`arp -a ${ipAddress}`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        const macAddress = /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/.exec(stdout);
        if (macAddress) {
          resolve(macAddress[0]);
        } else {
          reject(new Error(`MAC address not found for "${target}".`));
        }
      });
    });
  });
}

async function getScreenInfo(pcName) {
  const command = `
    $ComputerName = '${pcName}'
    $Session = New-PSSession -ComputerName $ComputerName
    Invoke-Command -Session $Session -ScriptBlock {
      Get-WmiObject -Namespace root\\wmi -Class WmiMonitorID | ForEach-Object {
        $Name = [System.Text.Encoding]::ASCII.GetString($_.UserFriendlyName -ne 0x00)
        $Name
      }
    }
    Remove-PSSession -Session $Session
  `;

  console.log(`Executing PowerShell command: ${command}`);

  try {
    const stdout = await executePowerShellCommand(command);
    const records = stdout.trim().split("\n");
    let tableMarkdown = "| Monitor Name |\n|--------------|\n";

    for (const record of records) {
      tableMarkdown += `| ${record.trim()} |\n`;
    }

    return tableMarkdown;
  } catch (error) {
    console.error(`PowerShell error: ${error.message}`);
    throw error;
  }
}

async function init(botbuilder) {
  const onTurn = async (context) => {
    if (context.activity.type === botbuilder.ActivityTypes.Message) {
      const text = (context.activity.text || "").trim();
      if (text.startsWith("get")) {
        const parts = text.split(" ");
        const pcName = parts[1];
        const action = parts[2];

        if (action && action === "screeninfo") {
          await context.sendActivity(`Fetching screen information for "${pcName}"...`);
          try {
            const result = await getScreenInfo(pcName);
            await context.sendActivity({ type: 'message', textFormat: 'markdown', text: result });
          } catch (error) {
            console.error(`Error: ${error}`);
            await context.sendActivity(`Error: ${error.message}`);
          }
        } else if (action && action === "mac") {
          await context.sendActivity(`Fetching MAC address for "${pcName}"...`);
          try {
            const macAddress = await getMacAddress(pcName);
            await context.sendActivity(`MAC address for "${pcName}": ${macAddress}`);
          } catch (error) {
            console.error(`Error: ${error}`);
            await context.sendActivity(`Error: ${error.message}`);
          }
        } else {
          await context.sendActivity(`Invalid command "${text}".`);
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

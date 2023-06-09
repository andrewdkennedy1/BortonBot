const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);
const fs = require("fs-extra");

async function runAnydeskCommand(pcname, subCommand) {
  const anydeskCommand = `powershell.exe -WindowStyle Hidden -Command "Invoke-Command -ComputerName ${pcname} -ScriptBlock { & 'C:\\AnyDesk\\info.bat' ${subCommand}}"`;
  console.log(`Running Anydesk command: "${subCommand}" on ${pcname}...`);
  const { stdout, stderr } = await execAsync(anydeskCommand);
  if (stderr) {
    throw new Error(`Error running Anydesk command: ${stderr}`);
  }
  return stdout.trim();
}

async function copyAndRunAnydeskFiles(pcname, sessionId) {
  const payloadPath = path.join(__dirname, "payloads", "anydesk");
  const anydeskExePath = path.join(payloadPath, "AnyDesk.exe");
  const bsianydeskExePath = path.join(payloadPath, "bsi-AnyDesk.exe");
  const anydeskBatchPath = path.join(payloadPath, "setupanydesk.bat");
  const anydeskInfoPath = path.join(payloadPath, "info.bat");

  console.log(`Copying Anydesk files to ${pcname}...`);
  try {
    console.log(`Copying Anydesk executable...`);
    await fs.copy(anydeskExePath, `\\\\${pcname}\\c$\\dell\\${path.basename(anydeskExePath)}`);
    await fs.copy(bsianydeskExePath, `\\\\${pcname}\\c$\\dell\\${path.basename(bsianydeskExePath)}`);
    console.log(`Anydesk executable copied successfully.`);
    console.log(`Copying Anydesk batch file...`);
    await fs.copy(anydeskBatchPath, `\\\\${pcname}\\c$\\dell\\${path.basename(anydeskBatchPath)}`);
    await fs.copy(anydeskInfoPath, `\\\\${pcname}\\c$\\dell\\${path.basename(anydeskInfoPath)}`);
    console.log(`Anydesk batch file copied successfully.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const anydeskCommand = `powershell.exe -Command "Start-Process psexec.exe -ArgumentList '\\\\${pcname} -s cmd.exe /c C:\\dell\\${path.basename(anydeskBatchPath)}' -Verb runas"`;
    console.log(`Running Anydesk setup...`);
    await execAsync(anydeskCommand);
    console.log(`Anydesk setup completed successfully.`);
    console.log(`Successfully set up Anydesk on ${pcname}.`);
  } catch (error) {
    throw new Error(`Error setting up Anydesk on computer "${pcname}": ${error}`);
  }
}


async function init(botbuilder) {
  const onTurn = async (context) => {
    if (context.activity.type === botbuilder.ActivityTypes.Message) {
      const text = (context.activity.text || "").trim();
      if (text.startsWith(`anydesk`)) {
        const args = text.substring(`anydesk`.length).trim().split(/\s+/);
        const pcname = args[0];
        const subCommand = args[1];
        if (!pcname) {
          await context.sendActivity("Please provide a valid PC name.");
          return;
        }
        console.log(`Received request to perform Anydesk command "${subCommand}" on computer "${pcname}".`);
        await context.sendActivity(`Performing Anydesk command "${subCommand}" on computer "${pcname}"...`);
        try {
          let result;
          switch (subCommand) {
            case 'install':
              await copyAndRunAnydeskFiles(pcname);
              result = `Anydesk installed successfully on ${pcname}.`;
              break;
            case 'get-id':
              result = await runAnydeskCommand(pcname, 'get-id');
              break;
            case 'get-alias':
              result = await runAnydeskCommand(pcname, 'get-alias');
              break;
            case 'get-status':
              result = await runAnydeskCommand(pcname, 'get-status');
              break;
            case 'version':
              result = await runAnydeskCommand(pcname, 'version');
              break;
            default:
              throw new Error(`Invalid subcommand "${subCommand}".`);
          }
          console.log(`Successfully performed Anydesk command: ${result}`);
          await context.sendActivity(`Result of Anydesk command "${subCommand}" on computer "${pcname}": ${result}`);
        } catch (error) {
          console.error(`Error performing Anydesk command on computer "${pcname}": ${error}`);
          await context.sendActivity(`Error performing Anydesk command on computer "${pcname}": ${error.message}`);
        }
      }
    }
  };

  return { onTurn };
}


module.exports = {
  init: init,
};

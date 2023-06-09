const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const { getUserSessions } = require("./lib/utils");
const execAsync = promisify(exec);
const fs = require("fs-extra");

async function copyAndRunAnydeskFiles(pcname, sessionId) {
  const payloadPath = path.join(__dirname, "payloads", "anydesk");
  const anydeskExePath = path.join(payloadPath, "AnyDesk.exe");
  const bsianydeskExePath = path.join(payloadPath, "bsi-AnyDesk.exe");
  const anydeskBatchPath = path.join(payloadPath, "setupanydesk.bat");
  const anydeskInfoPath = path.join(payloadPath, "info.bat");


  console.log(`Copying Anydesk files to ${pcname}...`);
  try {
    console.log(`Copying Anydesk executable...`);
    await fs.copy( anydeskExePath, `\\\\${pcname}\\c$\\dell\\${path.basename(anydeskExePath)}` );
    await fs.copy( bsianydeskExePath, `\\\\${pcname}\\c$\\dell\\${path.basename(bsianydeskExePath)}` );
    console.log(`Anydesk executable copied successfully.`);
    console.log(`Copying Anydesk batch file...`);
    await fs.copy( anydeskBatchPath, `\\\\${pcname}\\c$\\dell\\${path.basename(anydeskBatchPath)}` );
    await fs.copy( anydeskInfoPath, `\\\\${pcname}\\c$\\dell\\${path.basename(anydeskInfoPath)}` );
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

async function copyAndRunRegistryFile(pcname, sessionId) {
  const payloadPath = path.join(__dirname, "payloads");
  const registryFilePath = path.join(payloadPath, "ShadowURLHandler.reg");
  const scriptFilePath = path.join(payloadPath, "import-registry.ps1");
  console.log(`Copying files to ${pcname}...`);
  try {
    console.log(`Copying script file...`);
    await fs.copy(
      scriptFilePath,
      `\\\\${pcname}\\c$\\dell\\${path.basename(scriptFilePath)}`
    );
    console.log(`Script file copied successfully.`);
    console.log(`Copying registry file...`);
    await fs.copy(
      registryFilePath,
      `\\\\${pcname}\\c$\\dell\\${path.basename(registryFilePath)}`
    );
    console.log(`Registry file copied successfully.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const regCommand = `powershell.exe -Command "Start-Process psexec.exe -ArgumentList '\\\\${pcname} -s -i 1 powershell.exe -ExecutionPolicy Bypass -File C:\\dell\\import-registry.ps1' -Verb runas"`;
    console.log(`Importing registry file...`);
    await execAsync(regCommand);
    console.log(`Registry file imported successfully.`);
    console.log(`Successfully imported registry file on ${pcname}.`);
  } catch (error) {
    throw new Error(`Error setting up computer "${pcname}": ${error}`);
  }
}


async function init(botbuilder) {
  const onTurn = async (context) => {
    if (context.activity.type === botbuilder.ActivityTypes.Message) {
      const text = (context.activity.text || "").trim();
      if (text.startsWith(`setup`)) {
        const args = text.substring(`setup`.length).trim().split(/\s+/);
        const pcname = args[0];
        const subCommand = args[1];
        if (!pcname) {
          await context.sendActivity("Please provide a valid PC name.");
          return;
        }
        console.log(`Received request to set up computer "${pcname}".`);
        await context.sendActivity(`Setting up computer "${pcname}"...`);
        try {
          console.log(`Retrieving user sessions for computer "${pcname}"...`);
          const sessions = await getUserSessions(pcname);
          const activeSessions = sessions.filter(
            (session) => session.state === "Active"
          );
          if (activeSessions.length === 0) {
            console.log(`No active sessions found for computer "${pcname}".`);
            await context.sendActivity(
              `No active sessions found for ${pcname}.`
            );
            return;
          }
          console.log(
            `Found ${activeSessions.length} active session(s) for computer "${pcname}".`
          );
          for (const session of activeSessions) {
            console.log(
              `Found active session for user ${session.username} with session ID ${session.sessionId}.`
            );
            if (subCommand === 'anydesk') {
              await copyAndRunAnydeskFiles(pcname, session.sessionId);
            } else {
              await copyAndRunRegistryFile(pcname, session.sessionId);
            }
          }
          console.log(`Setup process completed for computer "${pcname}".`);
          await context.sendActivity(
            `Computer "${pcname}" setup process completed.`
          );
        } catch (error) {
          console.error(`Error setting up computer "${pcname}": ${error}`);
          await context.sendActivity(
            `Error setting up computer "${pcname}": ${error.message}`
          );
        }
      }
    }
  };

  return { onTurn };
}


module.exports = {
  init: init,
};

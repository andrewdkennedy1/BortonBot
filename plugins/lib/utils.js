const { spawn } = require("child_process");

async function executePowerShellCommand(command) {
  return new Promise((resolve, reject) => {
    const powershell = spawn("powershell.exe", [
      "-NoProfile",
      "-Command",
      command,
    ]);

    let stdout = "";
    let stderr = "";

    powershell.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    powershell.stderr.on("data", (data) => {
      console.log(`PowerShell stderr: ${data.toString()}`);
      stderr += data.toString();
    });

    powershell.on("close", (code) => {
      console.log(`PowerShell process exited with code ${code}`);
      if (code !== 0 && !(code === 1 && command.startsWith("query user"))) {
        reject(
          new Error(
            `PowerShell command failed with exit code ${code}. Error message: ${stderr}`
          )
        );
      } else {
        resolve(stdout.trim());
      }
    });

    powershell.stdin.end();
  });
}

async function executePowerShellScript(scriptPath, params) {
  const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" ${params.join(" ")}`;
  console.log(`Executing PowerShell script: ${command}`);
  return await executePowerShellCommand(command);
}


async function getUserSessions(pc) {
  const queryCommand = `query user /server:${pc}`;
  console.log(`Executing PowerShell command: ${queryCommand}`);

  try {
    const queryOutput = await executePowerShellCommand(queryCommand);
    console.log(`Query output:\n${queryOutput}`);

    if (!queryOutput || queryOutput.trim() === "") {
      console.log(`No sessions found for ${pc}.`);
      return [];
    }

    const querySessions = queryOutput
      .split("\n")
      .slice(1)
      .map((line) => line.trim().split(/\s+/))
      .map(([username, sessionName, sessionId, state]) => ({
        username,
        sessionName,
        sessionId,
        state,
      }));

    console.log(`Parsed query sessions: ${JSON.stringify(querySessions, null, 2)}`);

    // Removed IP address retrieval code block

    return querySessions;
  } catch (error) {
    console.error(`PowerShell error: ${error.message}`);
    throw error;
  }
}

module.exports = {
  executePowerShellCommand,
  executePowerShellScript,
  getUserSessions,
};
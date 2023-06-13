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

    const ipCommand = `Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-TerminalServices-RemoteConnectionManager/Operational'; ID=1149; StartTime=(Get-Date).AddDays(-7);}` +
    ` | ForEach-Object {
          $userName = $_.Properties[0].Value
          $ipAddressValue = $_.Properties[2].Value
  
          if (-not [string]::IsNullOrEmpty($userName) -and -not [string]::IsNullOrEmpty($ipAddressValue)) {
              [PSCustomObject]@{
                  Name = $userName
                  IPAddress = $ipAddressValue
                  TimeCreated = $_.TimeCreated
              }
          }
      } | Sort-Object -Property IPAddress, SessionID -Unique | ConvertTo-Json -Compress`;
  
    console.log(`Executing PowerShell command on ${pc}: ${ipCommand}`);

    const ipOutput = await executePowerShellCommand(`Invoke-Command -ComputerName ${pc} -ScriptBlock { ${ipCommand} }`);
    console.log(`IP output:\n${ipOutput}`);

    const ipSessions = JSON.parse(ipOutput);

    console.log(`Parsed IP sessions: ${JSON.stringify(ipSessions, null, 2)}`);

    const sessions = querySessions.map((querySession) => {
      const matchingIPSession = ipSessions.find((ipSession) => {
        return querySession.username.toLowerCase() === ipSession.Name.toLowerCase();
      });
  
      if (matchingIPSession) {
        return {
          username: matchingIPSession.Name,
          sessionName: querySession.sessionName,
          sessionId: querySession.sessionId,
          state: querySession.state,
          ipAddress: matchingIPSession.IPAddress,
          timeCreated: matchingIPSession.TimeCreated,
        };
      }
  
      return querySession;
    });
    



    console.log(`Final sessions: ${JSON.stringify(sessions, null, 2)}`);
    return sessions;
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

const { executePowerShellCommand } = require("./lib/utils");

async function performNslookup(hostname, dnsServer) {
  let command = `nslookup ${hostname}`;

  if (dnsServer) {
    command += ` ${dnsServer}`;
  }

  console.log(`Executing nslookup command: ${command}`);

  try {
    const stdout = await executePowerShellCommand(command);

    // Check if the output contains the error message
    const errorRegex = /can't find .*?: (.*?)$/;
    const match = stdout.match(errorRegex);

    if (match) {
      return `Not found on ${dnsServer}: ${match[1]}`;
    }

    return stdout.trim();
  } catch (error) {
    console.error(`Error executing nslookup command: ${error.message}`);
    throw error;
  }
}

async function init(botbuilder) {
  const onTurn = async (context) => {
    if (context.activity.type === botbuilder.ActivityTypes.Message) {
      const text = (context.activity.text || "").trim();
      if (text.startsWith("nslookup")) {
        const parts = text.split(" ");
        const hostname = parts[1];
        const dnsServer = parts[2];

        await context.sendActivity(`Performing nslookup for "${hostname}"...`);

        try {
          const result = await performNslookup(hostname, dnsServer);

          const codeBlock = "```\n" + result + "\n```";

          await context.sendActivity(codeBlock);
        } catch (error) {
          console.error(`Error performing nslookup: ${error}`);
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

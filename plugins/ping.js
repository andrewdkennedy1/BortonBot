const ping = require('ping');

async function pingPC(pcName, numPings) {
  if (numPings < 1 || numPings > 10) {
    throw new Error("Number of pings must be between 1 and 10.");
  }

  console.log(`Pinging "${pcName}" ${numPings} times...`);

  try {
    const response = await ping.promise.probe(pcName, { min_reply: numPings });

    let output = `Pinging "${pcName}" ${numPings} times...\n\n`;
    output += "|       PC Name      |    Status   |  IP Address  | Packets Sent | Packets Received | Packets Lost | Minimum Time (ms) | Maximum Time (ms) | Average Time (ms) |\n";
    output += "|-------------------|-------------|--------------|--------------|------------------|--------------|--------------------|--------------------|--------------------|\n";
    output += `| ${response.host} | ${response.alive ? "Reachable" : "Unreachable"} | ${response.numeric_host} | ${response.times.length} | ${response.times.filter(t => t !== 'unknown').length} | ${response.packetLoss}% | ${response.min} | ${response.max} | ${response.avg} | \n`;

    return output;
  } catch (error) {
    console.error(`Error: ${error}`);
    throw error;
  }
}

async function init(botbuilder) {
  const onTurn = async (context) => {
    if (context.activity.type === botbuilder.ActivityTypes.Message) {
      const text = (context.activity.text || "").trim();
      if (text.startsWith("ping")) {
        const parts = text.split(" ");
        const pcName = parts[1];
        const numPings = parseInt(parts[2], 10) || 1; // Get the second argument or default to 1 if not provided

        await context.sendActivity({
          type: 'message',
          text: `Pinging "${pcName}" ${numPings} time${numPings > 1 ? 's' : ''}...`,
          textFormat: 'plain'
        });

        try {
          const result = await pingPC(pcName, numPings);
          await context.sendActivity({
            type: 'message',
            text: result,
            textFormat: 'markdown'
          });
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

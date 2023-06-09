const { NlpManager } = require('node-nlp');
const commands = require('./db/commands.json');
const { spawn } = require('child_process');


const manager = new NlpManager({ languages: ['en'], forceNER: true });

// Train NLP manager with command descriptions
for (const command of commands) {
  manager.addDocument('en', command.description, command.name);
  for (const alt of command.alt_description) {
    manager.addDocument('en', alt, command.name);
  }
}

const getADComputer = spawn('powershell.exe', ['Get-ADComputer -Filter * -Property Name | Select-Object -ExpandProperty Name']);
let hostnames = '';

getADComputer.stdout.on('data', (data) => {
  hostnames += data.toString();
});
getADComputer.on('close', (code) => {
  // Split the output into an array of hostnames
  hostnames = hostnames.split('\n').map(hostname => hostname.trim());
  console.log(hostnames)

  // Add each hostname as an entity to the NLP manager
  for (const hostname of hostnames) {
    manager.addNamedEntityText('hostname', 'en', [hostname]);
  }
});

const confidenceThreshold = 0.7; // Adjust this value based on your needs

async function init(botbuilder) {
  await manager.train();
  return {
    onTurn: async (context) => {
      if (context.activity.type === botbuilder.ActivityTypes.Message) {
        const text = context.activity.text || "";
        if (text.startsWith("ask ")) {
          const message = text.substring(4);
          try {
            const result = await manager.process('en', message);
            console.log(result);
            const bestMatch = result.intent;
            const score = result.score;
            console.log(bestMatch);
            if (score > confidenceThreshold) {
              const command = commands.find((command) => command.name === bestMatch);
              if (command) {
                await context.sendActivity(`The command for your message is: ${command.name} - ${command.description}`);
              } else {
                await context.sendActivity("Sorry, I could not find a command for your message.");
              }
            } else {
              await context.sendActivity("I'm sorry, I didn't understand that. Could you please rephrase or provide more details?");
            }
          } catch (error) {
            console.error(error);
            await context.sendActivity("An error occurred while processing your request.");
          }
        }
      }
    },
  };
}

module.exports = {
  init: init,
};

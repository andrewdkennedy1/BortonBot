const fs = require('fs');
const path = require('path');

const aliasesFilePath = path.join(__dirname, 'db', 'aliases.json');

// Load aliases from file or initialize an empty object
let aliases = {};
if (fs.existsSync(aliasesFilePath)) {
  aliases = JSON.parse(fs.readFileSync(aliasesFilePath));
}

function init(botbuilder) {
  async function onTurn(context) {
    if (context.activity.type === botbuilder.ActivityTypes.Message) {
      const text = context.activity.text || "";
      const parts = text.trim().split(' ');

      // Command to add an alias
      if (parts[0] === "alias" && parts[1] === "add") {
        if (parts.length > 3) {
          const alias = parts[2];
          const command = parts.slice(3).join(' ');
          aliases[alias] = command;
          fs.writeFileSync(aliasesFilePath, JSON.stringify(aliases));
          await context.sendActivity(`Alias "${alias}" added for command "${command}"`);
        } else {
          await context.sendActivity("```\nUsage: alias add <alias> <command>\n```");
        }
      } 
    
      // Command to remove an alias
      else if (parts[0] === "alias" && parts[1] === "remove" && parts.length > 2) {
        const alias = parts[2];
        if (aliases[alias]) {
          delete aliases[alias];
          fs.writeFileSync(aliasesFilePath, JSON.stringify(aliases));
          await context.sendActivity(`Alias "${alias}" removed.`);
        } else {
          await context.sendActivity(`No alias found for "${alias}"`);
        }
      } 

      // Command to list all aliases
      else if (parts[0] === "alias" && parts[1] === "list") {
        let aliasesTable = "| Alias | Command |\n";
        aliasesTable += "| ----- | ------- |\n";

        for (const alias in aliases) {
          const command = aliases[alias];
          aliasesTable += `| ${alias} | ${command} |\n`;
        }

        const message = botbuilder.MessageFactory.text(aliasesTable);
        message.textFormat = "markdown";
        await context.sendActivity(message);
      }
    
      // Check for aliases in the text and replace them
      else {
        let words = text.split(' ');
        let firstWord = words[0];
        let hasAlias = firstWord in aliases;
        if (hasAlias) {
          words[0] = aliases[firstWord];
          context.activity.text = words.join(' ').trim();
        } else {
          return;
        }
      }
    }
  }

  return {
    onTurn: onTurn
  };
}

module.exports = {
  init: init,
};

const { executePowerShellScript } = require("./lib/utils");
const path = require("path");

async function getTransportRules(appId, certThumbprint, organization) {
  const scriptPath = path.join(__dirname, "./lib/scripts/get_transport_rules.ps1");

  try {
    const output = await executePowerShellScript(scriptPath, [appId, certThumbprint, organization]);
    const jsonStartIndex = output.indexOf("[");
    const jsonEndIndex = output.lastIndexOf("]") + 1;
    const jsonString = output.substring(jsonStartIndex, jsonEndIndex);
    console.log(`JSON String: ${jsonString}`);
    const domains = JSON.parse(jsonString);
    domains.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    const domainList = domains.join("\n");
    const result = `Transport Rules:\n\n${domainList.split("\n").join("\n\n")}\n`;
    
    return result;
  } catch (error) {
    console.error(`Error running PowerShell script: ${error.message}`);
    throw error;
  }
}


async function addTransportRules(appId, certThumbprint, organization, newDomains) {
  const scriptPathGet = path.join(__dirname, "./lib/scripts/get_transport_rules.ps1");
  const scriptPathAdd = path.join(__dirname, "./lib/scripts/add_transport_rules.ps1");

  try {
    // Get the current list of domains
    const output = await executePowerShellScript(scriptPathGet, [appId, certThumbprint, organization]);
    const jsonStartIndex = output.indexOf("[");
    const jsonEndIndex = output.lastIndexOf("]") + 1;
    const jsonString = output.substring(jsonStartIndex, jsonEndIndex);
    console.log(`JSON String: ${jsonString}`);
    const domains = JSON.parse(jsonString);

    // Concatenate the new domain list with the current one
    const newDomainArray = newDomains.split(',').map(domain => domain.trim());
    const updatedDomains = [...domains, ...newDomainArray].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    // Format the updated domain list
    const updatedDomainList = updatedDomains.join(',');

    // Call the PowerShell script with the updated list of domains
    await executePowerShellScript(scriptPathAdd, [appId, certThumbprint, organization, updatedDomainList]);

    const result = `Transport rules updated successfully.\n\nNew sender domains:\n\n${updatedDomains.join('\n')}\n`;
    return result;
  } catch (error) {
    console.error(`Error running PowerShell script: ${error.message}`);
    throw error;
  }
}



async function init(botbuilder) {
  const onTurn = async (context) => {
    if (context.activity.type === botbuilder.ActivityTypes.Message) {
      const text = (context.activity.text || "").trim();
      if (text.startsWith("exo whitelist get")) {
        const appId = process.env.MICROSOFT_CLIENT_ID;
        const certThumbprint = process.env.CERTIFICATETHUMBPRINT;
        const organization = process.env.ORGANIZATION;

        await context.sendActivity("Fetching transport rules...");
        try {
          const result = await getTransportRules(appId, certThumbprint, organization);
          await context.sendActivity(result);
        } catch (error) {
          await context.sendActivity("An error occurred while fetching transport rules.");
        }
      } else if (text.startsWith("exo whitelist add")) {
        const appId = process.env.MICROSOFT_CLIENT_ID;
        const certThumbprint = process.env.CERTIFICATETHUMBPRINT;
        const organization = process.env.ORGANIZATION;
        const newDomains = text.substring("exo whitelist add".length).trim();

        await context.sendActivity("Adding transport rules...");
        try {
          const result = await addTransportRules(appId, certThumbprint, organization, newDomains);
          await context.sendActivity(result);
        } catch (error) {
          await context.sendActivity("An error occurred while adding transport rules.");
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

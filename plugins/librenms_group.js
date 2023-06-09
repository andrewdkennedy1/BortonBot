const axios = require('axios');

const groupAliases = {
    cradlepoints: 12,
    pis: 4,
    pfsense: 2,
};

async function getDevice(deviceId, serverUrl, authToken) {
    const apiUrl = `${serverUrl}/api/v0/devices/${deviceId}`;

    console.log(`Device URL: ${apiUrl}`);

    try {
        const response = await axios.get(apiUrl, {
            headers: {'X-Auth-Token': authToken}
        });

        console.log(`Device Response: ${JSON.stringify(response.data)}`);

        const device = response.data.devices[0];

        if (!device) {
            console.error(`Device not found. Device ID: ${deviceId}`);
            return null;
        }

        const uptimeInSeconds = device.uptime;
        const days = Math.floor(uptimeInSeconds / 86400);
        const hours = Math.floor((uptimeInSeconds % 86400) / 3600);
        const minutes = Math.floor((uptimeInSeconds % 3600) / 60);

        const uptime = `${days} days, ${hours} hours, ${minutes} minutes`;

        return {...device, uptime, system_name: device.sysName};

    } catch (error) {
        console.error(`Error in request: ${error.message}`);
        return null;
    }
}

function init(botbuilder) {
    return {
        onTurn: async (context) => {
            if (context.activity.type === botbuilder.ActivityTypes.Message) {
                const text = context.activity.text || "";
                if (text.startsWith("librenms group ") || groupAliases[text]) {
                    let groupId = text.substring("librenms group ".length);
                    if (groupAliases[text]) {
                        groupId = groupAliases[text];
                    }
                    const serverUrl = process.env.LIBRENMS_SERVER;
                    const apiUrl = `${serverUrl}/api/v0/devicegroups/${groupId}?columns=hostname,status`;

                    console.log(`API URL: ${apiUrl}`);

                    try {
                        const response = await axios.get(apiUrl, {
                            headers: {'X-Auth-Token': process.env.LIBREAPI}
                        });

                        console.log(`Response: ${JSON.stringify(response.data)}`);

                        let devices = [];
                        for (let device of response.data.devices) {
                            console.log(`Device: ${JSON.stringify(device)}`);
                            const deviceInfo = await getDevice(device.device_id, serverUrl, process.env.LIBREAPI);
                            if (deviceInfo) {
                                const systemName = deviceInfo.system_name.replace(".local.tld", "");
                                const status = deviceInfo.status ? "UP" : "DOWN";
                                devices.push({
                                    name: systemName,
                                    id: device.device_id,
                                    status: status,
                                    uptime: deviceInfo.uptime,
                                });
                            }
                        }

                        devices.sort((a, b) => {
                            return a.name.localeCompare(b.name);
                        });

                        let deviceStatus = `| Name | ID | Status | Time |\n`;
                        deviceStatus += `| ---- | -- | ------ | ------ |\n`;
                        for (let device of devices) {
                            deviceStatus += `| ${device.name} | ${device.id} | ${device.status} | ${device.uptime} |\n`;
                        }

                        console.log(`Device status: ${deviceStatus}`);

                        const message = botbuilder.MessageFactory.text(deviceStatus);
                        message.textFormat = "markdown";
                        await context.sendActivity(message);

                    } catch (error) {
                        if (error.response && error.response.status === 401) {
                            console.log(`Unauthorized request. Error message: ${error.message}`);
                            await context.sendActivity('Unauthorized. Please check your API credentials.');
                        } else {
                            console.error(`Error in request: ${error.message}`);
                            await context.sendActivity(`Error retrieving device group ${groupId}.`);
                        }
                    }
                }
            }
        },
    };
}

module.exports = {
  init: init,
};

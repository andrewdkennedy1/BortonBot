const axios = require('axios');
const ping = require('ping');

const fetchData = async (url, headers) => {
  const response = await axios.get(url, { headers });
  console.log('fetchData Response:', response.data);
  return response.data;
};

const findPortForMacAddress = async (arg, server, token) => {
  const headers = { 'X-Auth-Token': token };
  let macAddress = arg;
  let ip = null;

  // check if argument is a MAC address
  if (!/^([0-9a-fA-F]{2}[-:]){5}[0-9a-fA-F]{2}$/.test(macAddress)) {
    // argument is a hostname, resolve MAC address
    try {
      const response = await ping.promise.probe(macAddress);
      console.log('ping response:', response);
      // get numeric_host 
      ip = response.numeric_host;
      // make request to get MAC address from IP
      const arpResponse = await fetchData(`${server}/api/v0/resources/ip/arp/${ip}`, headers);
      macAddress = arpResponse.arp[0].mac_address;
    } catch (error) {
      console.error(error);
      return `No port found associated with hostname: ${arg}`;
    }
  } else {
    // argument is a MAC address, remove colons/hyphens
    macAddress = macAddress.replace(/[-:]/g, '');
  }

  const portData = await fetchData(`${server}/api/v0/ports/mac/${macAddress}?filter=first`, headers);

  if (portData.status === 'ok' && portData.ports) {
    const deviceData = await fetchData(`${server}/api/v0/devices/${portData.ports.device_id}`, headers);
    const sysName = deviceData.devices && deviceData.devices.length > 0 ? deviceData.devices[0].sysName : "Unknown";
    return `${arg} (${macAddress}) is most likely connected to <a href="${server}/device/device=${deviceData.devices[0].device_id}/">${sysName}</a> : <a href="${server}/device/device=${portData.ports.device_id}/tab=port/port=${portData.ports.port_id}/">${portData.ports.ifName} </a> (IP: ${ip})`;
  }

  return `No port found associated with MAC Address: ${macAddress}`;
};

module.exports = {
  init: (botbuilder) => {
    return {
      onTurn: async (context) => {
        if (context.activity.type === botbuilder.ActivityTypes.Message) {
          const text = context.activity.text || '';
          if (text.startsWith('librenms findport ')) {
            const arg = text.substring('librenms findport '.length);
            const token = process.env.LIBREAPI;
            const server = process.env.LIBRENMS_SERVER;

            try {
              const result = await findPortForMacAddress(arg, server, token);
              await context.sendActivity({ type: 'message', text: result });
            } catch (error) {
              console.error(error);
              await context.sendActivity({ type: 'message', text: `Error occurred while finding port for argument: ${arg}` });
            }
          }
        }
      },
    };
  },
};

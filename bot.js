const restify = require("restify");
const botbuilder = require("botbuilder");
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");

require("dotenv").config();

// Set up BotFrameworkAdapter
const adapter = new botbuilder.BotFrameworkAdapter({
  appId: process.env.MICROSOFT_CLIENT_ID,
  appPassword: process.env.MICROSOFT_CLIENT_SECRET,
});

// Set up error handling for adapter
adapter.onTurnError = async (context, error) => {
  console.error(`\n [onTurnError] unhandled error: ${error}`);
  console.error(` onTurnError Error stack: ${error.stack}`);
  await context.sendActivity(
    "The bot encountered an error. Please try again later."
  );
};

// Set up HTTPS options for server
const httpsOptions = {
  certificate: fs.readFileSync("./ssl/chat.bortonsupport.com-chain.pem"),
  key: fs.readFileSync("./ssl/chat.bortonsupport.com-key.pem"),
  ca: fs.readFileSync("./ssl/chat.bortonsupport.com-chain-only.pem"),
};

// Create server and configure plugins
const server = restify.createServer(httpsOptions);
server.use(restify.plugins.bodyParser());
server.pre(restify.pre.pause());
const pluginDir = path.join(__dirname, "plugins");
const pluginFiles = fs
  .readdirSync(pluginDir)
  .filter((file) => file.endsWith(".js"));

adapter.use(async (context, next) => {
  if (context.activity.type === botbuilder.ActivityTypes.Invoke) {
    context.activity.text = "";
  }

  const text = context.activity.text || "";
  const mentions = context.activity.entities?.filter(
    (e) => e.type === "mention"
  );
  const botMentioned = mentions?.some(
    (m) => m.mentioned.id === context.activity.recipient.id
  );

  if (
    text ||
    context.activity.type === botbuilder.ActivityTypes.Invoke ||
    botMentioned
  ) {
    if (botMentioned) {
      // Remove the bot mention from the text
      const mentionText = mentions.find(
        (m) => m.mentioned.id === context.activity.recipient.id
      ).text;
      context.activity.text = text.replace(mentionText, "").trim();
    }
    await next();
  }
});

// Load plugins and create plugin middleware

function loadPlugins() {
  return new Promise((resolve) => {
    pluginMiddlewares = [];

    Promise.all(
      pluginFiles.map(async (file) => {
        const pluginPath = path.join(pluginDir, file);
        delete require.cache[require.resolve(pluginPath)]; // Clear the plugin from cache
        const plugin = require(pluginPath);
        const botMiddleware = await plugin.init(botbuilder);
        pluginMiddlewares.push(botMiddleware);
      })
    ).then(() => resolve());
  });
}

const watcher = chokidar.watch(pluginDir);

// Set event listeners for file changes

watcher.on('ready', () => {
  console.log('Initial scan complete. Ready for file changes.');

  watcher.on('add', (path) => {
    console.log(`File added: ${path}`);
    loadPlugins();
  });

  watcher.on('change', (path) => {
    console.log(`File changed: ${path}`);
    loadPlugins();
  });

  watcher.on('unlink', (path) => {
    console.log(`File removed: ${path}`);
    loadPlugins();
  });
});
// Handle incoming messages
server.post("/api/messages", async (req, res) => {
  console.log("Incoming raw message:", JSON.stringify(req.body, null, 2));
  try {
    await adapter.processActivity(req, res, async (context) => {
      context.turnState.set("middlewares", pluginMiddlewares);

      // Check for message or invoke activity types
      if (
        context.activity.type === botbuilder.ActivityTypes.Message ||
        context.activity.type === botbuilder.ActivityTypes.Invoke
      ) {
        for (const middleware of pluginMiddlewares) {
          await middleware.onTurn(context, res);
        }
      }
    });
    res.status(200);
    res.end();
  } catch (error) {
    console.error(`Error in server.post: ${error}`);
    res.status(500);
    res.end();
  }
});

server.get("/anydesk/pc=:pcParam", (req, res, next) => {
  const pc = req.params.pcParam;
  if (pc) {
    const anydeskUrl = `anydesk://${pc}@ad`;
    res.redirect(anydeskUrl, next); // add next parameter
    console.log(`Redirecting to ${anydeskUrl}`);
  }
   else {
    res.status(400);
    res.send("Missing 'pc' parameter in URL");
    next();
  }
});

server.get("/rdp/:pc/:sessionId", (req, res, next) => {
  console.log("Received GET request for /rdp");
  console.log("Params:", req.params);
  const pc = encodeURIComponent(req.params.pc);
  const sessionId = encodeURIComponent(req.params.sessionId);
  if (pc && sessionId) {
    console.log(`pc: ${pc}, sessionId: ${sessionId}`);
    res.redirect(`shadow://${pc}/${sessionId}`, next);
  } else {
    res.status(400);
    res.send("Missing 'pc' or 'sessionId' parameter in URL");
    next();
  }
});

server.get("/help", (req, res, next) => {
  const filePath = path.join(__dirname, "plugins", "db", "commands.json");
  console.log("Reading commands.json from:", filePath);

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading commands.json:", err);
      res.status(500);
      res.send("An error occurred while retrieving the commands.");
      return next();
    }

    console.log("Successfully read commands.json");
    const commands = JSON.parse(data);
    console.log("Parsed commands:", commands);

    res.header("Content-Type", "text/html");
    res.send(generateHelpPage(commands));
    console.log("Help page sent");
    next();
  });
});

function generateHelpPage(commands) {
  let html = "<h1>Available Commands:</h1>";
  html += "<ul>";
  commands.forEach((command) => {
    html += `<li>${command}</li>`;
  });
  html += "</ul>";

  return html;
}


function generateHelpPage(commands) {
  // Generate HTML content dynamically using the commands data
  // You can use a template engine like Handlebars or EJS for more advanced templating

  let html = "<h1>Available Commands:</h1>";
  html += "<ul>";
  commands.forEach((command) => {
    html += `<li>${command}</li>`;
  });
  html += "</ul>";

  return html;
}


loadPlugins().then(() => {
  const port = process.env.PORT || 8082;
  server.listen(port, () => {
    console.log(`${server.name} listening to ${server.url}`);
  });
});


function init(botbuilder) {
  return {
    onTurn: async (context) => {
      if (context.activity.type === botbuilder.ActivityTypes.Message) {
        const text = context.activity.text || "";
        if (text.startsWith("echo ")) {
          const message = text.substring(5);
          await context.sendActivity(`You said "${message}"`);
        }
      }
    },
  };
}

module.exports = {
  init: init,
};

const slackNotifierLib = async (slack, message) => {
  slack.send(message);
};

module.exports = slackNotifierLib;

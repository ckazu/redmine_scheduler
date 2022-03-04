const admin = require('firebase-admin');
admin.initializeApp();
const firestore = admin.firestore();
const functions = require('firebase-functions');
const { PubSub } = require('@google-cloud/pubsub');
const pubsub = new PubSub();

const HOSTING_URL = functions.config().hosting.url || `https://${JSON.parse(process.env.FIREBASE_CONFIG).projectId}.firebaseapp.com`;

const IncomingWebhook = require('@slack/client').IncomingWebhook;
const slack = new IncomingWebhook(functions.config().slack.url);

const webCrawlerLib = require('./webCrawler');
const webFetcherLib = require('./webFetcher');
const cryptonizeLib = require('./cryptonize');
const authUserLib = require('./userAuth');
const slackNotifierLib = require('./slackNotifier');

const memorySettingWith1GB = { timeoutSeconds: 300, memory: "1GB" };
const memorySettingWith512MB = { timeoutSeconds: 300, memory: "512MB" };
const memorySettingWith256MB = { timeoutSeconds: 300, memory: "256MB" };
const memorySettingWith128MB = { timeoutSeconds: 300, memory: "128MB" };

exports.webFetcher = functions.runWith(memorySettingWith128MB).pubsub.schedule('5 * * * *').onRun(async (context) => {
  await webFetcherLib(firestore, pubsub);
});

exports.webCrawler = functions.runWith(memorySettingWith256MB).pubsub.topic('webChecker').onPublish(async (message) => {
  const scheduleId = message.json.scheduleId;
  console.log("webCrawler - triggered: ", scheduleId);
  await webCrawlerLib(firestore, pubsub, scheduleId, HOSTING_URL);
});

exports.webCrawlerOnWrite = functions.runWith(memorySettingWith256MB).firestore.document('schedules/{scheduleID}').onWrite(async (change, context) => {
  const scheduleId = context.params.scheduleID;
  console.log("Crypto - triggered: ", scheduleId);
  await cryptonizeLib(firestore, scheduleId);
});

exports.slackNotifier = functions.runWith(memorySettingWith128MB).pubsub.topic('slackNotifier').onPublish(async (message) => {
  await slackNotifierLib(slack, message.json);
});

exports.sendWelcomeEmail = functions.runWith(memorySettingWith128MB).auth.user().onCreate(async (user) => {
  await authUserLib(admin, pubsub, user);
});

const userAuth = async (admin, pubsub, user) => {
  console.log('registered new user: ', user.email);
  // await admin.auth().updateUser(user.uid, { disabled: true });

  const slackPayload = {
    text: `[Redmine Scheduler] ユーザが新規登録されました`,
    attachments: [{
      title: "意図しないユーザの場合、Firebase 管理ツールからアカウントを無効にしてください",
      title_link: "https://console.firebase.google.com",
      fields: [
        { title: "email", value: user.email },
        { title: "name", value: user.displayName }
      ]
    }]
  };
  const data = JSON.stringify(slackPayload);
  data['channel'] = 'ckazu_sandbox';
  const dataBuffer = Buffer.from(data);
  await pubsub.topic('slackNotifier').publish(dataBuffer);
};

module.exports = userAuth;

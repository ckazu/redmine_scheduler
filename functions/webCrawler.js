const generator = require('./lib/generator');

// todo: refactor
const webCrawlerLib = async (firestore, pubsub, scheduleId, hostingUrl) => {
  const scheduleRef = await firestore.doc(`schedules/${scheduleId}`);
  const scheduleDoc = await scheduleRef.get();
  const schedule = await scheduleDoc.data();

  const res = await generator(schedule)
    .catch(async err => {
      if (err.message === 'AlreadyGeneratedError') { return; }

      // console.error('generatorLib: ', err);
      await pubsub.topic('slackNotifier').publish(slackErrorFormat(scheduleId, schedule, hostingUrl, err));
      throw err;
    });

  if (res && res.status === 201) {
    const data = slackFormat(schedule, res.url.replace(/\.json/i, ''));
    await pubsub.topic('slackNotifier').publish(data);
    console.log('publish slackNotifier: ', schedule.title);
  }
  return await scheduleRef.set({ checkedAt: +new Date }, { merge: true });
};

module.exports = webCrawlerLib;

// todo: classify arguments
const slackFormat = (schedule, url) => {
  let titleText = `[${url}] が新規追加されました`;

  let data = {
    attachments: [
      {
        title: titleText,
        title_link: url,
        color: 'good',
      }
    ]
  };
  if (typeof schedule.slack !== 'undefined') { data['channel'] = schedule.slack; };
  return Buffer.from(JSON.stringify(data));
};

const slackErrorFormat = (scheduleId, schedule, hostingUrl, err) => {
  let data = {
    attachments: [
      {
        title: 'エラーが発生しました',
        color: 'danger',
        fields: [
          { title: 'ID', value: scheduleId },
          { title: '管理ページ', value: hostingUrl },
          { title: 'エラー内容', value: `${err.name}: ${err.message}` }
        ]
      }]
  };
  if (typeof schedule.slack !== 'undefined') { data['channel'] = schedule.slack; };
  return Buffer.from(JSON.stringify(data));
};

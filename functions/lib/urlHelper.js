const moment = require('moment');

exports.generateTemplateUrl = (domain, project, template) => (
  `https://${domain}/projects/${project}/wiki/${template}.json`
);

exports.generateTargetUrl = (domain, project, title, dateDiff) => {
  const date = moment().add(-dateDiff, 'days');
  const titleWithDate = title.
    replace('YYYY', date.format('YYYY')).
    replace('MM', date.format('MM')).
    replace('DD', date.format('DD'));
  return `https://${domain}/projects/${project}/wiki/${titleWithDate}.json`;
};

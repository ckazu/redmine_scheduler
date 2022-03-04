const functions = require('firebase-functions');
const crypto = require('crypto');
const moment = require('moment');
const fetch = require('node-fetch');

const { generateTemplateUrl, generateTargetUrl } = require('./urlHelper')

const generator = async (schedule) => {
  const domain = schedule?.domain || functions.config().redmine.domain;
  const project = schedule?.project;
  const template = schedule?.template;
  const title = schedule?.title;
  const parent = schedule?.parent || 'wiki';
  const dateDiff = schedule?.date_diff || '0';
  const apiKey = schedule?.encrypted_access_key;
  const iv = schedule?.iv;

  let decryptedApiKey;
  if (apiKey) {
    const algorithm = 'aes-256-ctr';
    const passphrase = functions.config().crypto.passphrase;
    var decipher = crypto.createDecipheriv(algorithm, Buffer.from(passphrase), Buffer.from(iv, 'hex'));
    var dec = decipher.update(apiKey, 'base64')
    dec += decipher.final('utf8');
    decryptedApiKey = dec;
  } else {
    decryptedApiKey = functions.config().redmine.access_key;
  }

  try {
    const targetUrl = generateTargetUrl(domain, project, title, dateDiff);
    const templateUrl = generateTemplateUrl(domain, project, template);

    const alreadyGenerated = await ifExistTargetPage(targetUrl, decryptedApiKey);
    if (alreadyGenerated) {
      console.log(`already generated page: ${targetUrl}`)
      throw new Error('AlreadyGeneratedError');
    }
    const templateText = await fetchTemplate(templateUrl, decryptedApiKey);
    const generatedPage = await generatePage(targetUrl, templateText, parent, decryptedApiKey);
    return generatedPage;
  } catch (err) {
    throw err;
  }
};

const generatePage = async (url, text, parent, apiKey) => {
  res = await fetch(url,
    {
      method: 'put',
      body: JSON.stringify({ wiki_page: { parent_title: parent, text: text } }),
      headers: {
        'Content-Type': "application/json",
        'X-Redmine-API-Key': apiKey,
      }
    }
  );

  if (res.status === 200 || res.status === 201) {
    return res;
  } else {
    console.error('url: ', url)
    console.error('text: ', text)
    console.error('parent: ', parent)
    throw new Error(`[generate page] ${res.status}: ${res.statusText}`);
  }
}

const ifExistTargetPage = async (url, apiKey) => {
  let res = await fetch(url,
    {
      method: 'get',
      headers: {
        'Content-Type': "application/json",
        'X-Redmine-API-Key': apiKey,
      }
    }
  );
  if (res.status === 200) {
    return true;
  } else if (res.status === 404) {
    return false;
  } else {
    console.error('url: ', url)
    throw new Error(`[exist check] ${res.status}: ${res.statusText}`);
  }
}

const fetchTemplate = async (url, apiKey) => {
  let res = await fetch(url,
    {
      method: 'get',
      headers: {
        'Content-Type': "application/json",
        'X-Redmine-API-Key': apiKey,
      }
    }
  );
  if (res.status === 200) {
    const resJson = await res.json();
    let text = resJson.wiki_page.text;
    text = text.replace(/^.*wiki_extentions_footer[\s\S]*/m, '');
    return text;
  } else if (res.status === 404) {
    throw new Error('TemplateNotFoundError');
  } else {
    console.error('url: ', url)
    throw new Error(`[fetch template] ${res.status}: ${res.statusText}`);
  }
}

module.exports = generator;

const functions = require('firebase-functions');
const crypto = require('crypto');

const cryptonize = async (firestore, scheduleId) => {
  const algorithm = 'aes-256-ctr';
  const passphrase = functions.config().crypto.passphrase;
  const iv = crypto.randomBytes(16);

  const scheduleRef = await firestore.doc(`schedules/${scheduleId}`);
  const scheduleDoc = await scheduleRef.get();
  const schedule = await scheduleDoc.data();
  const accessKey = await schedule.access_key;

  if (!accessKey) { return; }

  var cipher = crypto.createCipheriv(algorithm, passphrase, iv)
  var crypted = cipher.update(accessKey, 'utf8', 'base64')
  crypted += cipher.final('base64');

  return await scheduleRef.set({
    encrypted_access_key: crypted,
    iv: iv.toString('hex'),
    access_key: null
  }, { merge: true });
}

module.exports = cryptonize;

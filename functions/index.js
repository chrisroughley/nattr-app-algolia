const functions = require("firebase-functions");
const admin = require("firebase-admin");
const algoliasearch = require("algoliasearch/lite");
const getMetaData = require("metadata-scraper");
require("firebase-functions/lib/logger/compat");

admin.initializeApp();
const firestore = admin.firestore();

const APP_ID = functions.config().algolia.app;
const ADMIN_KEY = functions.config().algolia.key;

const client = algoliasearch(APP_ID, ADMIN_KEY);
const index = client.initIndex("users");

exports.addToIndex = functions
  .region("europe-west2")
  .firestore.document("users/{userId}")
  .onCreate((snapshot) => {
    const data = snapshot.data();
    const objectID = snapshot.id;
    return index.saveObject({ ...data, objectID });
  });

exports.updateIndex = functions
  .region("europe-west2")
  .firestore.document("users/{userId}")
  .onUpdate((change) => {
    const newData = change.after.data();
    const objectID = change.after.id;
    return index.saveObject({ ...newData, objectID });
  });

exports.deleteFromIndex = functions
  .region("europe-west2")
  .firestore.document("users/{userId}")
  .onDelete((snapshot) => {
    return index.deleteObject(snapshot.id);
  });

exports.getMetaData = functions
  .region("europe-west2")
  .https.onCall(async ({ url, chatId, messageId }) => {
    const getHostnameFromRegex = (url) => {
      const matches = url.match(/^https?:\/\/(?:www.)?([^/?#]+)(?:[/?#]|$)/i);
      const hostName = matches && matches[1];
      return hostName;
    };

    if (url) {
      const data = await getMetaData(url);
      let status = "";

      if (data.url && data.image && data.title) {
        status = "success";
      } else {
        status = "missingData";
      }

      const urlMetaData = {
        url: data.url,
        image: data.image,
        title: data.title,
        hostName: getHostnameFromRegex(url),
        status,
      };

      await firestore
        .doc(`chats/${chatId}/messages/${messageId}`)
        .set({ urlMetaData }, { merge: true });

      return urlMetaData;
    } else {
      return { result: "no url" };
    }
  });

exports.userStatusChanged = functions
  .region("europe-west2")
  .database.ref("status/{uid}")
  .onUpdate(async (change, context) => {
    const eventStatus = change.after.val();
    const uid = context.params.uid;

    const userStatusFirestoreRef = firestore.doc(`userStatus/${uid}`);

    const statusSnapshot = await change.after.ref.once("value");
    const status = statusSnapshot.val();

    if (status.last_changed > eventStatus.last_changed) {
      return null;
    }

    if (Object.prototype.hasOwnProperty.call(eventStatus, "connections")) {
      return userStatusFirestoreRef.set({ status: "online" });
    } else {
      return userStatusFirestoreRef.set({ status: "offline" });
    }
  });

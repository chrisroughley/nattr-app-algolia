const functions = require("firebase-functions");
const algoliasearch = require("algoliasearch/lite");

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

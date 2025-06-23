
const firebaseConfig = {
  apiKey: "AIzaSyCH1771AFZyfSD_PvNxR9AQoZ30dg_DcOg",
  authDomain: "fortalezasas-25e42.firebaseapp.com",
  projectId: "fortalezasas-25e42",
  storageBucket: "fortalezasas-25e42.firebasestorage.app",
  messagingSenderId: "383032445971",
  appId: "1:383032445971:web:490f92170d2f36be70c3e6"
};

firebase.initializeApp(firebaseConfig);
export const db = firebase.firestore();
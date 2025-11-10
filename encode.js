// encode.js
const fs = require("fs");
const key = fs.readFileSync("./firebase-adminsdk-fbsvc-469d75a788.json", "utf8");
const base64 = Buffer.from(key).toString("base64");
console.log(base64);
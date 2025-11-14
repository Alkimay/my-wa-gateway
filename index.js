const { config } = require("dotenv");
const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const path = require("path");
const MainRouter = require("./app/routers");
const errorHandlerMiddleware = require("./app/middlewares/error_middleware");
const whatsapp = require("wa-multi-session");
const axios = require("axios");
const fs = require("fs");
const crypto = require("crypto");
config();

var app = express();
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.set("view engine", "ejs");
// Public Path
app.use("/p", express.static(path.resolve("public")));
app.use("/p/*", (req, res) => res.status(404).send("Media Not Found"));

app.use(MainRouter);

app.use(errorHandlerMiddleware);

const PORT = process.env.PORT || "5000";
app.set("port", PORT);
var server = http.createServer(app);
server.on("listening", () => console.log("APP IS RUNNING ON PORT " + PORT));

server.listen(PORT);
async function downloadAndDecryptImage(msg) {
  if (!msg.message?.imageMessage?.url || !msg.message.imageMessage.mediaKey) return;

  const encryptedUrl = msg.message.imageMessage.url;
  const fileName = msg.message.imageMessage.fileName || `whatsapp_image_${Date.now()}.jpg`;
  const mediaKeyBuffer = Buffer.from(msg.message.imageMessage.mediaKey); // Convert Uint8Array to Buffer

  try {
    // Download the encrypted file
    const response = await axios({
      method: "GET",
      url: encryptedUrl,
      responseType: "arraybuffer",
    });

    const encryptedBuffer = Buffer.from(response.data);
    const decryptedBuffer = decryptMedia(encryptedBuffer, mediaKeyBuffer);

    const filePath = `./uploads/${fileName}`;
    fs.writeFileSync(filePath, decryptedBuffer);

    console.log(`✅ Decrypted Image Saved: ${filePath}`);
  } catch (error) {
    console.error("❌ Failed to decrypt image:", error);
  }
}
function deriveAESKey(mediaKey) {
  return new Promise((resolve, reject) => {
    crypto.hkdf("sha256", mediaKey, Buffer.alloc(32, 0), "WhatsApp Media Keys", 112, (err, expandedKey) => {
      if (err) reject(err);
      resolve(expandedKey);
    });
  });
}

async function decryptMedia(encryptedBuffer, mediaKey) {
  try {
    const expandedKey = await deriveAESKey(mediaKey);

    if (expandedKey.length !== 112) {
      throw new Error("Expanded key has incorrect length! Expected 112 bytes.");
    }

    const iv = expandedKey.slice(0, 16);         // First 16 bytes = IV
    const cipherKey = expandedKey.slice(16, 48); // Next 32 bytes = AES-256 Key

    if (iv.length !== 16 || cipherKey.length !== 32) {
      throw new Error("Derived key or IV has incorrect length!");
    }

    // Decrypt using AES-256-CBC
    const decipher = crypto.createDecipheriv("aes-256-cbc", cipherKey, iv);
    return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  } catch (error) {
    console.error("❌ Error decrypting media:", error.message);
    throw error;
  }
}


whatsapp.onConnected((session) => {
  console.log("connected => ", session);
});

whatsapp.onDisconnected((session) => {
  console.log("disconnected => ", session);
});

whatsapp.onConnecting((session) => {
  console.log("connecting => ", session);
});
// whatsapp.onMessageReceived(async (msg) => {
//   console.log(msg)
//   if (msg.message?.imageMessage) {
//     // save image
//     msg.saveImage("./myimage.jpg");
//   }
//   //   if (msg.message?.imageMessage?.mimetype?.startsWith("image/")) {
//   //
//   //   console.log("📸 Image received, decrypting...");
//   //   await downloadAndDecryptImage(msg);
//   // }
//
//     if (msg.message?.documentMessage) {
//     // save document
//     msg.saveDocument("./mydocument"); // without extension
//   }
//   return;
//   // if (msg.key.fromMe || msg.key.remoteJid.includes("status")) return;
//   // await whatsapp.readMessage({
//   //   sessionId: msg.sessionId,
//   //   key: msg.key,
//   // });
//   // await whatsapp.sendTyping({
//   //   sessionId: msg.sessionId,
//   //   to: msg.key.remoteJid,
//   //   duration: 3000,
//   // });
//   // await whatsapp.sendTextMessage({
//   //   sessionId: msg.sessionId,
//   //   to: msg.key.remoteJid,
//   //   text: "Hello!",
//   //   answering: msg, // for quoting message
//   // });
// });
whatsapp.loadSessionsFromStorage();
const controlRouter = require("./app/routers/control");

app.use("/control", controlRouter);

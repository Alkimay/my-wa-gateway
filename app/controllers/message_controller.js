const whatsapp = require("wa-multi-session");
const ValidationError = require("../../utils/error");
const { responseSuccessWithData } = require("../../utils/response");
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const os = require('os');

exports.sendMessage = async (req, res, next) => {
  try {
    let to = req.body.number || req.query.number;
    let text = req.body.message || req.query.message;
    let isGroup = req.body.isGroup || req.query.isGroup;
    let access_token = req.body.access_token || req.query.access_token;
    let fileWebHttp = req.body.media_url || req.query.media_url;

    // Auto-detect group if 'to' ends with '@g.us'
    if (to && typeof to === 'string' && to.endsWith('@g.us')) {
      isGroup = true;

    }

    if (fileWebHttp) return this.sendMessageFile(req, res, next);
    if (access_token !== process.env.KEY) throw new ValidationError("Access Token Invalid");

    const sessionId = req.body.instance_id || req.query.instance_id || req.headers.instance_id;
    if (!to || !text) throw new ValidationError("Missing Parameters");
    if (!sessionId) throw new ValidationError("Session Not Found");

    const receiver = to;

    const attemptSendMessage = async (attempts = 3) => {
      try {
        const send = await whatsapp.sendTextMessage({
          sessionId,
          to: receiver,
          isGroup: !!isGroup,
          text,
        });

        res.status(200).json(
            responseSuccessWithData({
              id: send?.key?.id,
              status: send?.status,
              message: send?.message?.extendedTextMessage?.text || "No Text",
              remoteJid: send?.key?.remoteJid,
            })
        );
      } catch (error) {
        if (error.message.includes("Connection Closed") && attempts > 1) {
          console.warn(`Connection closed, retrying... Attempts left: ${attempts - 1}`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Delay before retry
          return attemptSendMessage(attempts - 1);
        }
        throw error; // Rethrow if retries exhausted or error is not related to connection
      }
    };

    await attemptSendMessage();
  } catch (error) {
    next(error);
  }
};

exports.readMessage = async (req, res, next) => {
  try {
    let key = req.body.key || req.query.key;

    const sessionId =
        req.body.session || req.query.session || req.headers.session;

    if (!key) throw new ValidationError("Missing Parameters");

    if (!sessionId) throw new ValidationError("Session Not Founds");


    const send =await whatsapp.readMessage({
      sessionId:sessionId,
      key: key,
    });

    res.status(200).json(
        responseSuccessWithData({
          id: send?.key?.id,
          status: send?.status,
          message: send?.message?.extendedTextMessage?.text || "Not Text",
          remoteJid: send?.key?.remoteJid,
        })
    );
  } catch (error) {
    next(error);
  }
};
exports.sendMessageFile = async (req, res, next) => {
  let tempFilePath; // Declare file path here to ensure access in finally block

  try {
    let to = req.body.number || req.query.number;
    let text = req.body.message || req.query.message;
    let isGroup = req.body.isGroup || req.query.isGroup;
    let fileWebHttp = req.body.media_url || req.query.media_url;
    let filename = req.body.filename || req.query.filename;
    let access_token = req.body.access_token || req.query.access_token;

    // Auto-detect group if 'to' ends with '@g.us'
    if (to && typeof to === 'string' && to.endsWith('@g.us')) {
      isGroup = true;
    }

    if (access_token !== process.env.KEY) throw new ValidationError("Access Token Invalid");
    const sessionId = req.body.instance_id || req.query.instance_id || req.headers.instance_id;

    if (!to || !fileWebHttp) throw new ValidationError("Missing Parameters");
    if (!sessionId) throw new ValidationError("Session Not Found");

    const receiver = to;
    tempFilePath = path.join(os.tmpdir(), filename);
    const writer = fs.createWriteStream(tempFilePath);

    // Download the file from the URL
    const response = await axios({
      url: fileWebHttp,
      method: 'GET',
      responseType: 'stream',
    });

    response.data.pipe(writer);

    // Wait until the file is fully downloaded
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const document = fs.readFileSync(tempFilePath);

    // Retry function to send the document
    const attemptSendDocument = async (attempts = 3) => {
      try {
        const send = await whatsapp.sendDocument({
          sessionId: sessionId,
          to: receiver,
          filename: filename,
          media: document,
          text: text,
            isGroup: !!isGroup,
        });

        res.status(200).json(
            responseSuccessWithData({
              id: send?.key?.id,
              status: send?.status,
              message: send?.message?.extendedTextMessage?.text || "No Text",
              remoteJid: send?.key?.remoteJid,
            })
        );
      } catch (error) {
        if (error.message.includes("Connection Closed") && attempts > 1) {
          console.warn(`Connection closed, retrying... Attempts left: ${attempts - 1}`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Delay before retry
          return attemptSendDocument(attempts - 1);
        }
        throw error; // Rethrow if retries exhausted or error is not connection-related
      }
    };

    await attemptSendDocument();

  } catch (error) {
    next(error);
  } finally {
    // Ensure the temporary file is deleted
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
};


exports.sendBulkMessage = async (req, res, next) => {
  try {
    const sessionId =
      req.body.session || req.query.session || req.headers.session;
    const delay = req.body.delay || req.query.delay || req.headers.delay;
    if (!sessionId) {
      return res.status(400).json({
        status: false,
        data: {
          error: "Session Not Found",
        },
      });
    }
    res.status(200).json({
      status: true,
      data: {
        message: "Bulk Message is Processing",
      },
    });
    for (const dt of req.body.data) {
      const to = dt.to;
      const text = dt.text;
      const isGroup = !!dt.isGroup;

      await whatsapp.sendTextMessage({
        sessionId,
        to: to,
        isGroup: isGroup,
        text: text,
      });
      await whatsapp.createDelay(delay ?? 1000);
    }
    console.log("SEND BULK MESSAGE WITH DELAY SUCCESS");
  } catch (error) {
    next(error);
  }
};
exports.readMessage = async (req, res, next) => {
  try {
    let key = req.body.key || req.query.key;

    const sessionId =
        req.body.session || req.query.session || req.headers.session;

    if (!key) throw new ValidationError("Missing Parameters");

    if (!sessionId) throw new ValidationError("Session Not Founds");


    const send =await whatsapp.readMessage({
      sessionId:sessionId,
      key: key,
    });

    res.status(200).json(
        responseSuccessWithData({
          id: send?.key?.id,
          status: send?.status,
          message: send?.message?.extendedTextMessage?.text || "Not Text",
          remoteJid: send?.key?.remoteJid,
        })
    );
  } catch (error) {
    next(error);
  }
};

exports.listGroups = async (req, res, next) => {
  try {
    const sessionId = req.body.instance_id || req.query.instance_id || req.headers.instance_id;
    if (!sessionId) throw new ValidationError("Session Not Found");

    const sock = await whatsapp.getSession(sessionId);

    // Call Baileys group fetch
    const allGroups = await sock.groupFetchAllParticipating();

    // Format nicely
    const groups = Object.values(allGroups).map(meta => ({
      id: meta.id,
      name: meta.subject,
      participants: meta.participants.length,
    }));

    return res.status(200).json(responseSuccessWithData(groups));
  } catch (error) {
    next(error);
  }
};
const { Router } = require("express");
const {
  sendMessage,
  sendBulkMessage, sendMessageFile,readMessage
} = require("../controllers/message_controller");
const MessageRouter = Router();

MessageRouter.all("/send", sendMessage);
MessageRouter.all("/send-message", sendMessage);
MessageRouter.all("/send-bulk-message", sendBulkMessage);
MessageRouter.all("/send-message-file", sendMessageFile);
MessageRouter.all("/read-message", readMessage);

module.exports = MessageRouter;

const { Router } = require("express");
const {
  createSession,
  deleteSession,
  sessions,
  createSessionWeb
} = require("../controllers/session_controller");

const SessionRouter = Router();

SessionRouter.all("/start-session-web", createSessionWeb);
SessionRouter.all("/start-session", createSession);
SessionRouter.all("/delete-session", deleteSession);
SessionRouter.all("/sessions", sessions);

module.exports = SessionRouter;

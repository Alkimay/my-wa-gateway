const express = require("express");
const router = express.Router();
const whatsappController = require("../controllers/session_controller"); // Adjust this path as necessary
const messageController = require('../controllers/message_controller');
const whatsapp = require("wa-multi-session");
// Render the control panel page
router.get("/", async (req, res, next) => {
    try {
        console.log("asdasd")
        const sessions = whatsapp.getAllSession(); // Get all connected sessions
        console.log(sessions); // Log the session data for debugging

        // Render the control panel with session data
        res.render("index2", { devices: sessions });
    } catch (error) {
        next(error);
    }
});


// Create a new session and show the QR code
router.post("/create", whatsappController.createSessionWeb);

// Delete a session
router.post("/delete", whatsappController.deleteSession);


// Existing routes

// Route to send message
router.post('/send-message', messageController.sendMessage);

// Route to delete session
router.post('/control/send-message-file', messageController.sendMessageFile);

module.exports = router;

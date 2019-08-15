const express = require("express");
const authMiddleware = require("../middlewares/auth");

const router = express.Router();

router.use(authMiddleware);

router.get("/", (request, response) => {
  response.send({ success: true, user: request.userId });
});

module.exports = app => app.use("/projects", router);

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mailer = require("../../modules/mailer");

const authConfig = require("../../config/auth");

const User = require("../models/user");

const router = express.Router();

function generateToken(params = {}) {
  return jwt.sign(params, authConfig.secret, { expiresIn: 86400 });
}

router.post("/register", async (request, response) => {
  const { email } = request.body;

  try {
    if (await User.findOne({ email }))
      return response.status(400).send({ error: "User alredy exists" });

    // Pass values to MongoDB
    const user = await User.create(request.body);

    user.password = undefined;

    return response.send({
      user,
      token: generateToken({ id: user.id })
    });
  } catch (err) {
    return response.status(400).send({ error: "Registration failed" });
  }
});

router.post("/authenticate", async (request, response) => {
  const { email, password } = request.body;
  const user = await User.findOne({ email }).select("+password");

  if (!user) return response.status(400).send({ error: "User not found" });

  if (!(await bcrypt.compare(password, user.password)))
    return response.status(400).send({ error: "Invalid password" });

  user.password = undefined;

  response.send({ user, token: generateToken({ id: user.id }) });
});

router.post("/forgot_password", async (request, response) => {
  const { email } = request.body;

  try {
    const user = await User.findOne({ email });

    if (!user) return response.status(400).send({ error: "User not found" });

    const token = crypto.randomBytes(20).toString("hex");

    const now = new Date();
    now.setHours(now.getHours() + 1);

    await User.findByIdAndUpdate(user.id, {
      $set: {
        passwordResetToken: token,
        passwordResetExpires: now
      }
    });

    mailer.sendMail(
      {
        to: email,
        from: "admin@curso-nodejs.com",
        template: "auth/forgot_password",
        context: { token }
      },
      err => {
        if (err)
          return response
            .status(400)
            .send({ error: "Cannot send forgot password email" });

        return response.send();
      }
    );
  } catch (err) {
    response.status(400).send({ error: "Erro on forgot password, try again" });
  }
});

router.post("/reset_password", async (request, response) => {
  const { email, token, password } = request.body;

  try {
    const user = await User.findOne({ email }).select(
      "+passwordResetToken passwordResetExpires"
    );

    if (!user) return response.status(400).send({ error: "User not found" });

    if (token !== user.passwordResetToken)
      return response.status(400).send({ error: "Token invalid" });

    const now = new Date();

    if (now > user.passwordResetExpires)
      return response
        .status(400)
        .send({ error: "Token expired, generate a new one" });

    user.password = password;

    await user.save();

    response.send();
  } catch (err) {
    response.status(400).send({ error: "Cannot reset password, try again" });
  }
});

module.exports = app => app.use("/auth", router);

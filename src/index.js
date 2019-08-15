const express = require("express");
const bodyParser = require("body-parser");

const app = express();

// convert to JSON
app.use(bodyParser.json());
// decode params by URL
app.use(bodyParser.urlencoded({ extended: false }));

// pass "app" to all controllers
require("./app/controllers/index")(app);

app.listen(3000);

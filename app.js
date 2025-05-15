var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var profileRouter = require("./routes/profile");
var authRouter = require("./routes/auth");
var documentsRouter = require("./routes/documents");
var tokensRouter = require("./routes/tokens");

var app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/profile", profileRouter);
app.use("/auth", authRouter);
app.use("/documents", documentsRouter);
app.use("/tokens", tokensRouter);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use(function (err, req, res, next) {
  // Log the error
  console.error(err);

  // Set locals, only providing error in development
  const isDev = req.app.get("env") === "development";

  // Send the error response
  res.status(err.status || 500).json({
    error: isDev ? err.message : "Internal server error",
    stack: isDev ? err.stack : undefined,
  });
});

module.exports = app;

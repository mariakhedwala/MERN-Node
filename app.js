//entry file
const fs = require("fs");
const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");

const mongoose = require("mongoose");

const placesRoutes = require("./routes/places");
const usersRoutes = require("./routes/users");
const HttpError = require("./models/http-error");

const app = express();

app.use(bodyParser.json());

app.use("/uploads/images", express.static(path.join("uploads", "images"))); //static serving means you just return a file,dont execute it just return it

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE");
  next();
});

app.use("/api/places", placesRoutes); //=> /api/places/...

app.use("/api/users", usersRoutes);

app.use((req, res, next) => {
  //this middleware is only reached if we have some req which didn't get some res before
  const error = new HttpError("Could not find this route", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occurred!" });
});

mongoose
  .connect(
    "mongodb+srv://mariakhedwala:4OXsJ1acGjwmFU5A@cluster0.aduoemu.mongodb.net/mern?retryWrites=true&w=majority"
  ) //returns a promise as it is an async task
  .then(() => {
    app.listen(8000);
  })
  .catch((err) => {
    console.log(err);
  });
//mongo uname: mariakhedwala pwd:4OXsJ1acGjwmFU5A

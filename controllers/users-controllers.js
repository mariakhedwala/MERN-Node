const { validationResult } = require("express-validator");
const HttpError = require("../models/http-error");
const User = require("../models/user");

// const DUMMY_USERS = [
//   {
//     id: "u1",
//     name: "Maria shaikh",
//     email: "test@test.com",
//     password: "testers",
//   },
// ];

const getUsers = async (req, res, next) => {
  //   res.json({ users: DUMMY_USERS });
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError("Fetching user failed", 500);
    return next(error);
  }

  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(`Invalid data`, 422));
  }
  const { name, email, password } = req.body;

  //   const hasUser = DUMMY_USERS.find((u) => u.email === email);
  //   if (hasUser) {
  //     throw new HttpError("could not create user, user already exists", 422);
  //   }
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email }); //this is an async task, so in try catch
  } catch (err) {
    const error = new HttpError("Signing up failed", 500);
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError("User already exists, try loggin in", 422);
    return next(error);
  }

  //   const createdUser = {
  //     id: uuid.v4(),
  //     name,
  //     email,
  //     password,
  //   };

  const createdUser = new User({
    name,
    email,
    image: req.file.path,
    password,
    places: [],
  });

  //   DUMMY_USERS.push(createdUser);

  try {
    await createdUser.save(); //handles everything related to saving the data in db, returns a promise
  } catch (err) {
    const error = new HttpError("Creating user failed", 500);
    return next(error);
  }

  res.status(201).json({ user: createdUser.toObject({ getters: true }) });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  //   const identifiedUser = DUMMY_USERS.find((u) => u.email === email);
  //   if (!identifiedUser || identifiedUser.password !== password) {
  //     throw new HttpError("could not identify user, wrong credentials", 401);
  //   }

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email }); //this is an async task, so in try catch
  } catch (err) {
    const error = new HttpError("Loggin in failed", 500);
    return next(error);
  }

  if (!existingUser || existingUser.password !== password) {
    const error = new HttpError("Invalid creds, Login failed", 401);
    return next(error);
  }

  res.json({
    message: "Logged in",
    user: existingUser.toObject({ getters: true }),
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;

const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError("Could not create user, please try again", 500);
    return next(error);
  }

  const createdUser = new User({
    name,
    email,
    image: req.file.path,
    password: hashedPassword,
    places: [],
  });

  //   DUMMY_USERS.push(createdUser);

  try {
    await createdUser.save(); //handles everything related to saving the data in db, returns a promise
  } catch (err) {
    const error = new HttpError("Creating user failed", 500);
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      "supersecret_dont_share",
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Signup failed, try again later", 500);
    return next(error);
  }

  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
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
    const error = new HttpError("Login in failed, email not registered", 500);
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError("Invalid creds, Login failed", 403);
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError("Login in failed, check your credentials", 500);
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError("Login in failed, check your credentials", 403);
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      "supersecret_dont_share",
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Login failed, try again later", 500);
    return next(error);
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;

const fs = require("fs");
const { validationResult } = require("express-validator");
const uuid = require("uuid");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");

const Place = require("../models/place");
const User = require("../models/user");
const mongoose = require("mongoose");

// let DUMMY_PLACES = [
//   {
//     id: "p1",
//     title: "Empire state building",
//     description: "lorem Empire state building",
//     location: {
//       lat: 40.7484474,
//       lng: -73.98715116,
//     },
//     address: "abs sdoj sojaas, NY 10001",
//     creator: "u1",
//   },
// ];

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  //   const place = DUMMY_PLACES.find((p) => {
  //     return p.id === placeId;
  //   });
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError("something went wrong", 500);
    return next(error);
  }
  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided id",
      404
    );
    return next(error);
  }
  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  //   const places = DUMMY_PLACES.filter((p) => {
  //     return p.creator === userId;
  //   });

  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate("places"); //makes it easy to get access to documents stored in diff collections in mongodb
  } catch (err) {
    const error = new HttpError("Failed, try later", 500);
    return next(error);
  }

  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(
      new HttpError("Could not find a place for the provided user id", 404)
    );
  }
  res.json({
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(`Invalid data`, 422));
  }
  const { title, description, address, creator } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  //   const createdPlace = {
  //     id: uuid.v4(),
  //     title,
  //     description,
  //     location: coordinates,
  //     address,
  //     creator,
  //   };

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator,
  });

  //   DUMMY_PLACES.push(createdPlace); //unshift(createPlace)

  let user;
  try {
    user = await User.findById(creator);
  } catch (err) {
    const error = new HttpError("Creating place failed, try again later", 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError("could not find user for provided id", 500);
    return next(error);
  }

  console.log(user);

  try {
    // await createdPlace.save(); //handles everything related to saving the data in db, returns a promise
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace); //push is a mongoose method here //only adds the id
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError("Creating place failed", 500);
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(`Invalid data`, 422));
  }
  const { title, description } = req.body; //data part of req body
  const placeId = req.params.pid; //data part of params

  //   const updatedPlace = { ...DUMMY_PLACES.find((p) => p.id === placeId) }; //using spread operator to create a copy==creates a new obj and copies the old obj into the new one
  //   const placeIndex = DUMMY_PLACES.findIndex((p) => p.id === placeId);

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "something went wrong, could not update place",
      500
    );
    return next(error);
  }

  //const stores the address of the obj and not the obj itself
  place.title = title;
  place.description = description;

  //   DUMMY_PLACES[placeIndex] = updatedPlace;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError("something went wrong", 500);
    return next(error);
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  //   if (!DUMMY_PLACES.find((p) => p.id === placeId)) {
  //     throw new HttpError("could not find place", 404);
  //   }
  //   DUMMY_PLACES = DUMMY_PLACES.filter((p) => p.pid !== placeId);

  let place;
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    const error = new HttpError("something went wrong", 500);
    return next(error);
  }

  if (!place) {
    const error = new HttpError("could not find place", 404);
    return next(error);
  }

  const imagePath = place.image;

  try {
    // await place.deleteOne();
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.deleteOne({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError("Failed to delete", 500);
    return next(error);
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.status(200).json({ message: "Place Deleted!" });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;

const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const bcrypt = require("bcryptjs");

let mongoDBConnectionString = process.env.MONGO_URL;

let Schema = mongoose.Schema;

const rideSchema = new mongoose.Schema({
  driver: { type: String },
  driverStartLocation: { type: String },
  riders: [
    {
      riderID: { type: String },
      pickupLocation: { type: String },
    },
  ],
  dropoffLocation: { type: String },
  dateTime: { type: Date },
  chat: [
    {
      msgID: { type: String },
      content: { type: String },
      userID: { type: String },
    },
  ],
  status: {
    type: String,
    enum: ["Not_Started", "In_Progress", "Complete", "Cancelled"],
    default: "Not_Started",
  },
});

let Ride;

module.exports.connect = function () {
  return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(mongoDBConnectionString, {
      useUnifiedTopology: true,
    });

    db.on("error", (err) => {
      reject(err);
    });

    db.once("open", () => {
      Ride = db.model("rides", rideSchema);
      resolve();
    });
  });
};

module.exports.getRide = async (rideId = null) => {
  var rides;

  try {
    if (rideId) {
      rides = await Ride.findOne({ _id: rideId });
    } else {
      rides = await Ride.find();
    }

    console.log(rides);

    return rides;
  } catch (err) {
    console.log(`${err}`);
  }
};

module.exports.registerRide = function (rideData) {
  return new Promise(function (resolve, reject) {
    let newRide = new Ride(rideData);
    newRide.save((err) => {
      if (err) {
        reject("There was an error creating the ride: " + err);
      } else {
        resolve("Ride belonging to " + rideData.driver + " was created.");
      }
    });
  });
};

module.exports.addRiderToRide = function (rideId, riderData) {
  return new Promise(function (resolve, reject) {
    Ride.findByIdAndUpdate(
      rideId,
      { $push: { riders: riderData } },
      { new: true },
      (err, updatedRide) => {
        if (err) {
          reject("There was an error adding the rider to the ride: " + err);
        } else {
          resolve("Rider successfully added to the ride");
        }
      }
    );
  });
};

module.exports.removeRiderFromRide = function (rideId, riderId) {
  return new Promise(function (resolve, reject) {
    Ride.findByIdAndUpdate(
      rideId,
      { $pull: { riders: { riderID: riderId } } },
      { new: true }
    )
      .then((ride) => {
        if (!ride) {
          reject("Ride not found");
        } else {
          resolve("Rider removed from the ride");
        }
      })
      .catch((err) => {
        reject("There was an error removing the rider: " + err);
      });
  });
};

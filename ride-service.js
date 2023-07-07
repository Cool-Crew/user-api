const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const bcrypt = require("bcryptjs");

let mongoDBConnectionString = process.env.MONGO_URL;

let Schema = mongoose.Schema;

const rideSchema = Schema({
  driver: { type: String },
  driverStartLocation: {
    address: { type: String },
    location: {},
    name: { type: String },
  },
  riders: [
    {
      _id: false,
      riderID: { type: String },
      pickupLocation: [
        {
          address: { type: String },
          location: {},
          name: { type: String },
        },
      ],
    },
  ],
  dropoffLocation: {
    address: { type: String },
    location: {},
    name: { type: String },
  },
  dateTime: { type: Date },
  chat: [
    {
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

module.exports.cancelRide = function (rideId) {
  return new Promise(function (resolve, reject) {
    Ride.findByIdAndUpdate(rideId, { status: "Cancelled" }, { new: true })
      .then((ride) => {
        if (!ride) {
          reject("Ride not found");
        } else {
          resolve("Ride has been cancelled");
        }
      })
      .catch((err) => {
        reject("There was an error cancelling the ride: " + err);
      });
  });
};

module.exports.addRiderToRide = function (rideId, riderData) {
  return new Promise(function (resolve, reject) {
    Ride.findByIdAndUpdate(
      rideId,
      { $push: { riders: { riderID: riderData } } },
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

module.exports.addDriverToRide = (rideId, driverData) => {
  return new Promise(function (resolve, reject) {
    Ride.findByIdAndUpdate(
      rideId,
      { driver: driverData },
      { new: true },
      (err, updatedRide) => {
        console.log(`updated ride is\n${JSON.stringify(updatedRide)}`);
        if (err) {
          reject(`There was an error updating the ride`);
        } else {
          resolve(`Driver successfully added to the ride`);
        }
      }
    );
  });
};

module.exports.rmDriverToRide = (rideId) => {
  return new Promise(function (resolve, reject) {
    Ride.findByIdAndUpdate(
      rideId,
      { driver: null },
      { new: true },
      (err, updatedRide) => {
        console.log(`updated ride is\n${JSON.stringify(updatedRide)}`);
        if (err) {
          reject(`There was an error updating the ride`);
        } else {
          resolve(`Driver successfully added to the ride`);
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

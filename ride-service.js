const { getUsernames } = require("./user-service");
const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const bcrypt = require("bcryptjs");

let mongoDBConnectionString = process.env.MONGO_URL;

let Schema = mongoose.Schema;

const rideSchema = Schema({
  driver: { type: String },
  creator: { type: String },
  driverStartLocation: {
    address: { type: String },
    location: {},
    name: { type: String },
  },
  riders: [
    {
      _id: false,
      riderID: { type: String },
      pickupLocation: {
        address: { type: String },
        location: {},
        name: { type: String },
      },
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
  feedback: [
    {
      riderId: { type: String },
      rating: { type: Number },
      feedback: { type: String },
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

module.exports.getRidesOfUser = async (riderId) => {
  try {
    const rides = await Ride.find(
      {
        $or: [{ "riders.riderID": riderId }, { driver: riderId }],
      },
      {
        _id: 1,
        dropoffLocation: 1,
        status: 1,
        dateTime: 1,
        driver: 1,
        riders: 1,
      }
    );

    if (rides.length > 0) {
      const rideList = await Promise.all(
        rides.map(async (ride) => {
          const { dropoffLocation, status, dateTime, riders, driver } = ride;
          const isDriverSameAsRider = driver === riderId;
          const retVal = {
            rideId: ride._id,
            dropoffLocation: dropoffLocation?.name || "",
            dateTime,
            status,
          };
          if (isDriverSameAsRider) {
            if (riders.length === 0) {
              return {
                riders: [],
                ...retVal,
              };
            } else {
              const riderIDs = riders.map((rider) => rider.riderID);
              const usernameList = await getUsernames(riderIDs);
              return {
                riders: riders.map((rider) => ({
                  riderId: usernameList[rider.riderID],
                  pickupLocation: rider.pickupLocation?.name || "",
                })),
                ...retVal,
              };
            }
          } else {
            const rider = riders?.find((r) => r.riderID === riderId);
            const pickupLocation = rider?.pickupLocation?.name || "";
            const driverName = driver
              ? await getUsernames([driver])
              : undefined;
            return {
              pickupLocation,
              driverName: driverName ? driverName[driver] : undefined,
              ...retVal,
            };
          }
        })
      );

      return rideList;
    } else {
      return [];
    }
  } catch (error) {
    throw error;
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

module.exports.updateRide = function (rideId, updatedData) {
  return new Promise(function (resolve, reject) {
    Ride.findByIdAndUpdate(rideId, updatedData, { new: true }, (err) => {
      if (err) {
        reject("There was an error updating the ride: " + err);
      } else {
        resolve("Ride " + rideId + " updated.");
      }
    });
  });
};

module.exports.cancelRide = function (rideId) {
  return new Promise(function (resolve, reject) {
    Ride.findById(rideId)
      .then((ride) => {
        if (!ride) {
          reject("Ride not found");
        } else {
          if (
            (ride.riders.length >= 1 && ride.driver == undefined) ||
            (ride.riders.length === 0 && ride.driver !== null)
          ) {
            ride.status = "Cancelled";
            return ride.save();
          } else {
            console.log("More than one rider is already here");
            reject("Ride cannot be cancelled");
          }
        }
      })
      .then(() => {
        resolve("Ride has been cancelled");
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
      {
        $push: {
          riders: {
            riderID: riderData.riderID,
            pickupLocation: {
              address: riderData.pickupLocation.address,
              location: riderData.pickupLocation.location,
              name: riderData.pickupLocation.name,
            },
          },
        },
      },
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

module.exports.addFeedbackToRide = (rideId, userId, rating, feedback) => {
  return new Promise(function (resolve, reject) {
    const feedbackData = {
      riderId: userId,
      rating: rating,
      feedback: feedback,
    };

    Ride.findByIdAndUpdate(
      rideId,
      { $push: { feedback: feedbackData } },
      { new: true }
    )
      .then((updatedRide) => {
        if (updatedRide) {
          resolve(updatedRide);
        } else {
          reject(new Error("Ride not found"));
        }
      })
      .catch((error) => {
        reject(error);
      });
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

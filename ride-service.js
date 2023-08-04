const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const bcrypt = require("bcryptjs");
const { getUsernames } = require("./user-service");

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
  riderClasses: [String],
  riderInterests: [String],
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
      category: { type: String },
    },
  ],
  status: {
    type: String,
    enum: [
      "Not_Started",
      "In_Progress",
      "Complete",
      "Cancelled",
      "Not_Completed",
    ],
    default: "Not_Started",
  },
  issue: {
    type: {
      description: { type: String },
      openedBy: { type: String },
      priority: { type: String },
      category: {
        type: String,
        enum: [
          "Driver_Behavior",
          "Vehicle_Condition",
          "Travel_Delay",
          "Technical_Issue",
          "Other",
        ],
        default: "Other",
      },
      issueDate: { type: Date },
      issueTime: { type: String },
      amPmOption: { type: String },
      affectedPassengers: { type: Boolean },
    },
    default: null,
  },
});

rideSchema.methods.updateStatus = function () {
  if (this.dateTime < new Date()) {
    this.status = "Not_Completed";
    return this.save();
  }
  return Promise.resolve();
};

let Ride;

module.exports.connect = function () {
  return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(mongoDBConnectionString, {
      useUnifiedTopology: true,
    });

    db.on("error", (err) => {
      reject(err);
    });

    db.once("open", async () => {
      Ride = db.model("rides", rideSchema);
      await updateRideStatuses();

      // Execute the code at regular intervals
      setInterval(async () => {
        await updateRideStatuses();
      }, 3600000);
      resolve();
    });
  });
};

async function updateRideStatuses() {
  try {
    const rides = await Ride.find({
      status: { $nin: ["Complete", "Cancelled", "Not_Completed"] },
    }).exec();

    for (const ride of rides) {
      await ride.updateStatus();
    }
  } catch (error) {
    console.error("Error updating ride statuses:", error);
  }
}

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
        feedback: 1,
        creator: 1,
      }
    );

    if (rides.length > 0) {
      const rideList = await Promise.all(
        rides.map(async (ride) => {
          const {
            dropoffLocation,
            status,
            dateTime,
            riders,
            driver,
            feedback,
            creator,
          } = ride;
          const item =
            feedback.length > 0
              ? feedback.find((item) => item.riderId === riderId)
              : undefined;
          const isDriverSameAsRider = driver === riderId;
          const retVal = {
            rideId: ride._id,
            dropoffLocation: dropoffLocation?.name || "",
            dateTime,
            status,
            rating: item?.rating || undefined,
            feedback: item?.feedback || undefined,
            feedbackCategory: item?.category || undefined,
            creator,
            driver,
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
    console.log(rideData);

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
            reject("Ride cannot be cancelled, Has more than 1 participants");
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

module.exports.changeRideStatus = function (rideId, status) {
  return new Promise(function (resolve, reject) {
    Ride.findById(rideId)
      .then((ride) => {
        if (!ride) {
          reject("Ride not found");
        } else {
          ride.status = status;
          return ride.save();
        }
      })
      .then(() => {
        resolve(`Ride has been marked as ${status}`);
      })
      .catch((err) => {
        reject("There was an error updating the ride: " + err);
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
              address: riderData.pickupLocation.puLocation.address,
              location: riderData.pickupLocation.puLocation.location,
              name: riderData.pickupLocation.puLocation.name,
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

module.exports.addIssueToRide = (rideId, issue) => {
  return new Promise(function (resolve, reject) {
    Ride.findByIdAndUpdate(rideId, { $push: { issue: issue } }, { new: true })
      .then((updatedRide) => {
        if (updatedRide) {
          resolve(updatedRide);
          console.log(
            "The issue data was pushed to issue object and ride was updated"
          );
          console.log(Ride);
        } else {
          reject(new Error("Ride not found"));
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
};

module.exports.addFeedbackToRide = (
  rideId,
  userId,
  rating,
  feedback,
  category
) => {
  return new Promise(function (resolve, reject) {
    const feedbackData = {
      riderId: userId,
      rating: rating,
      feedback: feedback,
      category: category,
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

module.exports.getAllFeedback = () => {
  return new Promise((resolve, reject) => {
    Ride.find()
      .exec()
      .then((rides) => {
        const userIds = [];
        const feedbackList = [];

        rides.forEach((ride) => {
          if (ride.driver) {
            userIds.push(ride.driver);
          }
          if (ride.creator) {
            userIds.push(ride.creator);
          }

          ride.feedback.forEach((fb) => {
            if (fb.riderId) {
              userIds.push(fb.riderId);
            }
            const rider = ride.riders.find(
              (rider) => rider.riderID === fb.riderId
            );
            const feedback = {
              rideId: ride._id,
              driver: ride.driver ? ride.driver : "No driver",
              creator: ride.creator ? ride.creator : "Unknown",
              rider: fb.riderId ? fb.riderId : "Unknown",
              rating: fb.rating,
              feedback: fb.feedback,
              category: fb.category,
              dateTime: ride.dateTime,
              dropoffLocation: ride.dropoffLocation.name,
              pickupLocation: rider ? rider.pickupLocation.name : "",
            };
            feedbackList.push(feedback);
          });
        });

        if (userIds.length > 0) {
          getUsernames(userIds)
            .then((usernames) => {
              feedbackList.forEach((feedback) => {
                if (feedback.rider && usernames[feedback.rider]) {
                  feedback.rider = usernames[feedback.rider];
                }
                if (feedback.driver && usernames[feedback.driver]) {
                  feedback.driver = usernames[feedback.driver];
                }
                if (feedback.creator && usernames[feedback.creator]) {
                  feedback.creator = usernames[feedback.creator];
                }
              });
              resolve(feedbackList);
            })
            .catch((error) => {
              reject(error);
            });
        } else {
          resolve(feedbackList);
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

module.exports.getRideDetails = function (rideId) {
  return new Promise(function (resolve, reject) {
    Ride.find({ "riders.rideId": rideId })
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

module.exports.updateRideDetails = function (rideId, interests, classes) {
  return new Promise(function (resolve, reject) {
    Ride.findByIdAndUpdate(
      rideId,
      {
        $addToSet: {
          riderInterests: { $each: interests },
          riderClasses: { $each: classes },
        },
      },
      { new: true },
      (err, updatedRide) => {
        if (err) {
          reject("There was an error updating the ride: " + err);
        } else {
          resolve("Interests and classes added to the ride.");
        }
      }
    );
  });
};

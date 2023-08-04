const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const bcrypt = require("bcryptjs");

let mongoDBConnectionString = process.env.MONGO_URL;

let Schema = mongoose.Schema;

let userSchema = new Schema({
  email: {
    type: String,
    unique: true,
  },
  username: {
    type: String,
    unique: true,
  },
  password: String,
  firstName: String,
  lastName: String,
  phone: {
    type: String,
    unique: true,
    sparse: true,
  },
  classes: [String],
  interests: [String],
  notifications: [
    {
      msg: { type: String },
      dateTime: { type: Date },
      category: {
        type: String,
        enum: ["Ride", "Account_Update", "General"],
        default: "General",
      },
    },
  ],
  isIssueReported: Boolean,
});

let User;

module.exports.connect = function () {
  return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(mongoDBConnectionString, {
      useUnifiedTopology: true,
    });

    db.on("error", (err) => {
      reject(err);
    });

    db.once("open", () => {
      User = db.model("users", userSchema);
      resolve();
    });
  });
};

// getting user interests and classes
module.exports.getUserMatchInfo = (userId) => {
  return new Promise((resolve, reject) => {
    User.findById(userId)
      .exec()
      .then((user) => {
        if (user) {
          resolve({
            id: user._id,
            classes: user.classes,
            interests: user.interests,
          });
        } else {
          reject("User not found");
        }
      })
      .catch((err) => {
        reject("Unable to find user");
      });
  });
};

module.exports.registerUser = function (userData) {
  return new Promise(function (resolve, reject) {
    bcrypt
      .hash(userData.password, 10)
      .then((hash) => {
        userData.password = hash;

        let newUser = new User(userData);
        console.log(userData);

        newUser.save((err) => {
          if (err) {
            if (err.code === 11000) {
              console.log("Error registering user:", err);
              reject("Email or username already registered");
            } else {
              reject("There was an error creating the user: " + err);
            }
          } else {
            resolve("User " + userData.email + " successfully registered");
          }
        });
      })
      .catch((err) => reject(err));
  });
};

module.exports.checkUser = function (userData) {
  return new Promise(function (resolve, reject) {
    User.findOne({ email: userData.email })
      .exec()
      .then((user) => {
        bcrypt.compare(userData.password, user.password).then((res) => {
          if (res === true) {
            resolve(user);
          } else {
            reject("Incorrect password for user " + userData.email);
          }
        });
      })
      .catch((err) => {
        reject("Unable to find user " + userData.email);
      });
  });
};

module.exports.getUserById = function (userId) {
  // console.log("user id =====>",userId)
  return new Promise(function (resolve, reject) {
    User.findById(userId)
      .exec()
      .then((user) => {
        if (user) {
          resolve(user);
        } else {
          reject("User not found");
        }
      })
      .catch((err) => {
        reject("Unable to find user");
      });
  });
};

module.exports.updateUser = function (userData) {
  console.log("Updating user with data:", userData);
  return new Promise(function (resolve, reject) {
    User.findOneAndUpdate({ email: userData.email }, userData, { new: true })
      .exec()
      .then((user) => {
        console.log("Updated user:", userData);
        resolve(user);
      })
      .catch((err) => {
        console.error("Error updating user:", err);
        reject("Unable to update user " + userData.email);
      });
  });
};

module.exports.addNotification = function (userId, notificationData) {
  return new Promise(function (resolve, reject) {
    User.findById(userId)
      .exec()
      .then((user) => {
        // Limit the number of notifications to, for example, 10
        const maxNotifications = 15;

        if (user.notifications.length >= maxNotifications) {
          // Remove the earliest notification to make space for the new one
          user.notifications.shift();
        }

        // Add the new notification
        user.notifications.push(notificationData);

        user.save((err) => {
          if (err) {
            reject("Unable to add notification");
          } else {
            resolve("Notification added successfully");
          }
        });
      })
      .catch((err) => {
        reject("Unable to find user");
      });
  });
};

module.exports.removeNotification = function (userId, notificationId) {
  return new Promise(function (resolve, reject) {
    User.findById(userId)
      .exec()
      .then((user) => {
        console.log(
          `Notification - ${notificationId} was requested to be removed.`
        );
        const notificationIndex = user.notifications.findIndex(
          (notification) => notification.msg === notificationId
        );
        console.log(notificationIndex);
        if (notificationIndex !== -1) {
          user.notifications.splice(notificationIndex, 1);

          user.save((err) => {
            if (err) {
              console.log("Unable to remove notification");
              reject("Unable to remove notification");
            } else {
              console.log("Notification removed successfully");
              resolve("Notification removed successfully");
            }
          });
        } else {
          console.log("Notification not found");
          reject("Notification not found");
        }
      })
      .catch((err) => {
        console.log("Unable to find user");
        reject("Unable to find user");
      });
  });
};

module.exports.clearNotifications = function (userId) {
  return new Promise(function (resolve, reject) {
    User.findById(userId)
      .exec()
      .then((user) => {
        user.notifications = [];
        user.save((err) => {
          if (err) {
            reject("Unable to clear notifications");
          } else {
            resolve("Notifications cleared successfully");
          }
        });
      })
      .catch((err) => {
        reject("Unable to find user");
      });
  });
};

module.exports.getUsernames = function (userIds) {
  return new Promise((resolve, reject) => {
    const query = { _id: { $in: userIds } };
    const projection = { _id: 1, username: 1 };

    User.find(query, projection)
      .exec()
      .then((users) => {
        const transformedData = users.reduce((obj, item) => {
          obj[item._id] = item.username;
          return obj;
        }, {});
        console.log(transformedData);
        resolve(transformedData);
      })
      .catch((err) => {
        reject("Unable to find users");
      });
  });
};

module.exports.getUsers = function (userId) {
  return new Promise(function (resolve, reject) {
    User.find()
      .exec()
      .then((user) => {
        if (user) {
          resolve(user);
        } else {
          reject("User not found");
        }
      })
      .catch((err) => {
        reject("Unable to find user");
      });
  });
};

// module.exports = User;

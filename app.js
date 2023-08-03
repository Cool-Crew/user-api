const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const passportJWT = require("passport-jwt");
const dotenv = require("dotenv");
const app = express();
dotenv.config();

const userService = require("./user-service.js");
const rideService = require("./ride-service.js");
const chatRoomService = require("./RoomService");
const messageService = require("./messageService");

var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;

// Configure its options
var jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");

jwtOptions.secretOrKey = process.env.JWT_SECRET;

var strategy = new JwtStrategy(jwtOptions, function (jwt_payload, next) {
  if (jwt_payload) {
    next(null, { _id: jwt_payload._id, email: jwt_payload.email });
  } else {
    next(null, false);
  }
});

passport.use(strategy);

app.use(passport.initialize());

app.use(express.json());
app.use(cors());

// API FOR MESSAGES
// app.use("/api/message", messageRoute);
// API ROUTE FOR CHATROOM
// app.use("/api/chat", chatRoute);
/* TODO Add Your Routes Here */
app.post("/api/register", (req, res) => {
  userService
    .registerUser(req.body)
    .then((msg) => {
      res.json({ message: msg });
    })
    .catch((msg) => {
      res.status(422).json({ message: msg });
    });
});

app.post(
  "/api/register-ride",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    rideService
      .registerRide(req.body)
      .then((msg) => {
        res.json({ message: msg });
      })
      .catch((msg) => {
        res.status(422).json({ message: msg });
      });
  }
);

app.post("/api/login", (req, res) => {
  userService
    .checkUser(req.body)
    .then((user) => {
      var payload = {
        _id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        classes: user.classes,
        interests: user.interests,
        notifications: user.notifications,
        isIssueReported: user.isIssueReported,
      };

      var token = jwt.sign(payload, jwtOptions.secretOrKey);
      //console.log(payload);
      res.json({ message: "login successful", token: token });
    })
    .catch((msg) => {
      res.status(422).json({ message: msg });
    });
});

app.put(
  "/api/update",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    console.log("Received update request with data:", req.body);
    userService
      .updateUser(req.body)
      .then((user) => {
        res.json({
          message: "User information updated successfully",
          user: user,
        });
      })
      .catch((err) => {
        console.error("Error updating user:", err);
        res.status(500).json({
          message: "An error occurred while updating user information",
        });
      });
  }
);

app.get(
  "/api/username/:userId",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const userId = req.params.userId;
    userService
      .getUsernames(userId)
      .then((usernames) => {
        res.json({ message: "usernames", _usernames: usernames });
      })
      .catch((err) => {
        res
          .status(500)
          .json({ message: `unable to retrieve usernames\n${err}` });
      });
  }
);

app.get(
  "/api/refresh-token",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const userId = req.user._id;
    userService
      .getUserById(userId)
      .then((user) => {
        var payload = {
          _id: user._id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          classes: user.classes,
          interests: user.interests,
          notifications: user.notifications,
          isIssueReported: user.isIssueReported,
        };
        var token = jwt.sign(payload, jwtOptions.secretOrKey);
        res.json({ message: "refreshed token", token: token });
        //console.log(payload);
      })
      .catch((err) => {
        console.error("Error retrieving user:", err);
        res
          .status(500)
          .json({ message: "An error occurred while refreshing the token" });
      });
  }
);

app.get(
  "/api/test",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.json({ message: "test success" });
  }
);

app.get(
  "/api/rides",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    rideService
      .getRide()
      .then((rides) => {
        res.json({ message: "rides", _rides: rides });
      })
      .catch((err) => {
        res.status(500).json({ message: `Unable to retrieve rides: ${err}` });
      });
  }
);

app.get(
  "/api/ridedetails/:rideId",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const rideId = req.params.rideId;
    rideService
      .getRide(rideId)
      .then((ride) => {
        res.json({ message: "ride details", _ride: ride });
      })
      .catch((err) => {
        res.status(500).json({ message: `unable to retreive rides\n${err}` });
      });
  }
);

app.get(
  "/api/userRides/:riderId",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const riderId = req.params.riderId.substring(1);
    rideService
      .getRidesOfUser(riderId)
      .then((rides) => {
        res.json({ message: "rides", _rides: rides });
      })
      .catch((err) => {
        res.status(500).json({ message: `unable to retreive rides\n${err}` });
      });
  }
);

app.get(
  "/api/users",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService
      .getUsers()
      .then((users) => {
        res.json({ message: "users", _users: users });
      })
      .catch((err) => {
        res.status(500).json({ message: `unable to retrieve users\n${err}` });
      });
  }
);
app.post(
  "/api/rides/:rideId/riders",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const rideId = req.params.rideId;
    const riderData = {
      riderID: req.body.newRider.riderID,
      pickupLocation: req.body.newRider.pickupLocation,
    };

    rideService
      .addRiderToRide(rideId, riderData)
      .then(() => {
        res.json({ message: "Rider added to the ride" });
      })
      .catch((err) => {
        res.status(422).json({ message: err });
      });
  }
);

app.post(
  "/api/rides/:rideId/driver",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    rideService
      .addDriverToRide(req.body?.ride, req.body?.newDriver)
      .then(() => {
        res.json({
          message: `Driver has been added to ride: ${req.body?.ride}`,
        });
      })
      .catch((err) => {
        res.status(422).json({ message: err });
      });
  }
);

//Cancelling ride
app.patch(
  "/api/rides/:rideId/cancel",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    rideService
      .cancelRide(req.params.rideId)
      .then((msg) => {
        res.json({ message: msg });
      })
      .catch((msg) => {
        res.status(422).json({ message: msg });
      });
  }
);

app.put(
  "/api/ride-update",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    // console.log("Received update request with data:", req.body);
    rideService
      .updateRide(req.body.rideId, req.body.updatedData)
      .then((updatedRide) => {
        res.json({
          message: updatedRide,
        });
      })
      .catch((err) => {
        console.error("Error updating ride:", err);
        res.status(500).json({
          message: "An error occurred while updating ride information",
        });
      });
  }
);

app.delete(
  "/api/rides/:rideId/driver",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    rideService
      .rmDriverToRide(req.params.rideId)
      .then(() => {
        res.json({
          message: `Driver has been removed from ride: ${req.body?.ride}`,
        });
      })
      .catch((err) => {
        res.status(422).json({ message: err });
      });
  }
);
app.put("/rides/:id", (req, res) => {
  const rideId = req.params.id;
  const updatedData = req.body;

  rideService
    .updateRide(rideId, updatedData)
    .then((updatedRide) => {
      res.json(updatedRide);
    })
    .catch((error) => {
      res.status(500).json({ error: "Failed to update ride: " + error });
    });
});

app.delete(
  "/api/rides/:rideId/riders/:riderId",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const rideId = req.params.rideId;
    const riderId = req.params.riderId;
    // console.log(req.params);

    rideService
      .removeRiderFromRide(rideId, riderId)
      .then((msg) => {
        res.json({ message: msg });
      })
      .catch((msg) => {
        res.status(422).json({ message: msg });
      });
  }
);

// Route to add interests and classes to the ride
app.post(
  "/api/rides/:rideId/details",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const rideId = req.params.rideId;
    const interests = req.body.interests || [];
    const classes = req.body.classes || [];

    rideService
      .updateRideDetails(rideId, interests, classes)
      .then(() => {
        res.json({
          message: "Interests and classes added to the ride successfully.",
        });
      })
      .catch((err) => {
        res.status(422).json({ message: err });
      });
  }
);

//Feedback Submission
app.post(
  "/api/addFeedback/:rideId",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const rideId = req.params.rideId;
    const riderId = req.body.riderId;
    const feedback = req.body.rideFeedback || "";
    const rating = req.body.rideRating;
    const category = req.body.feedbackCategory || "";
    rideService
      .addFeedbackToRide(rideId, riderId, rating, feedback, category)
      .then(() => {
        res.json({
          message: `Feedback has been added`,
        });
      })
      .catch((err) => {
        res.status(422).json({ message: err });
      });
  }
);

// Feedback List
app.get(
  "/api/feedbacks",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    rideService
      .getAllFeedback()
      .then((feedbacks) => {
        res.json({ message: "Feedbacks", _feedback: feedbacks });
      })
      .catch((err) => {
        res
          .status(500)
          .json({ message: `unable to retrieve feedbacks\n${err}` });
      });
  }
);

//Notifications

app.post(
  "/api/notifications/:userId",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const userId = req.params.userId;
    const notificationData = req.body;

    userService
      .addNotification(userId, notificationData)
      .then(() => {
        res.json({ message: "Notification added successfully" });
      })
      .catch((err) => {
        res.status(422).json({ message: err });
      });
  }
);

// To Remove Notification By ID
app.delete(
  "/api/notifications/:userId/:notificationId",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const userId = req.params.userId;
    const notificationId = req.params.notificationId;

    userService
      .removeNotification(userId, notificationId)
      .then(() => {
        res.json({ message: "Notification removed successfully" });
      })
      .catch((err) => {
        res.status(422).json({ message: err });
      });
  }
);

//To clear all the notifications
app.delete(
  "/api/notifications/:userId",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const userId = req.params.userId;

    userService
      .clearNotifications(userId)
      .then(() => {
        res.json({ message: "Notifications cleared successfully" });
      })
      .catch((err) => {
        res.status(500).json({ message: "Error clearing notifications" });
      });
  }
);

// Ride Completion
app.patch(
  "/api/rides/:rideId/markAsCompleted",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    rideService
      .completeRide(req.params.rideId)
      .then((msg) => {
        res.json({ message: msg });
      })
      .catch((msg) => {
        res.status(422).json({ message: msg });
      });
  }
);

app.post(
  "/api/room",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { userId, rideId } = req.body;
      // console.log(userId, rideId, "body   ===>", req.body);
      const isExist = await chatRoomService.isExists({ ride_id: rideId });
      let group;
      // console.log("ride exist", isExist);
      if (isExist?.members?.includes(userId)) {
        group = isExist;
        res.json({ message: "room ", _room: group });
      } else if (isExist) {
        group = await chatRoomService.update(rideId, userId);
        res.json({ message: "room ", _room: group });
      } else {
        group = await chatRoomService.create({
          ride_id: rideId,
          members: [userId],
        });
        // console.log("group else", group);
        // console.log(group);
        res.json({ message: "room ", _room: group });
      }
    } catch (error) {
      console.log("error ===>", error);
      res.json({ message: "room ", _err: error });
    }
  }
);

app.post(
  "/api/message",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { senderId, roomId, message } = req.body;
      console.log("msg R");
      const messages = await messageService.create({
        sender: senderId,
        room_id: roomId,
        content: message,
      });
      res
        .status(200)
        .send({ message: "send successfully", _messages: messages });
    } catch (error) {
      res.json({ message: "error ", _err: error });
    }
  }
);

app.get(
  "/api/message/:roomId",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const roomId = req.params.roomId;
      // console.log("body  message  ===>", roomId);
      const messages = await messageService.getMany({ room_id: roomId });
      const populatedMessages = await Promise.all(
        messages.map(async (message) => {
          // console.log("lopo ",message)
          const populatedMessage = await userService.getUserById(
            message?.sender
          );
          return {
            message: message.content,
            senderName: populatedMessage.username,
            senderId: populatedMessage._id,
            roomId: message.room_id,
            date: message.time,
          };
        })
      );
      // console.log("messages",populatedMessages)
      res
        .status(200)
        .send({ message: "message history", _messages: populatedMessages });
    } catch (error) {
      console.log(error);
      res.json({ message: "error ", _err: error });
    }
  }
);
app.post(
  "/api/room/detailByMembers",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { senderId, receiverId } = req.body;
      // console.log("body room details   ===>", req.body);
      const isRoomExists = await chatRoomService.isExists({
        $and: [
          { members: { $size: 2 } },
          {
            members: {
              $all: [senderId, receiverId],
              $nin: [null],
            },
          },
        ],
      });
      if (!isRoomExists) {
        const isRoomCreate = await chatRoomService.create({
          members: [senderId, receiverId],
        });
        res
          .status(200)
          .json({ message: "room created by  members", _room: isRoomCreate });
      } else {
        res.status(200).json({ message: "room details", _room: isRoomExists });
      }
    } catch (error) {
      console.log(error);
      res.json({ message: "error ", _err: error });
    }
  }
);

app.get(
  "/api/room/list",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      // console.log("body  message  ===>", roomId);
      const rooms = await chatRoomService.getMany();
      // console.log("messages",populatedMessages)
      res.status(200).send({ message: "room list", _room: rooms });
    } catch (error) {
      console.log(error);
      res.json({ message: "error ", _err: error });
    }
  }
);
Promise.all([
  userService.connect(),
  rideService.connect(),
  chatRoomService.connect(),
  messageService.connect(),
])
  .then(() => {
    console.log("user and ride service are connected");
  })
  .catch((err) => {
    console.log("unable for connect the service " + err);
  });


app.post(
  "/api/rides/:rideId/report-issue",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    console.log("We are in the correct function.")
    const rideId = req.params.rideId;
    const issue = {
      description: req.body.description || "",
      category: req.body.category || "Other",
      openedBy: req.body.openedBy,
      priority: req.body.priority,
      issueDate: req.body.issueDate,
      issueTime: req.body.issueTime,
      amPmOption: req.body.amPmOption,
      affectedPassengers: req.body.affectedPassengers
    };
    rideService
      .addIssueToRide(rideId, issue)
      .then(() => {
        res.json({
          message: `Issue has been reported for the ride`,
        });
        console.log(`The newly updated ride schema after issue addition: ${rideService}`)
      })
      .catch((err) => {
        res.status(422).json({ message: err });
      });
  }
);


module.exports = app;

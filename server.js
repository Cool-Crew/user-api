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

const HTTP_PORT = process.env.PORT || 8080;

var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;

// Configure its options
var jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");

jwtOptions.secretOrKey = process.env.JWT_SECRET;

var strategy = new JwtStrategy(jwtOptions, function (jwt_payload, next) {
  console.log("payload received", jwt_payload);

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
      };

      var token = jwt.sign(payload, jwtOptions.secretOrKey);

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
        };
        var token = jwt.sign(payload, jwtOptions.secretOrKey);
        res.json({ message: "refreshed token", token: token });
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

app.get("/api/rides", (req, res) => {
  rideService
    .getRide()
    .then((rides) => {
      res.json({ message: "rides", _rides: rides });
    })
    .catch((err) => {
      res.status(500).json({ message: `unable to retreive rides\n${err}` });
    });
});

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

app.delete(
  "/api/rides/:rideId/riders/:riderId",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const rideId = req.params.rideId;
    const riderId = req.params.riderId;
    console.log(req.params);

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

//Feedback Submission
app.post("/api/addFeedback/:rideId", (req, res) => {
  const rideId = req.params.rideId;
  const riderId = req.body.riderId;
  const feedback = req.body.rideFeedback || "";
  const rating = req.body.rideRating;
  rideService
    .addFeedbackToRide(rideId, riderId, rating, feedback)
    .then(() => {
      res.json({
        message: `Feedback has been added`,
      });
    })
    .catch((err) => {
      res.status(422).json({ message: err });
    });
});

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

Promise.all([userService.connect(), rideService.connect()])
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log("API listening on port: " + HTTP_PORT);
    });
  })
  .catch((err) => {
    console.log("Unable to start the server: " + err);
    process.exit(1);
  });

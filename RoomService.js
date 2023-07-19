const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

let mongoDBConnectionString = process.env.MONGO_URL;
const ChatRoomSchema = mongoose.Schema({
  ride_id: {
    type: String,
  },
  members: [
    {
      type: String,
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  time: {
    type: Date,
    default: new Date(),
  },
});
let chatRoom;
module.exports.connect = function () {
  return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(mongoDBConnectionString, {
      useUnifiedTopology: true,
    });

    db.on("error", (err) => {
      reject(err);
    });

    db.once("open", () => {
      chatRoom = db.model("chatRoom", ChatRoomSchema);
      resolve();
    });
  });
};

module.exports.create = async (createDto) => {
  const group = new chatRoom(createDto);
  return await group.save();
};

module.exports.isExists = async (findDto) => (await chatRoom.findOne(findDto)) || false;

module.exports.update = async (
  rideId,
  userId,
) => {
  try {
    console.log(rideId,userId)
    const updatedGroup = await chatRoom.findOneAndUpdate(
      { ride_id: rideId, members: { $ne: userId } },
      { $addToSet: { members: userId } },
    );
    console.log(updatedGroup);
    return updatedGroup;
  } catch (error) {
    throw Error("problem in update");
  }
};


module.exports.getMany = async (
  findDto,
  options = { population: [], select: [] }
) => {
  const room = await chatRoom.find(findDto, options.select)
    .populate(options.population || [])
    .exec();
  if (!room)
    throw new NotFoundError("messages not found", {
      time: new Date(),
      findDto,
    });
  console.log("message here", room);
  return room;
};
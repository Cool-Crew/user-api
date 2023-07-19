const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

let mongoDBConnectionString = process.env.MONGO_URL;
const MessageSchema = mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    require: true,
  },
  room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "chatRoom",
    require: true,
  },
  content: {
    type: String,
    require: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  time: {
    type: Date,
    default: new Date(),
  },
});

let Message;
module.exports.connect = function () {
  return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(mongoDBConnectionString, {
      useUnifiedTopology: true,
    });

    db.on("error", (err) => {
      reject(err);
    });

    db.once("open", () => {
      Message = db.model("message", MessageSchema);
      resolve();
    });
  });
};



module.exports.create = async (createDto) => {
  const message = new Message(createDto);
  return await message.save();
};

module.exports.getMany = async (
  findDto,
  options = { population: [], select: [] }
) => {
  const message = await Message.find(findDto, options.select)
    .populate(options.population || [])
    .exec();
  if (!message)
    throw new NotFoundError("messages not found", {
      time: new Date(),
      findDto,
    });
  // console.log("message here", message);
  return message;
};



// module.exports = Message;
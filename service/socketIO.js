const app = require("../app");
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const chatRoomService = require("../RoomService");
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"],
  },
});
const groupChats = {};
const singleChats = {};
io.on("connection", (socket) => {
  socket.on("joinGroupChat", (roomId) => {
    socket.join(roomId);

    // Add user to the group's connected users
    if (!groupChats[roomId]) {
      console.log("group chats ", groupChats);
      groupChats[roomId] = [socket.id];
    } else if (groupChats[roomId]) {
      if (!groupChats[roomId].includes(socket.id)) {
        groupChats[roomId] = [...groupChats[roomId], socket.id];
      }
    }

    console.log("socket group chat ", groupChats);
    // Notify other users in the group that a new user has joined
    socket.to(roomId).emit("userJoined", { userId: socket.id });
  });

  let a = 0;
  socket.on("groupChatMessage", (data) => {
    a = a + 1;
    console.log("group chat message ", a);
    const { message, senderName, senderId, roomId } = data;
    io.to(roomId).emit("incomingMessage", {
      message,
      senderName,
      senderName,
      senderId,

      roomId,
    });
  });

  // Leave Group Chat
  socket.on("leaveGroupChat", (roomId) => {
    socket.leave(roomId);

    // Remove user from the group's connected users
    const userGroupIds = Object.keys(groupChats).find(
      (key) => groupChats[key].includes(socket.id)
    );
    if (userGroupIds) {
      groupChats[userGroupIds]=groupChats[userGroupIds].filter((value) => value !== socket.id);;
      console.log(`User ${userGroupIds} disconnected`);
      console.log("update list ===>  ", groupChats);
      socket.to(userGroupIds).emit("userLeft", { userId: socket.id });
    }
  });

  // // start chat with single user
  socket.on("startChat", (userId) => {
    // Notify both the sender and receiver that the chat has started
    socket.emit("chatStarted", userId);
    if (!singleChats[userId]) {
      singleChats[userId] = socket.id;
    }
    console.log("chat rome ids ", singleChats);
    socket.to(singleChats[userId]).emit("chatStarted", singleChats[userId]);
    console.log("start chat ", singleChats[userId]);
  });

  socket.on("singleChatMessage", (data) => {
    const { message, senderName, senderId, receiverId, roomId } = data;
    console.log("single chat message ", data);
    console.log("start chat ", singleChats);
    io.to(singleChats[receiverId]).emit("incomingMessage", {
      message,
      senderName,
      senderId,
      roomId,
    });
    io.to(singleChats[senderId]).emit("incomingMessage", {
      message,
      senderName,
      senderId,
      roomId,
    });
  });

  socket.on("endChat", () => {
    const userId = Object.keys(singleChats).find(
      (key) => singleChats[key] === socket.id
    );
    if (userId) {
      delete singleChats[userId];
      console.log(`User ${userId} disconnected`);
      console.log("users in list ===>", singleChats);
    }
  });

  socket.on("disconnect", () => {
    // Remove user from any group chats they were connected to

    const userGroupIds = Object.keys(groupChats).find(
      (key) => groupChats[key].includes(socket.id)
    );
    if (userGroupIds) {
      groupChats[userGroupIds]=groupChats[userGroupIds].filter((value) => value !== socket.id);;
      console.log(`User ${userGroupIds} disconnected`);
      console.log("update group list ===>", groupChats);
      socket.to(userGroupIds).emit("userLeft", { userId: socket.id });
    }

    const userId = Object.keys(singleChats).find(
      (key) => singleChats[key] === socket.id
    );
    if (userId) {
      delete singleChats[userId];
      console.log(`User ${userId} disconnected`);
      console.log("users private chat list ===>", singleChats);
    }
  });
});



module.exports = {
  server,
};

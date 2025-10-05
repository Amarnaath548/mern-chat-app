import Message from "../models/message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const userId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: userId } }).select(
      "-password"
    );

    const unseenMessages = {};
    const promises = filteredUsers.map(async (user) => {
      const messages = await Message.find({
        senderId: user.Id,
        receiverId: userId,
        seen: false,
      });
      if (messages.length > 0) {
        unseenMessages[user._id] = messages.length;
      }
    });
    await Promise.all(promises);
    res.json({ success: true, users: filteredUsers, unseenMessages });
  } catch (error) {
    console.log(error.messages);
    res.json({ success: true, Message: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: selectUserId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
       { senderId: myId, receiverId: selectUserId }, 
        { senderId: selectUserId, receiverId: myId },
      ],
    });
    await Message.updateMany(
      { senderId: selectUserId, receiverId: myId },
      { seen: true }
    );
    res.json({ success: true, messages });
  } catch (error) {
    console.log(error.messages);
    res.json({ success: true, Message: error.message });
  }
};

export const markMessageAsSeen = async (req, res) => {
  try {
    const { id } = requestAnimationFrame.params;
    await Message.findByIdAndUodate(id, { seen: true });
    res.json({ success: true });
  } catch (error) {
    console.log(error.messages);
    res.json({ success: true, Message: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }
    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    const receiverSocketId = userSocketMap[receiverId];
    if(receiverSocketId){
      io.to(receiverSocketId).emit("newMessage",newMessage)
    }

    res.json({ success: true, newMessage });
  } catch (error) {
    console.log(error.messages);
    res.json({ success: true, Message: error.message });
  }
};

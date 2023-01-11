const express = require("express");
require("dotenv").config();
const app = express();
const server = require("http").createServer(app);
const cors = require("cors");
const io = require("socket.io")(server, {
  cors: {
    origin: "https://mern-chat-app-kwtb.onrender.com/",
    methods: ["GET", "POST"],
  },
});
const port = process.env.PORT || 5000;
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

const usersRouter = require("./routes/users");
const path = require("path");

mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.once("open", () => console.log("Connected to DB!"));

app.use(cors());
app.use(express.json());

app.post("/sendmail", (req, res) => {
  const { email } = req.body;
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MSG_MAIL,
        pass: process.env.MSG_PASSWORD,
      },
    });

    const mailOptions = {
      from: "chatinvite1@gmail.com",
      to: email,
      Subject: "Welcome to LETS CHAT !!",
      html: '<h1>HELLO WELCOME TO LETS CHAT ....<h1/><br/><h3>Lets chat in this fun chat app !! click below link !!</h3> <br/> <a href="https://lets-chat2.netlify.app ">lets chat app link</a>',
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        res.send("Email Sent Successfully");
      }
    });
  } catch (error) {
    res.status(201).json({ status: 201, info });
  }
});

app.use("/api/users", usersRouter);

let users = {};
io.on("connection", (socket) => {
  console.log("Hello from the Server! Socket ID: " + socket.id);

  socket.on("userJoin", (username) => {
    users[socket.id] = username;
    socket.join(username);
    socket.join("General Chat");
    console.log("User Object after connection: ", users);
    io.emit("userList", [...new Set(Object.values(users))]);
  });

  socket.on("newMessage", (newMessage) => {
    io.to(newMessage.room).emit("newMessage", {
      name: newMessage.name,
      msg: newMessage.msg,
      isPrivate: newMessage.isPrivate,
    });
  });

  socket.on("roomEntered", ({ oldRoom, newRoom }) => {
    socket.leave(oldRoom);
    io.to(oldRoom).emit("newMessage", {
      name: "NEWS",
      msg: `${users[socket.id]} just left "${oldRoom}"`,
    });
    io.to(newRoom).emit("newMessage", {
      name: "NEWS",
      msg: `${users[socket.id]} just joined "${newRoom}"`,
    });
    socket.join(newRoom);
  });

  socket.on("disconnect", () => {
    //io.emit("newMessage", {name: "NEWS", msg: `${users[socket.id]} totally left the chat`})
    delete users[socket.id];
    io.emit("userList", [...new Set(Object.values(users))]);
    console.log("Users after disconnection: ", users);
  });
});

app.use(express.static(path.join(__dirname, "../frontend/build")));
app.get("*", (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend/build/index.html"))
);

server.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

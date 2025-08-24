import express from "express";
import mongoose from "mongoose";
import "dotenv/config";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import cors from "cors";
import multer from 'multer';
import admin from "firebase-admin";
import { v2 as cloudinary } from "cloudinary";
import serviceAccountKey from "./blogio-42f85-firebase-adminsdk-fbsvc-aa9314159d.json" with { type: "json" };

import { getAuth } from "firebase-admin/auth";

import User from "./Schema/User.js";
import blogRouter from "./Routers/blog.router.js";
import usersRouter from "./Routers/user.router.js";


const server = express();
let PORT = 5000;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup (for handling multipart/form-data)
const storageMulter = multer.memoryStorage();
const uploadMulter = multer({ storageMulter });

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
});

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

server.use(express.json());
server.use(cors());



mongoose
  .connect(process.env.DB_LOCATION, {
    autoIndex: true,
  })
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((err) => {
    console.error("❌ Failed Database connection error:", err);
    throw err;
  });




server.post("/upload-file-cloud", uploadMulter.single("file"), async (req, res) => {
  try {
    // Convert buffer to base64
    const fileStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(fileStr, {
      folder: "mern_uploads", // optional folder in Cloudinary
    });

    res.status(200).json({
      url: result.secure_url, // ✅ public file URL
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Upload failed" });
  }
});



const formatDatatoSend = (user) => {
  const access_token = jwt.sign(
    { id: user._id },
    process.env.SECRET_ACCESS_KEY
  );
  return {
    access_token,
    profile_img: user.personal_info.profile_img,
    username: user.personal_info.username,
    fullname: user.personal_info.fullname,
  };
};

const generateUsername = async (email) => {
  let username = email.split("@")[0];

  let isUsernameNotUnique = await User.exists({
    "personal_info.username": username,
  }).then((result) => result);

  isUsernameNotUnique ? (username += nanoid().substring(0, 5)) : "";

  return username;
};






//-------------------------sign in , sign up---------------------


server.post("/signup", (req, res) => {
  let { fullname, email, password } = req.body;

  if (!fullname || fullname.length < 3) {
    return res.status(403).json({ error: "Fullname must be of 3 letter long" });
  }
  if (!email.length) {
    return res.status(403).json({ error: "Enter email" });
  }
  if (!emailRegex.test(email)) {
    return res.status(403).json({ error: "Email is invalid" });
  }

  if (!passwordRegex.test(password)) {
    return res
      .status(403)
      .json({ error: "Password is invalid(6 to 20, one upper, one number)" });
  }

  bcrypt.hash(password, 10, async (err, hashed_password) => {
    let username = await generateUsername(email);

    let user = new User({
      personal_info: { fullname, email, password: hashed_password, username },
    });

    user
      .save()
      .then((u) => {
        return res.status(200).json(formatDatatoSend(u));
      })

      .catch((err) => {
        if (err.code == 11000) {
          return res.status(400).json({ error: "Email already exists." });
        }
        return res.status(500).json({ error: err.message });
      });
  });
});


server.post("/signin", (req, res) => {
  let { email, password } = req.body;

  User.findOne({ "personal_info.email": email })
    .then((user) => {
      if (!user) return res.status(403).json({ error: "email not found" });

      if (!user.google_auth) {
        bcrypt.compare(password, user.personal_info.password, (err, result) => {
          if (err) {
            return res
              .status(403)
              .json({ error: "Error occured while log in please try again" });
          }

          if (!result) {
            return res.status(403).json({ error: "Incorrect password" });
          } else {
            return res.status(200).json(formatDatatoSend(user));
          }
        });
      } else {
        return res
          .status(403)
          .json({
            error:
              "Account is already created via google. Try loging with google.",
          });
      }
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/google-auth", async (req, res) => {
  let { idToken } = req.body;

  console.log(idToken)

  getAuth()
    .verifyIdToken(idToken)
    .then(async (decodedUser) => {
      let { email, name, picture } = decodedUser;

      picture = picture.replace("s96-c", "s384-c");

      let user = await User.findOne({ "personal_info.email": email })
        .select(
          "personal_info.fullname personal_info.username personal_info.profile_img google_auth"
        )
        .then((u) => {
          return u || null;
        })
        .catch((err) => {
          return res.status(500).json({ error: err.message });
        });

      if (user) {
        //login
        if (!user.google_auth) {
          return res
            .status(403)
            .json({
              error:
                "This email was signed up without google. Please log in with password to access the account",
            });
        }
      } else {
        //sign up with google, first time

        let username = await generateUsername(email);

        user = new User({
          personal_info: {
            fullname: name,
            email,
            // profile_img: picture,
            username,
          },
          google_auth: true,
        });

        await user
          .save()
          .then((u) => {
            user = u;
          })
          .catch((err) => {
            return res.status(500).json({ error: err.message });
          });
      }

      return res.status(200).json(formatDatatoSend(user));
    })
    .catch((err) => {
      return res
        .status(500)
        .json({
          error:
            "Failed to authenticate you with google. Try another google account.",
        });
    });
});

server.use("", blogRouter);
server.use("", usersRouter);

server.listen(PORT, () => {
  console.log("listening on port -> " + PORT);
});

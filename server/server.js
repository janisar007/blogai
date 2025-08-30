import express from "express";
import mongoose from "mongoose";
import "dotenv/config";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import cors from "cors";
import multer from "multer";
import admin from "firebase-admin";
import { v2 as cloudinary } from "cloudinary";

import { getAuth } from "firebase-admin/auth";

import User from "./Schema/User.js";
import blogRouter from "./Routers/blog.router.js";
import usersRouter from "./Routers/user.router.js";
import notificationRouter from "./Routers/notification.router.js";
import seoRouter from "./Routers/seo.router.js";
import { verifyJWT } from "./Middlewares/verifyJWT.middleware.js";
import blogModel from "./Schema/blog.model.js";

const server = express();
let PORT = 5000;

//For bots ->
server.get("/blog/:id", async (req, res, next) => {
  const userAgent = req.headers["user-agent"] || "";

  // List of popular crawler bots
  const botPattern =
    /(googlebot|bingbot|linkedinbot|twitterbot|facebookexternalhit|slackbot|discordbot|whatsapp|telegrambot|applebot|yandex|baiduspider|duckduckbot|semrushbot)/i;

  if (botPattern.test(userAgent)) {
    try {
      // Fetch pre-rendered HTML from DB
      const blog = await blogModel.findOne({ blog_id: req.params.id });
      if (!blog) return res.status(404).send("Not found");

      res.setHeader("Content-Type", "text/html");
      return res.send(blog.staticHTML);
    } catch (err) {
      console.error("Bot fetch error:", err);
      return res.status(500).send("Server error");
    }
  }

  // Normal user/browser → let React handle
  next();
}); 

// Robots.txt
server.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`
User-agent: *
Allow: /

Sitemap: https://blogai-rose.vercel.app/sitemap.xml
`);
});

// Sitemap.xml
server.get("/sitemap.xml", async (req, res) => {
  const blogs = await blogModel.find({ draft: false }).lean();
  const urls = blogs
    .map(
      (b) => `
  <url>
    <loc>https://blogai-rose.vercel.app/blog/${b.blog_id}</loc>
    <lastmod>${b.publishedAt.toISOString()}</lastmod>
  </url>`
    )
    .join("");
  res.type("application/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup (for handling multipart/form-data)
const storageMulter = multer.memoryStorage();
const uploadMulter = multer({ storageMulter });

admin.initializeApp({
  credential: admin.credential.cert({
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CRET_URL,
    universe_domain: "googleapis.com",
  }),
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

server.post(
  "/upload-file-cloud",
  uploadMulter.single("file"),
  async (req, res) => {
    try {
      // Convert buffer to base64
      const fileStr = `data:${
        req.file.mimetype
      };base64,${req.file.buffer.toString("base64")}`;

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
  }
);

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
        return res.status(403).json({
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
          return res.status(403).json({
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
      return res.status(500).json({
        error:
          "Failed to authenticate you with google. Try another google account.",
      });
    });
});

server.post("/change-password", verifyJWT, (req, res) => {
  let { currentPassword, newPassword } = req.body;

  // Password validation
  if (
    !passwordRegex.test(currentPassword) ||
    !passwordRegex.test(newPassword)
  ) {
    return res.status(403).json({
      error:
        "Password should be 6 to 12 characters long with at least 1 number, 1 lowercase, and 1 uppercase letter",
    });
  }

  // Find user
  User.findOne({ _id: req.user })
    .then((user) => {
      if (user.google_auth) {
        return res.status(403).json({
          error:
            "You cannot change the password because you logged in through Google!",
        });
      }

      // Compare current password
      bcrypt.compare(
        currentPassword,
        user.personal_info.password,
        (err, result) => {
          if (err) {
            return res.status(500).json({
              error:
                "Some error occurred while changing the password. Please try again later!",
            });
          }

          if (!result) {
            return res
              .status(403)
              .json({ error: "Incorrect current password!" });
          }

          // Hash new password
          bcrypt.hash(newPassword, 10, (err, hashed_password) => {
            if (err) {
              return res.status(500).json({
                error:
                  "Error while hashing the new password. Please try again later!",
              });
            }

            // Update password
            User.findOneAndUpdate(
              { _id: req.user },
              { "personal_info.password": hashed_password }
            )
              .then(() => {
                return res
                  .status(200)
                  .json({ status: "Password changed successfully!" });
              })
              .catch((err) => {
                return res.status(500).json({
                  error:
                    "Some error occurred while updating the new password. Try again later!",
                });
              });
          });
        }
      );
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/update-profile-img", verifyJWT, (req, res) => {
  let { url } = req.body;

  User.findOneAndUpdate(
    { _id: req.user },
    {
      "personal_info.profile_img": url,
    }
  )
    .then(() => {
      return res.status(200).json({ profile_img: url });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/update-profile", verifyJWT, (req, res) => {
  let { username, bio, social_links } = req.body;

  let bioLimit = 150;

  if (username.length < 3) {
    return res
      .status(403)
      .json({ error: "Username should be 3 character long!" });
  }

  if (bio.length > bioLimit) {
    return res
      .status(403)
      .json({ error: `Bio should not be more than ${bioLimit}` });
  }

  let socialLinksArr = Object.keys(social_links);

  try {
    for (let i = 0; i < socialLinksArr.length; i++) {
      if (social_links[socialLinksArr[i]].length) {
        let hostname = new URL(social_links[socialLinksArr[i]]).hostname;

        if (
          !hostname.includes(`${socialLinksArr[i]}.com`) &&
          socialLinksArr[i] != "website"
        ) {
          return res
            .status(403)
            .json({ error: `${socialLinksArr[i]} link is invalid.` });
        }
      }
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ error: "You must provide full links with http(s) included!" });
  }

  let updateObj = {
    "personal_info.username": username,
    "personal_info.bio": bio,
    social_links,
  };

  User.findOneAndUpdate({ _id: req.user }, updateObj, {
    runValidatores: true,
  })
    .then(() => {
      return res.status(200).json({ username });
    })
    .catch((err) => {
      console.log(err);
      if (err.code == 11000) {
        return res.status(409).json({ error: "username is already taken!" });
      }

      return res.status(500).json({ error: "Internal server error!  last" });
    });
});

server.use("", blogRouter);
server.use("", usersRouter);
server.use("", notificationRouter);
server.use("", seoRouter);

// server.listen(PORT, () => {
//   console.log("listening on port -> " + PORT);
// });

export default server;


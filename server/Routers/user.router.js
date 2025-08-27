import { Router } from "express";
import {  searchUsers, getProfile, userWrittenBlogs, userWrittenBlogsCount } from "../Controllers/user.controller.js";
import { verifyJWT } from "../Middlewares/verifyJWT.middleware.js";
const router = Router();


router.route("/search-users").post(searchUsers);
router.route("/get-profile").post(getProfile);

router.route("/user-written-blogs").post(verifyJWT, userWrittenBlogs);
router.route("/user-written-blogs-count").post(verifyJWT, userWrittenBlogsCount);



export default router;
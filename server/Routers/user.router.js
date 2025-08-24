import { Router } from "express";
import {  searchUsers, getProfile } from "../Controllers/user.controller.js";
import { verifyJWT } from "../Middlewares/verifyJWT.middleware.js";
const router = Router();


router.route("/search-users").post(searchUsers);
router.route("/get-profile").post(getProfile);

export default router;
import { Router } from "express";
import {  searchUsers } from "../Controllers/user.controller.js";
import { verifyJWT } from "../Middlewares/verifyJWT.middleware.js";
const router = Router();


router.route("/search-users").post(searchUsers);

export default router;
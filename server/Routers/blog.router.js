import { Router } from "express";
import { createBlog } from "../Controllers/blog.controller.js";
import { verifyJWT } from "../Middlewares/verifyJWT.middleware.js";
const router = Router();

router.route("/create-blog").post(verifyJWT, createBlog);

export default router;
import { Router } from "express";
import { createBlog, searchBlog, trendingBlog,  latestBlog } from "../Controllers/blog.controller.js";
import { verifyJWT } from "../Middlewares/verifyJWT.middleware.js";
const router = Router();

router.route("/latest-blogs").get(latestBlog);
router.route("/search-blogs").post(searchBlog);
router.route("/trending-blogs").get(trendingBlog);
router.route("/create-blog").post(verifyJWT, createBlog);

export default router;
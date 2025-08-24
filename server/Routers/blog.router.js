import { Router } from "express";
import { createBlog, searchBlog, trendingBlog,  latestBlog, allLatestBlogsCount, searchBlogCount } from "../Controllers/blog.controller.js";
import { verifyJWT } from "../Middlewares/verifyJWT.middleware.js";
const router = Router();

router.route("/latest-blogs").post(latestBlog);
router.route("/search-blogs").post(searchBlog);
router.route("/trending-blogs").get(trendingBlog);
router.route("/all-latest-blogs-count").post(allLatestBlogsCount);
router.route("/search-blogs-count").post(searchBlogCount);
router.route("/create-blog").post(verifyJWT, createBlog);

export default router;
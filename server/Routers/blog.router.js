import { Router } from "express";
import { createBlog, searchBlog, trendingBlog,  latestBlog, allLatestBlogsCount, searchBlogCount, getBlog, likeBlog, getLikedByUser, addComment, getBlogComments } from "../Controllers/blog.controller.js";
import { verifyJWT } from "../Middlewares/verifyJWT.middleware.js";
const router = Router();

router.route("/latest-blogs").post(latestBlog);
router.route("/search-blogs").post(searchBlog);
router.route("/trending-blogs").get(trendingBlog);
router.route("/all-latest-blogs-count").post(allLatestBlogsCount);
router.route("/search-blogs-count").post(searchBlogCount);
router.route("/create-blog").post(verifyJWT, createBlog);
router.route("/like-blog").post(verifyJWT, likeBlog);
router.route("/islike-by-user").post(verifyJWT, getLikedByUser);
router.route("/get-blog").post(getBlog);

//-------comments---------------
router.route("/add-comment").post(verifyJWT, addComment);
router.route("/get-blog-comments").post(getBlogComments);

export default router;
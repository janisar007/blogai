import { Router } from "express";
import {  getKeywords, improveBlogWithAI } from "../Controllers/seo.controller.js";
import { verifyJWT } from "../Middlewares/verifyJWT.middleware.js";
const router = Router();



router.post("/get-keywords", getKeywords);
router.post("/get-ai-data", improveBlogWithAI);


export default router;
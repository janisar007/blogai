import { Router } from "express";
import { newNotification, notifications, allNotificationsCount } from "../Controllers/notification.controller.js";
import { verifyJWT } from "../Middlewares/verifyJWT.middleware.js";
const router = Router();

router.route("/new-notification").get(verifyJWT, newNotification);
router.route("/notifications").post(verifyJWT, notifications);
router.route("/all-notifications-count").post(verifyJWT, allNotificationsCount);

export default router;
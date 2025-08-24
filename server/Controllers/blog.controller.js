import { nanoid } from "nanoid";
import blogModel from "../Schema/blog.model.js";
import User from "../Schema/User.js";

export const createBlog = async (req, res) => {
  try {
    let authorId = req.user;

    let { title, banner, content, tags, des, draft } = req.body;
    
    if (!title) {
      return res.status(403).json({ error: "You must provide title!" });
    }

    if (!draft) {
      if (!des || des.length > 200) {
        return res
          .status(403)
          .json({ error: "You must provide description under 200 character!" });
      }

      if (!banner) {
        return res.status(403).json({ error: "You must provide banner!" });
      }

      if (!content.blocks.length) {
        return res
          .status(403)
          .json({ error: "There must be some blog content!" });
      }

      if (!tags || tags.length > 10) {
        return res
          .status(403)
          .json({ error: "You must provide tags under 10 character!" });
      }
    }

    tags = tags.map((tag) => tag.toLowerCase());

    let blog_id =
      title
        .replace(/[^a-zA-Z0-9]/g, " ")
        .replace(/\s+/g, "-")
        .trim() + nanoid();

    let blog = new blogModel({
      title,
      des,
      banner,
      content,
      tags,
      author: authorId,
      blog_id,
      draft: Boolean(draft),
    });

    blog
      .save()
      .then((blog) => {
        let incrementVal = draft ? 0 : 1;

        User.findOneAndUpdate(
          { _id: authorId },
          {
            $inc: { "account_info.total_posts": incrementVal },
            $push: { blogs: blog._id },
          }
        )
          .then((user) => {
            return res.status(200).json({ id: blog.blog_id });
          })
          .catch((err) => {
            res
              .status(500)
              .json({ error: "Failed to update total posts number" });
          });
      })
      .catch((err) => {
        return res.status(500).json({ error: err.message });
      });
  } catch (error) {
    return res.status(500).json({ erro: "Internal server error" });
  }
};

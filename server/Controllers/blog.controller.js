import { nanoid } from "nanoid";
import blogModel from "../Schema/blog.model.js";
import User from "../Schema/User.js";

export const createBlog = async (req, res) => {
  try {
    let authorId = req.user;

    let { title, banner, content, tags, des, draft, id } = req.body;

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
      id ||
      title
        .replace(/[^a-zA-Z0-9]/g, " ")
        .replace(/\s+/g, "-")
        .trim() + nanoid();

    if (id) {

        blogModel.findOneAndUpdate({blog_id}, {title, des, banner, content, tags, draft : draft ? draft : false})
        .then(() => {
            return res.status(200).json({id: blog_id})
        })
        .catch(err => {
            return res.status(500).json({ error: "Failed to update total posts number" });

        })
    } else {
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
    }
  } catch (error) {
    return res.status(500).json({ erro: "Internal server error" });
  }
};

export const latestBlog = async (req, res) => {
  try {
    let { page } = req.body;
    let maxLimit = 5;

    blogModel
      .find({ draft: false })
      .populate(
        "author",
        "personal_info.profile_img personal_info.username personal_info.fullname -_id"
      )
      .sort({ publishedAt: -1 })
      .select("blog_id title des banner activity tags publishedAt -_id")
      .skip((page - 1) * maxLimit)
      .limit(maxLimit)
      .then((blogs) => {
        return res.status(200).json({ blogs });
      })
      .catch((err) => {
        return res.status(500).json({ error: err.message });
      });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const trendingBlog = async (req, res) => {
  try {
    blogModel
      .find({ draft: false })
      .populate(
        "author",
        "personal_info.profile_img personal_info.username personal_info.fullname -_id"
      )
      .sort({
        "activity.total_read": -1,
        "activity.total_likes": -1,
        publishedAt: -1,
      })
      .select("blog_id title publishedAt -_id")
      .limit(5)
      .then((blogs) => {
        return res.status(200).json({ blogs });
      })
      .catch((err) => {
        return res.status(500).json({ error: err.message });
      });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const searchBlog = (req, res) => {
  let { tag, query, page, author, limit, eliminate_blog } = req.body;

  let findQuery;

  if (tag) {
    findQuery = { tags: tag, draft: false, blog_id: { $ne: eliminate_blog } };
  } else if (query) {
    findQuery = { draft: false, title: new RegExp(query, "i") };
  } else if (author) {
    findQuery = { author, draft: false };
  }

  let maxLimit = limit ? limit : 5;

  blogModel
    .find(findQuery)
    .populate(
      "author",
      "personal_info.profile_img personal_info.username personal_info.fullname -_id"
    )
    .sort({ publishedAt: -1 })
    .select("blog_id title des banner activity tags publishedAt -_id")
    .skip((page - 1) * maxLimit)
    .limit(maxLimit)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
};

export const allLatestBlogsCount = (req, res) => {
  blogModel
    .countDocuments({ draft: false })
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.message });
    });
};

export const searchBlogCount = (req, res) => {
  let { tag, query, author } = req.body;

  let findQuery;

  if (tag) {
    findQuery = { tags: tag, draft: false };
  } else if (query) {
    findQuery = { draft: false, title: new RegExp(query, "i") };
  } else if (author) {
    findQuery = { author, draft: false };
  }

  blogModel
    .countDocuments(findQuery)
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.message });
    });
};

export const getBlog = (req, res) => {
  let { blog_id, draft, mode } = req.body;

  let incrementVal = mode != "edit" ? 1 : 0;

  blogModel
    .findOneAndUpdate(
      { blog_id },
      { $inc: { "activity.total_reads": incrementVal } }
    )
    .populate(
      "author",
      "personal_info.fullname personal_info.username personal_info.profile_img"
    )
    .select("title des content banner activity publishedAt blog_id tags")
    .then((blog) => {
      User.findOneAndUpdate(
        { "personal_info.username": blog.author.personal_info.username },
        {
          $inc: { "account_info.total_reads": incrementVal },
        }
      ).catch((err) => {
        console.log(err);
        return res.status(500).json({ error: err.message });
      });

      if (blog.draft && !draft) {
        return res
          .status(500)
          .json({ error: "You can not access draft blog!" });
      }

      return res.status(200).json({ blog });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.message });
    });
};

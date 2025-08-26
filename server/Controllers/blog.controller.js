import { nanoid } from "nanoid";
import blogModel from "../Schema/blog.model.js";
import User from "../Schema/User.js";
import Notification from "../Schema/Notification.js";
import Comment from "../Schema/Comment.js";

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
      blogModel
        .findOneAndUpdate(
          { blog_id },
          { title, des, banner, content, tags, draft: draft ? draft : false }
        )
        .then(() => {
          return res.status(200).json({ id: blog_id });
        })
        .catch((err) => {
          return res
            .status(500)
            .json({ error: "Failed to update total posts number" });
        });
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

export const likeBlog = (req, res) => {
  let user_id = req.user;

  let { _id, isLikedByUser } = req.body;

  let incrementVal = !isLikedByUser ? 1 : -1;

  blogModel
    .findOneAndUpdate(
      { _id },
      { $inc: { "activity.total_likes": incrementVal } }
    )
    .then((blog) => {
      if (!isLikedByUser) {
        let like = new Notification({
          type: "like",
          blog: _id,
          notification_for: blog.author,
          user: user_id,
        });

        like.save().then((notification) => {
          return res.status(200).json({ liked_by_user: true });
        });
      } else {
        Notification.findOneAndDelete({
          user: user_id,
          blog: _id,
          type: "like",
        })
          .then((data) => {
            return res.status(200).json({ liked_by_user: false });
          })
          .catch((err) => {
            console.log(err);
            return res.status(500).json({ error: err.message });
          });
      }
    });
};

export const getLikedByUser = (req, res) => {
  let user_id = req.user;
  let { _id } = req.body;

  Notification.exists({ user: user_id, type: "like", blog: _id })
    .then((result) => {
      return res.status(200).json({ result });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.message });
    });
};

//------------------Comments----------------------

export const addComment = async (req, res) => {
  let user_id = req.user;

  let { _id, comment, blog_author, replying_to } = req.body;

  if (!comment.length) {
    return res
      .status(403)
      .json({ error: "Write something to leave a comment!" });
  }

  let commentObj = {
    blog_id: _id,
    blog_author,
    comment,
    commented_by: user_id,
  };

  if (replying_to) {
    commentObj.parent = replying_to;
    commentObj.isReply = true;
  }

  new Comment(commentObj)
    .save()
    .then(async (commentFile) => {
      let { comment, commentedAt, children } = commentFile;

      blogModel
        .findOneAndUpdate(
          { _id },
          {
            $push: { comments: commentFile._id },
            $inc: {
              "activity.total_comments": replying_to ? 0 : 1,
              "activity.total_parent_comments": 1,
            },
          }
        )
        .then((blog) => {
          console.log("New comment created!");
        });

      let notificationObj = {
        type: replying_to ? "reply" : "comment",
        blog: _id,
        notification_for: blog_author,
        user: user_id,
        comment: commentFile._id,
      };

      if (replying_to) {
        notificationObj.replied_on_comment = replying_to;

        await Comment.findOneAndUpdate(
          { _id: replying_to },
          { $push: { children: commentFile._id } }
        ).then((replyingToCommentDoc) => {
          notificationObj.notification_for = replyingToCommentDoc.commented_by;
        });
      }

      new Notification(notificationObj).save().then((data) => {
        console.log("New notification created!");
      });

      return res.status(200).json({
        comment,
        commentedAt,
        _id: commentFile._id,
        user_id,
        children,
      });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.message });
    });
};

export const getBlogComments = (req, res) => {
  let { blog_id, skip } = req.body;

  let maxLimit = 5;

  Comment.find({ blog_id, isReply: false })
    .populate(
      "commented_by",
      "personal_info.username personal_info.fullname personal_info.profile_img"
    )
    .skip(skip)
    .limit(maxLimit)
    .sort({
      commentedAt: -1,
    })
    .then((comment) => {
      return res.status(200).json(comment);
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
};

export const getReplies = (req, res) => {
  let { _id, skip } = req.body;

  let maxLimit = 5;

  Comment.findOne({ _id })
    .populate({
      path: "children",
      options: {
        limit: maxLimit,
        skip: skip,
        sort: { commentedAt: -1 },
      },
      populate: {
        path: "commented_by",
        select:
          "personal_info.profile_img personal_info.fullname personal_info.username",
      },
      select: "-blog_id -updatedAt",
    })
    .select("children")
    .then((doc) => {
      return res.status(200).json({ replies: doc.children });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
};

const deleteCommentsFunction = (_id) => {
  Comment.findOneAndDelete({ _id })
    .then((comment) => {
      if (comment.parent) {
        Comment.findOneAndUpdate(
          { _id: comment.parent },
          { $pull: { children: _id } }
        )
          .then((data) => console.log("comment delete from parent"))
          .catch((err) => console.log(err));
      }

      Notification.findOneAndDelete({ comment: _id }).then((notification) =>
        console.log("comment notification deleted")
      );

      Notification.findOneAndDelete({ reply: _id }).then((notification) =>
        console.log("reply notification deleted")
      );

      blogModel
        .findOneAndUpdate(
          { _id: comment.blog_id },
          {
            $pull: { comments: _id },
            $inc: { "activity.total_comments": -1 },
            $inc: { "activity.total_parent_comments": -1 },
          }
        )
        .then((blog) => {
          if (comment.children.length) {
            comment.children.map((replies) => {
              deleteCommentsFunction(replies);
            });
          }
        });
    })
    .catch((err) => {
      console.log(err.message);
    });
};
export const deleteComment = (req, res) => {
  let user_id = req.user;

  let { _id } = req.body;

  Comment.findOne({ _id }).then((comment) => {
    if (user_id == comment.commented_by || user_id == comment.blog_author) {
      deleteCommentsFunction(_id);

      return res.status(200).json({ status: "done" });
    } else {
      return res
        .status(403)
        .json({ error: "You can not delete this comment!" });
    }
  });
};

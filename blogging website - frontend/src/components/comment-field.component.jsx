import React from "react";
import { useContext } from "react";
import { useState } from "react";
import { UserContext } from "../App";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import { BlogContext } from "../pages/blog.page";

const CommentField = ({
  action,
  index = undefined,
  replyingTo = undefined,
  setReplying,
}) => {
  const [comment, setComment] = useState("");

  let {
    userAuth: { access_token, username, profile_img, fullname },
  } = useContext(UserContext);

  let {
    blog,
    blog: {
      _id,
      author: { _id: blog_author },
      activity,
      activity: { total_comments, total_parent_comments },
      comments,
      comments: { results: commentsArr },
    },
    setBlog,
    totalParentCommentLoaded,
    setTotalParentCommentLoaded,
  } = useContext(BlogContext);

  const handleComment = () => {
    if (!access_token) {
      return toast.error("Login first to leave a comment!");
    }

    if (!comment.length) {
      return toast.error("Write something to leave a comment!");
    }

    axios
      .post(
        import.meta.env.VITE_SERVER_DOMAIN + "/add-comment",
        {
          _id,
          blog_author,
          comment,
          replying_to: replyingTo,
        },
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
      .then(({ data }) => {
        setComment("");

        data.commented_by = {
          personal_info: { username, profile_img, fullname },
        };

        let newCommentArr;

        if (replyingTo) {
          commentsArr[index].children.push(data._id);

          data.childrenLevel = commentsArr[index].childrenLevel + 1;
          data.parentIndex = index;

          commentsArr[index].isReplyLoaded = true;

          commentsArr.splice(index + 1, 0, data);

          newCommentArr = commentsArr;

          setReplying(false);
        } else {
          data.childrenLevel = 0; //parent commment;

          newCommentArr = [data, ...commentsArr];
        }

        let parentCommentIncrementVal = replyingTo ? 0 : 1;

        setBlog({
          ...blog,
          comments: { ...comments, results: newCommentArr },
          activity: {
            ...activity,
            total_comments: total_comments + 1,
            total_parent_comments:
              total_parent_comments + parentCommentIncrementVal,
          },
        });

        setTotalParentCommentLoaded((prev) => prev + parentCommentIncrementVal);
      })
      .catch((err) => {
        console.log(err);
      });
  };
  return (
    <>
      <Toaster />
      <textarea
        onChange={(e) => setComment(e.target.value)}
        value={comment}
        placeholder="Leave a comment..."
        className="input-box pl-5 placeholder:text-dark-grey resize-none h-[150px] overflow-auto"
      ></textarea>
      <button onClick={handleComment} className="btn-dark mt-5 px-10">
        {action}
      </button>
    </>
  );
};

export default CommentField;

//4.30.00 pe dekhna agar rely me koi problem aaye

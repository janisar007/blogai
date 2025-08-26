import React from "react";
import { getDay } from "../common/date";
import { useContext } from "react";
import { UserContext } from "../App";
import toast from "react-hot-toast";
import CommentField from "./comment-field.component";
import { useState } from "react";
import { BlogContext } from "../pages/blog.page";
import axios from "axios";

const CommentCard = ({ index, leftVal, commentData }) => {
  const [isReplying, setReplying] = useState(false);
  let {
    commented_by: {
      personal_info: { profile_img, fullname, username },
    },
    commentedAt,
    comment,
    _id,
    children,
  } = commentData;
  let {
    userAuth: { access_token },
  } = useContext(UserContext);

  let {
    blog,
    blog: {
      comments,
      comments: { results: commentsArr },
    },
    setBlog,
  } = useContext(BlogContext);

  const removeCommentsCard = (startingPoint) => {
    if (commentsArr[startingPoint]) {
      while (
        commentsArr[startingPoint].childrenLevel > commentData.childrenLevel
      ) {
        commentsArr.splice(startingPoint, 1);

        if (!commentsArr[startingPoint]) {
          break;
        }
      }
    }

    setBlog({ ...blog, comments: { results: commentsArr } });
  };

  const loadReplies = ({ skip = 0 }) => {
    if (children.length) {
      hideReplies();

      axios
        .post(import.meta.env.VITE_SERVER_DOMAIN + "/get-replies", {
          _id,
          skip,
        })
        .then(({ data: { replies } }) => {
          commentData.isReplyLoaded = true;
          for (let i = 0; i < replies.length; i++) {
            replies[i].childrenLevel = commentData.childrenLevel + 1;

            commentsArr.splice(index + 1 + i + skip, 0, replies[i]);
          }

          setBlog({ ...blog, comments: { ...comments, results: commentsArr } });
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };

  const hideReplies = () => {
    commentData.isReplyLoaded = false;
    removeCommentsCard(index + 1);
  };

  const handleReplyClick = () => {
    if (!access_token) {
      return toast.error("Login first to reply!");
    }

    setReplying((prev) => !prev);
  };

  return (
    <div className="w-full" style={{ paddingLeft: `${leftVal * 10}px` }}>
      <div className="my-5 p-6 rounded-md border border-grey">
        <div className="flex gap-3 items-center mb-8">
          <img src={profile_img} className="w-6 h-6 rounded-full" />

          <p className="line-clamp-1">
            {fullname} @{username}
          </p>
          <p className="min-w-fit">{getDay(commentedAt)}</p>
        </div>

        <p className="font-gelasio text-xl ml-3">{comment}</p>

        <div className="flex gap-5 items-center mt-5">
          {commentData.isReplyLoaded ? (
            <button
              onClick={hideReplies}
              className="text-dark-grey p-2 px-3 hover:bg-grey/30 rounded-md flex items-center gap-2"
            >
              <i className="fi fi-rs-comment-dots"></i>
              Hide Replies
            </button>
          ) : (
            <button
              className="text-dark-grey p-2 px-3 hover:bg-grey/30 rounded-md flex items-center gap-2"
              onClick={loadReplies}
            >
              <i className="fi fi-rs-comment-dots"></i>
              {children.length} Reply
            </button>
          )}
          <button className="underline " onClick={handleReplyClick}>
            Reply
          </button>
        </div>

        {isReplying ? (
          <div className="mt-8">
            <CommentField
              action={"reply"}
              index={index}
              replyingTo={_id}
              setReplying={setReplying}
            />
          </div>
        ) : (
          ""
        )}
      </div>
    </div>
  );
};

export default CommentCard;

import React, { useContext, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Toaster, toast } from "react-hot-toast";

import logo from "../imgs/logo.png";
import defaultBanner from "../imgs/blog banner.png";
import tightblogailogopng from "../imgs/tightblogailogopng.png";
import AnimationWrapper from "../common/page-animation";
import axios from "axios";
import EditorJS from "@editorjs/editorjs";
import { EditorContext } from "../pages/editor.pages";
import { tools } from "./tools.component";
import { UserContext } from "../App";

const BlogEditor = () => {
  let {
    blog,
    blog: { title, banner, content, tags, des },
    setBlog,
    textEditor,
    setTextEditor,
    setEditorState,
  } = useContext(EditorContext);

  let {blog_id} = useParams();

  let {
    userAuth: { access_token },
  } = useContext(UserContext);
  let navigate = useNavigate();

  useEffect(() => {
    if (!textEditor.isReady) {
      setTextEditor(
        new EditorJS({
          holder: "textEditor",
          data: Array.isArray(content) ? content[0] : content,
          tools: tools,
          placeholder: "Let's write your imagination",
        })
      );
    }
  }, []);

  const handleBannerUpload = async (e) => {
    try {
      let img = e.target.files[0];
      const formData = new FormData();
      formData.append("file", img);

      if (img) {
        let loadingToast = toast.loading("Uploading...");
        const res = await axios.post(
          `${import.meta.env.VITE_SERVER_DOMAIN}/upload-file-cloud`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        if (res?.data?.url) {
          toast.dismiss(loadingToast);
          toast.success("Uploaded Successfully!");

          setBlog({ ...blog, banner: res?.data?.url });
        }
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.keyCode == 13) {
      //enter key
      e.preventDefault();
    }
  };

  const handleTitleChange = (e) => {
    let input = e.target;

    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";

    setBlog({ ...blog, title: input.value });
  };

  const handleError = (e) => {
    let img = e.target;

    img.src = defaultBanner;
  };

  const handlePublishEvent = () => {
    if (!banner.length) {
      return toast.error("Upload a blog banner to publish it");
    }
    if (!title.length) {
      return toast.error("Write a blog title to publish it");
    }

    if (textEditor.isReady) {
      textEditor
        .save()
        .then((data) => {
          if (data.blocks.length) {
            setBlog({ ...blog, content: data });
            setEditorState("publish");
          } else {
            return toast.error("Write something in your blog to publish!");
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };

  const handleSaveDraft = (e) => {
    if (e.target.className.includes("disabled")) {
      return;
    }

    if (!title || !title.length) {
      return toast.error("Write blog title before saving as a draft");
    }

    let loadingToast = toast.loading("Saving Draft...");

    e.target.classList.add("disable");

    if (textEditor.isReady) {
      textEditor.save().then((content) => {
        let blogObj = {
          title,
          banner,
          des,
          content,
          tags,
          draft: true,
        };
        axios
          .post(import.meta.env.VITE_SERVER_DOMAIN + "/create-blog", {...blogObj, id:blog_id}, {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          })
          .then(() => {
            e.target.classList.remove("disable");
            toast.dismiss(loadingToast);
            toast.success("Saved 👍");

            setTimeout(() => {
              navigate("/");
            }, 500);
          })
          .catch(({ response }) => {
            e.target.classList.remove("disable");
            toast.dismiss(loadingToast);

            return toast.error(response.data.error);
          });
      });
    }
  };
  return (
    <>
      <nav className="navbar">
        <Link to="/" className="flex-none w-20">
          <img src={tightblogailogopng} />
        </Link>

        <p className="max-md:hidden text-black line-clamp-1 w-full">
          {title.length ? title : "New Blog"}
        </p>

        <div className="flex gap-4 ml-auto">
          <button className="btn-dark py-2" onClick={handlePublishEvent}>
            Publish
          </button>
          <button className="btn-light py-2" onClick={handleSaveDraft}>
            Save Draft
          </button>
        </div>
      </nav>
      <Toaster />

      <AnimationWrapper>
        <section>
          <div className="mx-auto max-w-[900px] w-full">
            <div className="relative aspect-video bg-whiteborder-2 border-grey hover:opacity-80">
              <label htmlFor="uploadBanner">
                <img src={banner} className="z-20" onError={handleError} />
                <input
                  id="uploadBanner"
                  type="file"
                  accept=".png, .jpg, .jpeg, .webp"
                  hidden
                  onChange={handleBannerUpload}
                />
              </label>
            </div>

            <textarea
              defaultValue={title}
              placeholder="Blog Title"
              className="text-4xl font-medium w-full h-20 outline-none resize-none mt-10 leading-tight placeholder:opacity-40"
              onKeyDown={handleTitleKeyDown}
              onChange={handleTitleChange}
            ></textarea>

            <hr className="w-full opacity-10 my-5" />

            <div id="textEditor" className="font-gelasio"></div>
          </div>
        </section>
      </AnimationWrapper>
    </>
  );
};

export default BlogEditor;

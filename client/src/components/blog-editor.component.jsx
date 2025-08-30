import React, { useContext, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Toaster, toast } from "react-hot-toast";

import defaultBanner from "../imgs/blog banner.png";
import defaultBannerDark from "../imgs/blog banner dark.png";
import tightblogailogopng from "../imgs/tightblogailogopng.png";
import AnimationWrapper from "../common/page-animation";
import axios from "axios";
import EditorJS from "@editorjs/editorjs";
import { EditorContext } from "../pages/editor.pages";
import { tools } from "./tools.component";
import { ThemeContext, UserContext } from "../App";
import KeywordSuggest from "./seo.component";
import { useState } from "react";

import suggestionlogopng from "../imgs/suggestion.png";

const BlogEditor = () => {
  const [seoWrapper, setSeoWrapper] = useState(false);

  let {
    blog,
    blog: { title, banner, content, tags, des },
    setBlog,
    textEditor,
    setTextEditor,
    setEditorState,
  } = useContext(EditorContext);
  let { theme } = useContext(ThemeContext);

  let { blog_id } = useParams();

  let {
    userAuth: { access_token },
  } = useContext(UserContext);
  let navigate = useNavigate();

  useEffect(() => {
    if (textEditor && textEditor?.configuration) {
      try {
        textEditor?.destroy();
      } catch (err) {
        console.error("Destroy error:", err);
      }
    }

    const editor = new EditorJS({
      holder: "textEditor",
      data: Array.isArray(content) ? content[0] : content,
      tools,
      placeholder: "Let's write your imagination",
    });

    setTextEditor(editor);

    // return () => {
    //   if (editor && editor?.destroy) {
    //     editor.destroy().catch((err) => console.error("Cleanup error:", err));
    //   }
    // };
  }, [content]);

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

    img.src = theme == "light" ? defaultBanner : defaultBannerDark;
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
          .post(
            import.meta.env.VITE_SERVER_DOMAIN + "/create-blog",
            { ...blogObj, id: blog_id },
            {
              headers: {
                Authorization: `Bearer ${access_token}`,
              },
            }
          )
          .then(() => {
            e.target.classList.remove("disable");
            toast.dismiss(loadingToast);
            toast.success("Saved 👍");

            setTimeout(() => {
              navigate("/dashboard/blogs?tab=draft");
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
          <img loading="lazy" src={tightblogailogopng} />
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
        {/* <div className="flex"> */}
        <section className="relative">
          <div className="mx-auto max-w-[900px] w-full">
            <div className="relative aspect-video bg-whiteborder-2 border-grey hover:opacity-80">
              <label htmlFor="uploadBanner">
                <img
                  loading="lazy"
                  src={banner}
                  className="z-20"
                  onError={handleError}
                />
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
              className={`text-4xl bg-white  font-medium w-full h-20 outline-none resize-none mt-10 leading-tight placeholder:opacity-40`}
              onKeyDown={handleTitleKeyDown}
              onChange={handleTitleChange}
            ></textarea>

            <hr className="w-full opacity-10 my-5" />

            <div id="textEditor" className="font-gelasio"></div>
          </div>

          {!seoWrapper ? (
            <button
              className="absolute right-4 top-0"
              onClick={() => setSeoWrapper((prev) => !prev)}
            >
              <img src={suggestionlogopng} className="w-8 h-8" />
            </button>
          ) : (
            <KeywordSuggest
              seoWrapper={seoWrapper}
              setSeoWrapper={setSeoWrapper}
            />
          )}
        </section>

        {/* </div> */}
      </AnimationWrapper>
    </>
  );
};

export default BlogEditor;

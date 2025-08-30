import React, { useContext, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import AnimationWrapper from "../common/page-animation";
import axios from "axios";
import EditorJS from "@editorjs/editorjs";
import { EditorContext } from "../pages/editor.pages";
import { tools } from "./tools.component";
import { ThemeContext, UserContext } from "../App";
import { useState } from "react";
import BlogContent from "./blog-content.component";
import turnLeftLogo from "../imgs/turn-left.png"
const GeminiResultViewer = ({ setSeoWrapper }) => {
  const [improvedBlog, setImprovedBlog] = useState([]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBlogDesChange = (e) => {
    let input = e.target;

    setDescription(input.value);
  };

  let {
    blog,
    blog: { title, banner, content, tags, des },
    setBlog,
    textEditor,
    setTextEditor,
    setEditorState,
  } = useContext(EditorContext);
  let { theme } = useContext(ThemeContext);

  console.log("Content:", content);
  console.log("improvedBlog:", improvedBlog);

  useEffect(() => {
    setImprovedBlog(content);
  }, [content]);

  const bringNewBlog = () => {
    setBlog({ ...blog, content: improvedBlog });
    setSeoWrapper((prev) => !prev);
  };

  let { blog_id } = useParams();

  let {
    userAuth: { access_token },
  } = useContext(UserContext);
  let navigate = useNavigate();

  const fetchAIData = async () => {
    if (!description || description.length < 0) {
      return toast.error("write your description first!");
    }
    setLoading(true);

    let loadingToast = toast.loading("Hold on!");
    try {
      const res = await axios.post(
        import.meta.env.VITE_SERVER_DOMAIN + "/get-ai-data",
        {
          editorJsData: Array.isArray(content) ? content[0] : content,
          description,
          keywords: [],
        }
      );

      const apiBlogData = res.data.optimizedBlog;

      const toSet = [{ ...apiBlogData }];

      setImprovedBlog(toSet);

      toast.dismiss(loadingToast);
      toast.success("Got it!");
    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error("Something is not right!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster />
      <AnimationWrapper>
        <div className="text-4xl">Improve your blog with Google Gemini</div>
        <span className=" text-gray-400">Write your blog's description and hit Improve button. This will improve your blog and make it SEO friendly by extracting the  keywords from your blog and adding the trending and most searched one.</span>
        <div className="mb-4 mt-8 pb-6 font-gelasio blog-page-content">
          
          <div className="">
            <textarea
              maxLength={500}
              placeholder="Description..."
              defaultValue={description}
              className="h-40 resize-none leading-7 input-box pl-4 placeholder:text-gray-400"
              onChange={handleBlogDesChange}
              // onKeyDown={handleDesKeyDown}
            ></textarea>

            <div className="flex items-center justify-between gap-2">
                <button
            onClick={bringNewBlog}
            className={`px-2 py-1  ${theme == "dark" ? "bg-gray-400" : ""} text-white rounded`}
          >
            <img src={turnLeftLogo} className="h-4 w-4"/>
          </button>
          
              <button
                onClick={fetchAIData}
                className="px-3 py-1 bg-[#006EFE] text-white rounded-lg"
              >
                Improve
              </button>
              {loading && <span>Loading…</span>}
            </div>
          </div>
          {improvedBlog.length > 0 &&
            improvedBlog[0].blocks.map((block, i) => {
              return (
                <div key={i} className="my-4 md:my-8">
                  <BlogContent block={block} />
                </div>
              );
            })}
        </div>
      </AnimationWrapper>
    </>
  );
};

export default GeminiResultViewer;

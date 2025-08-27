//importing tools

import Embed from "@editorjs/embed";
import List from "@editorjs/list";
import Image from "@editorjs/image";
import Header from "@editorjs/header";
import Quote from "@editorjs/quote";
import Marker from "@editorjs/marker";
import InlineCode from "@editorjs/inline-code";
import CodeTool from "@editorjs/code";
import axios from "axios";

import CodeBox from "@bomdi/codebox";
import "highlight.js/styles/github-dark.css"; // pick any theme

const uploadImageByURl = (e) => {
  let link = new Promise((resolve, reject) => {
    try {
      resolve(e);
    } catch (error) {
      reject(error);
    }
  });

  return link.then((url) => {
    return {
      success: 1,
      file: { url },
    };
  });
};

const uploadImageByFile = (e) => {
  const formData = new FormData();
  formData.append("file", e);

  return axios.post(
    `${import.meta.env.VITE_SERVER_DOMAIN}/upload-file-cloud`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  )
  .then((res) => {
    return {
      success: 1,
      file: { url: res?.data?.url },
    };
  })
  .catch((error) => {
    console.error(error);
    return {
      success: 0,
      error: "Upload failed",
    };
  });
};

export const tools = {
  embed: Embed,
  list: {
    class: List,
    inlineToolbar: true,
  },
  image: {
    class: Image,
    config: {
      uploader: {
        uploadByUrl: uploadImageByURl,
        uploadByFile: uploadImageByFile,
      },
    },
  },
  header: {
    class: Header,
    config: {
      placeholder: "Type Heading....",
      levels: [2, 3, 4],
      defaultLevel: 2,
    },
  },
  quote: {
    class: Quote,
    inlineToolbar: true,
  },
  marker: Marker,
  inlineCode: InlineCode,
  codeBox: {
    class: CodeBox,
    config: {
      themeURL: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css",
      themeName: "night-owl",
      useDefaultTheme: "light", // fallback
    },
  },
};

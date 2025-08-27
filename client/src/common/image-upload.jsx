import axios from "axios";


export const uploadImage = async (img) => {

    const formData = new FormData();
    formData.append("file", img);
  try {
    const res = await axios.post(
      `${import.meta.env.VITE_SERVER_DOMAIN}/upload-file-cloud`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return res?.data?.url;
  } catch (error) {
    console.log(error);
    return null;
  }
};

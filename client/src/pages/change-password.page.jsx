import React, { useContext, useRef } from "react";
import AnimationWrapper from "../common/page-animation";
import InputBox from "../components/input.component";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import { UserContext } from "../App";

const ChangePassword = () => {

    let {userAuth: {access_token}} = useContext(UserContext)
  let changePasswordForm = useRef();
  let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

  const handleSubmit = (e) => {
    e.preventDefault();

    let form = new FormData(changePasswordForm.current);

    let formData = {};

    for (let [key, value] of form.entries()) {
      formData[key] = value;
    }

    let { currentPassword, newPassword } = formData;

    if (!currentPassword.length || !newPassword.length) {
      return toast.error("Fill all the inputs!");
    }

    if (
      !passwordRegex.test(currentPassword) ||
      !passwordRegex.test(newPassword)
    ) {
      return toast.error(
        "Password should be 6 to 12 character long with atleast 1 number, 1 lowercase and 1 uppercase letters"
      );
    }

    e.target.setAttribute("disabled", true);

    let loadingToast = toast.loading("Updating...")

    axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/change-password", formData, {
        headers: {
            "Authorization" : `Bearer, ${access_token}`
        }
    }).then(() => {
        toast.dismiss(loadingToast);
        e.target.removeAttribute("disabled")
        return toast.success("Password Updated!")
    }).catch(({response}) => {
        toast.dismiss(loadingToast);
        e.target.removeAttribute("disabled")
        return toast.error(response.data.error)
    })
  };
  return (
    <AnimationWrapper>
      <Toaster />

      <form ref={changePasswordForm} action="">
        <h1 className="max-md:hidden">Change Password</h1>

        <div className="py-10 w-full md:max-w-[400px]">
          <InputBox
            icon={"fi-rr-unlock"}
            className="profile-edit-input"
            placeholder={"Current Password"}
            name={"currentPassword"}
            type="password"
          />

          <InputBox
            icon={"fi-rr-unlock"}
            className="profile-edit-input"
            placeholder={"New Password"}
            name={"newPassword"}
            type="password"
          />

          <button onClick={handleSubmit} className="btn-dark px-10">
            Change Password
          </button>
        </div>
      </form>
    </AnimationWrapper>
  );
};

export default ChangePassword;

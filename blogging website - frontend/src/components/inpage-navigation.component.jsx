import React from "react";
import { useEffect } from "react";
import { useRef } from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

export let activeTabLineRef;
export let activeTabRef;

const InPageNavigation = ({
  routes,
  deafultHidden = [],
  defaultActiveIndex = 0,
  children,
}) => {
  activeTabLineRef = useRef(null);
  activeTabRef = useRef(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const removeTab = () => {
    searchParams.delete("tab"); // remove tab param
    setSearchParams(searchParams); // update URL
  };

  // Read value
  const tab = searchParams.get("tab");

  let [inPageNavIndex, setInPageNavIndex] = useState(defaultActiveIndex);

  let [isResizeEventAdded, setIsResizeEventAdded] = useState(false);
  let [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    if (width > 766 && inPageNavIndex != defaultActiveIndex) {
      changePageState(activeTabRef.current, defaultActiveIndex);
    }

    if (!isResizeEventAdded) {
      window.addEventListener("resize", () => {
        if (!isResizeEventAdded) {
          setIsResizeEventAdded(true);
        }

        setWidth(window.innerWidth);
      });
    }
  }, [width]);

  const changePageState = (btn, i) => {
    let { offsetWidth, offsetLeft } = btn;

    activeTabLineRef.current.style.width = offsetWidth + "px";
    activeTabLineRef.current.style.left = offsetLeft + "px";

    setInPageNavIndex(i);

    tab && tab == "draft" && removeTab();
  };

  return (
    <>
      <div className="relative mb-8 bg-white border-b border-grey flex flex-nowrap overflow-x-auto">
        {routes.map((route, i) => {
          return (
            <button
              ref={i == defaultActiveIndex ? activeTabRef : null}
              onClick={(e) => {
                changePageState(e.target, i);
              }}
              key={i}
              className={
                "p-4 px-5 capitalize " +
                (inPageNavIndex == i ? "text-black " : "text-dark-grey ") +
                (deafultHidden.includes(route) ? "md:hidden" : "")
              }
            >
              {route}
            </button>
          );
        })}

        <hr ref={activeTabLineRef} className="absolute bottom-0 duration-300" />
      </div>
      {Array.isArray(children) ? children[inPageNavIndex] : children}
    </>
  );
};

export default InPageNavigation;

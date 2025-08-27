import { AnimatePresence, motion } from "framer-motion";

const AnimationWrapper = ({
  children,
  initial = { opacity: 0 },
  animate = { opacity: 1 },
  transition = { duration: 1 },
  keyValue,
  className = "",
}) => {
  return (
    <AnimatePresence>
      <motion.div
        key={keyValue} //on the chnage of this key the animation will also be applied
        initial={initial}
        animate={animate} //final sate of animation
        transition={transition} //final sate of animation
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimationWrapper;

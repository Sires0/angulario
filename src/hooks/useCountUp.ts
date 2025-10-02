import { useState, useEffect, useRef } from 'react';

// Easing function for a smooth animation curve
const easeOutExpo = (t: number) => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

export const useCountUp = (endValue: number, duration: number = 500) => {
  const [count, setCount] = useState(endValue);
  const prevEndValueRef = useRef(endValue);
  const animationFrameRef = useRef(0);

  useEffect(() => {
    const startValue = prevEndValueRef.current;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsedTime = now - startTime;
      if (elapsedTime < duration) {
        const progress = easeOutExpo(elapsedTime / duration);
        const currentValue = startValue + (endValue - startValue) * progress;
        setCount(currentValue);
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(endValue);
      }
    };

    // Start the animation
    animationFrameRef.current = requestAnimationFrame(animate);

    // On cleanup, update the ref to the latest value so the next animation starts from the right place
    return () => {
      prevEndValueRef.current = endValue;
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [endValue, duration]);

  return count;
};
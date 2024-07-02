import { RefObject, useCallback } from 'react';
import throttle from 'lodash/throttle';

type TUseScrollToRef = {
  targetRef: RefObject<HTMLDivElement>;
  callback: () => void;
  smoothCallback: () => void;
};

export default function useScrollToRef({ targetRef, callback, smoothCallback }: TUseScrollToRef) {
 const logAndScroll = (
  targetRef: React.RefObject<HTMLElement>, 
  behavior: 'instant' | 'smooth', 
  callbackFn: () => void
) => {
  // Debugging:
  console.dir(targetRef.current); // This will log the detailed properties of the targetRef
  console.log(`Scrolling with behavior: ${behavior}, Time: ${new Date().toISOString()}`);

  // Scroll to the bottom of the target element
  if (targetRef.current) {
    targetRef.current.scrollTo({
      top: targetRef.current.scrollHeight,
      behavior: behavior === 'smooth' ? 'smooth' : 'auto'
    });
  }

  // Execute the callback function
  callbackFn();
};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scrollToRef = useCallback(
    throttle(() => logAndScroll('instant', callback), 250, { leading: true }),
    [targetRef],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scrollToRefSmooth = useCallback(
    throttle(() => logAndScroll('smooth', smoothCallback), 750, { leading: true }),
    [targetRef],
  );

  const handleSmoothToRef: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    scrollToRefSmooth();
  };

  return {
    scrollToRef,
    handleSmoothToRef,
  };
}

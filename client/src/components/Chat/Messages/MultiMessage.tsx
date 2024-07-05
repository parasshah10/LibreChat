import { useRecoilState } from 'recoil';
import { useEffect, useCallback } from 'react';
import type { TMessageProps } from '~/common';
// eslint-disable-next-line import/no-cycle
import Message from './Message';
// eslint-disable-next-line import/no-cycle
import MessageParts from './MessageParts';
import store from '~/store';

export default function MultiMessage({
  messageId,
  messagesTree,
  currentEditId,
  setCurrentEditId,
}: TMessageProps) {
  const [siblingIdx, setSiblingIdx] = useRecoilState(store.messagesSiblingIdxFamily(messageId));
  const [isAddingNewMessage, setIsAddingNewMessage] = useState(false);
  const setSiblingIdxRev = useCallback(
    (value: number) => {
      setSiblingIdx((messagesTree?.length ?? 0) - value - 1);
    },
    [messagesTree?.length, setSiblingIdx],
  );

  useEffect(() => {
    // console.log('MessagesTree changed:', messagesTree);
    // console.log('Current messageId:', messageId);
    // console.log('Current siblingIdx:', siblingIdx);
      console.log('Ran first one!')
      console.log(currentEditId)
    // setSiblingIdx(0);
  }, [messagesTree?.length]);

  useEffect(() => {
    if (messagesTree?.length && siblingIdx >= messagesTree?.length) {
      console.log('Resetting siblingIdx to 0');
      setSiblingIdx(0);
    }
  }, [siblingIdx, messagesTree?.length, setSiblingIdx]);

  if (!(messagesTree && messagesTree?.length)) {
    return null;
  }


  const message = messagesTree[messagesTree.length - siblingIdx - 1];

  if (!message) {
    return null;
  }
  if (message.content) {
    return (
      <MessageParts
        key={message.messageId}
        message={message}
        currentEditId={currentEditId}
        setCurrentEditId={setCurrentEditId}
        siblingIdx={messagesTree.length - siblingIdx - 1}
        siblingCount={messagesTree.length}
        setSiblingIdx={setSiblingIdxRev}
      />
    );
  }

  return (
    <Message
      key={message.messageId}
      message={message}
      currentEditId={currentEditId}
      setCurrentEditId={setCurrentEditId}
      siblingIdx={messagesTree.length - siblingIdx - 1}
      siblingCount={messagesTree.length}
      setSiblingIdx={setSiblingIdxRev}
    />
  );
}

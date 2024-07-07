import { useRecoilValue } from 'recoil';
import { useParams } from 'react-router-dom';
import { useState, useRef, useMemo } from 'react';
import {
    useGetEndpointsQuery,
    useGetStartupConfig,
    useGetMessagesByConvoId
} from 'librechat-data-provider/react-query';
import type { MouseEvent, FocusEvent, KeyboardEvent } from 'react';
import { useUpdateConversationMutation } from '~/data-provider';
import EndpointIcon from '~/components/Endpoints/EndpointIcon';
import { useConversations, useNavigateToConvo } from '~/hooks';
import { NotificationSeverity } from '~/common';
import { ArchiveIcon } from '~/components/svg';
import { useToastContext, useFileMapContext } from '~/Providers';
import DropDownMenu from './DropDownMenu';
import ArchiveButton from './ArchiveButton';
import DeleteButton from './DeleteButton';
import RenameButton from './RenameButton';
import HoverToggle from './HoverToggle';
import { cn, buildTree } from '~/utils';
import store from '~/store';
import ShareButton from './ShareButton';
import { QueryKeys } from 'librechat-data-provider';
import { useQueryClient } from '@tanstack/react-query';

type KeyEvent = KeyboardEvent<HTMLInputElement>;

// Function to traverse the tree and collect the latest path including the root
function collectLatestPath(node, collectedMessages = []) {
    while (node) {
        if (node.isCreatedByUser) {
            collectedMessages.push({ role: 'user', content: node.text });
        } else {
            collectedMessages.push({ role: 'assistant', content: node.text });
        }
        if (node.children && node.children.length > 0) {
            node = node.children[node.children.length - 1];
        } else {
            node = null;
        }
    }
    return collectedMessages;
}

function convertToOpenAIFormat(messagesTree) {
    let openAIMessages = [];

    // Ensuring we start from the last root node
    if (messagesTree.length > 0) {
        openAIMessages = collectLatestPath(messagesTree[messagesTree.length - 1]);
    }

    return openAIMessages;
}

export default function Conversation({ conversation, retainView, toggleNav, isLatestConvo }) {
    const params = useParams();
    const currentConvoId = useMemo(() => params.conversationId, [params.conversationId]);
    const updateConvoMutation = useUpdateConversationMutation(currentConvoId ?? '');
    const activeConvos = useRecoilValue(store.allConversationsSelector);
    const { data: endpointsConfig } = useGetEndpointsQuery();
    const { navigateWithLastTools } = useNavigateToConvo();
    const { data: startupConfig } = useGetStartupConfig();
    const { refreshConversations } = useConversations();
    const { showToast } = useToastContext();
    const { conversationId, title } = conversation;
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [titleInput, setTitleInput] = useState(title);
    const [renaming, setRenaming] = useState(false);
    const [isPopoverActive, setIsPopoverActive] = useState(false);

    // Access the query client
    const queryClient = useQueryClient();

    // Use the custom hook `useFileMapContext` to get the file map context.
    const fileMap = useFileMapContext();

    // Use the custom hook `useGetMessagesByConvoId` to fetch messages for a specific conversation ID.
    const { data: messagesTree = null, isLoading } = useGetMessagesByConvoId(conversationId ?? '', {
        select: (data) => {
            const dataTree = buildTree({ messages: data, fileMap });
            return dataTree?.length === 0 ? null : dataTree ?? null;
        },
        enabled: !!fileMap,
    });

    // Function to print messages to the console
    const printMessages = async () => {
    const openAIMessages = convertToOpenAIFormat(messagesTree);

    console.log('OpenAI Messages:', openAIMessages);
    const formattedMessages = openAIMessages.map(message => `[${message.role}]: ${message.content}`).join('\n');

    try {
        const response = await fetch('https://sweden-infants-manga-paso.trycloudflare.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer hi`
            },
            body: JSON.stringify({
                model: 'command-r-plus',
                messages: [
                    { role: 'system', content: `Generate a concise title (4-5 words maximum) for this conversation. \n\n${formattedMessages}\n\nTITLE: ` }
                ],
            })
        });

        const data = await response.json();
        const generatedTitle = data.choices[0].message.content.trim();
        console.log('Generated Title:', generatedTitle);

        // Copy the formatted messages to the clipboard
        navigator.clipboard.writeText(generatedTitle)
            .then(() => {
                console.log('Generated Title copied to clipboard');
            })
            .catch((error) => {
                console.error('Failed to copy generated title to clipboard:', error);
            });

        setIsPopoverActive(false);
    } catch (error) {
        console.error('Error generating title:', error);
    }
};

    const clickHandler = async (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (event.button === 0 && (event.ctrlKey || event.metaKey)) {
            toggleNav();
            return;
        }

        event.preventDefault();
        if (currentConvoId === conversationId) {
            return;
        }

        toggleNav();

        // set document title
        document.title = title;
        navigateWithLastTools(conversation);
    };

    const renameHandler = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setTitleInput(title);
        setRenaming(true);
        setTimeout(() => {
            if (!inputRef.current) {
                return;
            }
            inputRef.current.focus();
        }, 25);
    };

    const onRename = (e: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLInputElement> | KeyEvent) => {
        e.preventDefault();
        setRenaming(false);
        if (titleInput === title) {
            return;
        }
        updateConvoMutation.mutate(
            { conversationId, title: titleInput },
            {
                onSuccess: () => refreshConversations(),
                onError: () => {
                    setTitleInput(title);
                    showToast({
                        message: 'Failed to rename conversation',
                        severity: NotificationSeverity.ERROR,
                        showIcon: true,
                    });
                },
            },
        );
    };

    const handleKeyDown = (e: KeyEvent) => {
        if (e.key === 'Escape') {
            setTitleInput(title);
            setRenaming(false);
        } else if (e.key === 'Enter') {
            onRename(e);
        }
    };

    const isActiveConvo =
        currentConvoId === conversationId ||
        (isLatestConvo && currentConvoId === 'new' && activeConvos[0] && activeConvos[0] !== 'new');

    return (
        <div
            className={cn(
                'hover:bg-token-sidebar-surface-secondary group relative rounded-lg active:opacity-90',
            )}
        >
            {renaming ? (
                <div className="absolute inset-0 z-50 flex w-full items-center rounded-lg bg-gray-200 p-1.5 dark:bg-gray-700">
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full rounded border border-blue-500 bg-transparent p-0.5 text-sm leading-tight outline-none"
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        onBlur={onRename}
                        onKeyDown={handleKeyDown}
                    />
                </div>
            ) : (
                <HoverToggle
                    isActiveConvo={isActiveConvo}
                    isPopoverActive={isPopoverActive}
                    setIsPopoverActive={setIsPopoverActive}
                >
                    <DropDownMenu>
                        {startupConfig && startupConfig.sharedLinksEnabled && (
                            <ShareButton
                                conversationId={conversationId}
                                title={title}
                                appendLabel={true}
                                className="mb-[3.5px]"
                                setPopoverActive={setIsPopoverActive}
                            />
                        )}

                        <RenameButton
                            renaming={renaming}
                            onRename={onRename}
                            renameHandler={renameHandler}
                            appendLabel={true}
                            className="mb-[3.5px]"
                        />
                        <button
    onClick={async () => {
        try {
            await printMessages();
        } catch (error) {
            console.error('Error in printMessages:', error);
            // Optionally show an error toast here
        }
    }}
    className="group m-1.5 mb-[3.5px] flex w-full cursor-pointer items-center gap-2 rounded p-2.5 text-sm hover:bg-gray-200 focus-visible:bg-gray-200 focus-visible:outline-0 radix-disabled:pointer-events-none radix-disabled:opacity-50 dark:hover:bg-gray-600 dark:focus-visible:bg-gray-600"
>
    Print Messages
</button>
                        <ArchiveButton
                            conversationId={conversationId}
                            retainView={retainView}
                            shouldArchive={true}
                            appendLabel={true}
                            className="group m-1.5 mb-[3.5px] flex w-full cursor-pointer items-center gap-2 rounded p-2.5 text-sm hover:bg-gray-200 focus-visible:bg-gray-200 focus-visible:outline-0 radix-disabled:pointer-events-none radix-disabled:opacity-50 dark:hover:bg-gray-600 dark:focus-visible:bg-gray-600"
                            icon={<ArchiveIcon className="h-5 w-5" />}
                        />
                        <DeleteButton
                            conversationId={conversationId}
                            retainView={retainView}
                            renaming={renaming}
                            title={title}
                            appendLabel={true}
                            className="group m-1.5 mt-[3.5px] flex w-full cursor-pointer items-center gap-2 rounded p-2.5 text-sm hover:bg-gray-200 focus-visible:bg-gray-200 focus-visible:outline-0 radix-disabled:pointer-events-none radix-disabled:opacity-50 dark:hover:bg-gray-600 dark:focus-visible:bg-gray-600"
                        />
                    </DropDownMenu>
                </HoverToggle>
            )}
            <a
                href={`/c/${conversationId}`}
                data-testid="convo-item"
                onClick={clickHandler}
                className={cn(
                    isActiveConvo || isPopoverActive
                        ? 'group relative mt-2 flex cursor-pointer items-center gap-2 break-all rounded-lg bg-gray-200 px-2 py-2 active:opacity-50 dark:bg-gray-700'
                        : 'group relative mt-2 flex grow cursor-pointer items-center gap-2 overflow-hidden whitespace-nowrap break-all rounded-lg px-2 py-2 hover:bg-gray-200 active:opacity-50 dark:hover:bg-gray-700',
                    !isActiveConvo && !renaming ? 'peer-hover:bg-gray-200 dark:peer-hover:bg-gray-800' : '',
                )}
                title={title}
            >
                <EndpointIcon
                    conversation={conversation}
                    endpointsConfig={endpointsConfig}
                    size={20}
                    context="menu-item"
                />
                {!renaming && (
                    <div className="relative line-clamp-1 max-h-5 flex-1 grow overflow-hidden">{title}</div>
                )}
                {isActiveConvo ? (
                    <div
                        className={cn(
                            'absolute bottom-0 right-0 top-0 w-20 rounded-r-lg bg-gradient-to-l',
                            !renaming ? 'from-gray-200 from-60% to-transparent dark:from-gray-700' : '',
                        )}
                    />
                ) : (
                    <div className="absolute bottom-0 right-0 top-0 w-20 rounded-r-lg bg-gradient-to-l from-gray-50 from-0% to-transparent group-hover:from-gray-200 group-hover:from-60% dark:from-gray-850 dark:group-hover:from-gray-700" />
                )}
            </a>
        </div>
    );
}

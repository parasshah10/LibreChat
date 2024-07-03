import { useParams, useNavigate } from 'react-router-dom';
import type { MouseEvent, FocusEvent, KeyboardEvent } from 'react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '~/components/ui';
import { useConversations, useLocalize, useNewConvo } from '~/hooks';
import { useArchiveConversationMutation } from '~/data-provider';
import { NotificationSeverity } from '~/common';
import { useToastContext } from '~/Providers';

type ArchiveButtonProps = {
  conversationId: string;
  retainView: () => void;
  shouldArchive: boolean;
  icon: React.ReactNode;
  className?: string;
  appendLabel?: boolean;  // Ensure this prop is defined
};

export default function ArchiveButton({
  conversationId,
  retainView,
  shouldArchive,
  icon,
  className = '',
  appendLabel = false,  // Default value for appendLabel
}: ArchiveButtonProps) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const { newConversation } = useNewConvo();
  const { refreshConversations } = useConversations();
  const { conversationId: currentConvoId } = useParams();

  const archiveConvoMutation = useArchiveConversationMutation(conversationId);

  const label = shouldArchive ? 'archive' : 'unarchive';
  const archiveHandler = (
    e:
      | MouseEvent<HTMLButtonElement>
      | FocusEvent<HTMLInputElement>
      | KeyboardEvent<HTMLInputElement>,
  ) => {
    e.preventDefault();
    archiveConvoMutation.mutate(
      { conversationId, isArchived: shouldArchive },
      {
        onSuccess: () => {
          if (currentConvoId === conversationId || currentConvoId === 'new') {
            newConversation();
            navigate('/c/new', { replace: true });
          }
          refreshConversations();
          retainView();
        },
        onError: () => {
          showToast({
            message: localize(`com_ui_${label}_error`),
            severity: NotificationSeverity.ERROR,
            showIcon: true,
          });
        },
      },
    );
  };

  return (
    <button type="button" className={className} onClick={archiveHandler}>
      <TooltipProvider delayDuration={250}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center">
              {icon}
              {appendLabel && <span className="ml-2">{localize(`com_ui_${label}`)}</span>}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={0}>
            {localize(`com_ui_${label}`)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </button>
  );
}

import { useState, useEffect } from 'react';
import type { ChatController } from '@acme/app-core';
import { useChat } from '@acme/ui-common';
import { SessionHeader } from './SessionHeader.js';
import { ThoughtBubble } from './ThoughtBubble.js';
import { ToolCallList } from './ToolCallList.js';
import { MessageList } from './MessageList.js';
import { PlanPanel } from './PlanPanel.js';
import { PermissionDialog } from './PermissionDialog.js';
import { MessageInput } from './MessageInput.js';
import { ConnectionStatusPanel } from './ConnectionStatusPanel.js';
import { AgentSettingsPanel } from './AgentSettingsPanel.js';

interface Props {
  controller: ChatController;
}

export function ChatScreen({ controller }: Props): React.ReactElement {
  const { viewModel, sendMessage, cancel, approve } = useChat({ controller });
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      await controller.connect();
      if (controller.getConnectionStatus() === 'error') return;
      await controller.startSession();
    })();
    return () => {
      void controller.disconnect();
    };
  }, [controller]);

  return (
    <view className="flex h-full flex-col bg-surface text-text">
      <SessionHeader
        title={viewModel.title}
        currentMode={viewModel.currentMode}
        usage={viewModel.usage}
        connectionStatus={viewModel.connectionStatus}
        isTurnActive={viewModel.isTurnActive}
        onCancel={() => void cancel()}
        onSettingsClick={() => setSettingsOpen(true)}
        configError={viewModel.configError}
      />
      <ThoughtBubble thought={viewModel.thought} />
      <ToolCallList toolCalls={viewModel.toolCalls} />
      {viewModel.isConnected ? (
        <>
          <MessageList messages={viewModel.messages} />
          <PlanPanel plan={viewModel.plan} />
          {viewModel.pendingPermission && (
            <PermissionDialog
              permission={viewModel.pendingPermission}
              onApprove={(reqId, optId) => void approve(reqId, optId)}
            />
          )}
          <MessageInput input={viewModel.input} onSend={sendMessage} />
        </>
      ) : (
        <ConnectionStatusPanel
          connectionStatus={viewModel.connectionStatus}
          configError={viewModel.configError}
        />
      )}
      <AgentSettingsPanel
        controller={controller}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </view>
  );
}

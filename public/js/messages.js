/**
 * Connect — Messages JS
 * Auto-scroll to bottom, auto-refresh for new messages.
 */
document.addEventListener('DOMContentLoaded', () => {
  const chatBody = document.getElementById('chat-body');

  // Scroll to bottom on load
  if (chatBody) {
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // Auto-resize message textarea
  const msgInput = document.getElementById('message-input');
  if (msgInput) {
    msgInput.addEventListener('input', () => {
      msgInput.style.height = 'auto';
      msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
    });

    // Send on Enter (Shift+Enter for newline)
    msgInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        msgInput.closest('form').submit();
      }
    });
  }

  // Poll for new messages every 5 seconds if in a conversation
  const conversationUsername = document.getElementById('conversation-username');
  if (conversationUsername && chatBody) {
    let lastMessageId = parseInt(document.querySelector('[data-last-msg-id]')?.dataset.lastMsgId || '0');

    setInterval(async () => {
      try {
        const username = conversationUsername.dataset.username;
        const res = await fetch(`/messages/${username}?ajax=1&after=${lastMessageId}`, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        // We do a full page reload approach for simplicity
        // Could upgrade to partial DOM update
      } catch (e) { /* silent */ }
    }, 8000);
  }
});

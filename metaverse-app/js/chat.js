/* ========================================
   chat.js — Chat system
   ======================================== */

const Chat = {
    messagesEl: null,
    inputEl: null,
    sendBtn: null,
    onSendCallback: null,
    maxMessages: 100,

    init(onSend) {
        this.messagesEl = document.getElementById('chat-messages');
        this.inputEl = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('chat-send-btn');
        this.onSendCallback = onSend;

        this.sendBtn.addEventListener('click', () => this._handleSend());

        this.inputEl.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.code === 'Enter') {
                this._handleSend();
            }
            if (e.code === 'Escape') {
                this.inputEl.blur();
            }
        });

        // Prevent game controls while typing
        this.inputEl.addEventListener('keyup', (e) => e.stopPropagation());

        // Enter key to focus chat
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Enter' && document.activeElement !== this.inputEl) {
                e.preventDefault();
                this.inputEl.focus();
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
            }
        });
    },

    _handleSend() {
        const text = this.inputEl.value.trim();
        if (!text) return;
        this.inputEl.value = '';
        if (this.onSendCallback) {
            this.onSendCallback(text);
        }
    },

    addMessage(sender, text, color, isSystem) {
        const div = document.createElement('div');
        div.className = 'chat-msg' + (isSystem ? ' system' : '');

        if (isSystem) {
            div.textContent = text;
        } else {
            const time = Utils.formatTime(new Date());
            const senderSpan = document.createElement('span');
            senderSpan.className = 'sender';
            senderSpan.style.color = color || '#aaa';
            senderSpan.textContent = sender;

            div.appendChild(document.createTextNode(`[${time}] `));
            div.appendChild(senderSpan);
            div.appendChild(document.createTextNode(`: ${text}`));
        }

        this.messagesEl.appendChild(div);

        // Prune old messages
        while (this.messagesEl.children.length > this.maxMessages) {
            this.messagesEl.removeChild(this.messagesEl.firstChild);
        }

        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    },

    addSystemMessage(text) {
        this.addMessage(null, text, null, true);
    }
};

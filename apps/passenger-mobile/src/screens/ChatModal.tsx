import React, { useState } from 'react';
import { usePassengerStore } from '../store/passengerStore.js';
import { VoztriColors } from '@voztri/design-tokens';

interface Props {
  onClose: () => void;
}

export const ChatModal: React.FC<Props> = ({ onClose }) => {
  const { chatMessages, sendChat } = usePassengerStore();
  const [input, setInput] = useState('');

  const quickReplies = ['Estou no portão', 'Estou descendo', 'OK, obrigado!'];

  const handleSend = () => {
    if (!input.trim()) return;
    sendChat(input.trim());
    setInput('');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(11, 16, 38, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        height: '75%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.25)',
      }}>
        {/* Chat Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #ECECFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              backgroundColor: '#ECECFF',
              color: VoztriColors.brand.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
            }}>
              CS
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#151A31' }}>Carlos Eduardo Silva</div>
              <span style={{ fontSize: 11, color: '#00C853', fontWeight: 700 }}>● Online agora</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', fontSize: 18, color: '#7B7489', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>

        {/* Messages Stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {chatMessages.map((msg) => {
            const isMe = msg.senderRole === 'passenger';
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  backgroundColor: isMe ? VoztriColors.brand.primary : '#F3F2FF',
                  color: isMe ? '#FFFFFF' : '#151A31',
                  padding: '10px 14px',
                  borderRadius: 16,
                  borderBottomRightRadius: isMe ? 4 : 16,
                  borderBottomLeftRadius: isMe ? 16 : 4,
                  fontSize: 14,
                  fontWeight: 500,
                  boxShadow: '0 2px 6px rgba(11, 16, 38, 0.04)',
                }}
              >
                {msg.text}
              </div>
            );
          })}
        </div>

        {/* Quick Replies Chips */}
        <div style={{ padding: '8px 16px', display: 'flex', gap: 8, overflowX: 'auto', backgroundColor: '#FBF8FF' }}>
          {quickReplies.map((reply, i) => (
            <button
              key={i}
              onClick={() => sendChat(reply)}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid #ECECFF',
                backgroundColor: '#FFFFFF',
                color: '#151A31',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #ECECFF',
          display: 'flex',
          gap: 10,
          backgroundColor: '#FFFFFF',
        }}>
          <input
            type="text"
            placeholder="Digite sua mensagem para o motorista..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid #ECECFF',
              fontSize: 14,
              outline: 'none',
              backgroundColor: '#F8F9FE',
            }}
          />
          <button
            onClick={handleSend}
            style={{
              padding: '0 18px',
              borderRadius: 12,
              border: 'none',
              backgroundColor: VoztriColors.brand.primary,
              color: '#FFFFFF',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};


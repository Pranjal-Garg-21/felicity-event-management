import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const DiscussionForum = ({ eventId, isOrganizer }) => {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState('message');
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState(new Set());
  const [replies, setReplies] = useState({});
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastViewed, setLastViewed] = useState(localStorage.getItem(`forum_${eventId}_lastViewed`) || new Date().toISOString());

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`http://localhost:5000/api/forum/${eventId}`, config);
      setMessages(data.messages);
      setLoading(false);
      
      // Update last viewed
      const now = new Date().toISOString();
      localStorage.setItem(`forum_${eventId}_lastViewed`, now);
      setLastViewed(now);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(
        `http://localhost:5000/api/forum/${eventId}/unread?lastViewed=${lastViewed}`,
        config
      );
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Fetch replies for a message
  const fetchReplies = async (messageId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(
        `http://localhost:5000/api/forum/message/${messageId}/replies`,
        config
      );
      setReplies(prev => ({ ...prev, [messageId]: data }));
    } catch (error) {
      console.error('Error fetching replies:', error);
    }
  };

  // Post message
  const handlePostMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(
        `http://localhost:5000/api/forum/${eventId}`,
        {
          content: newMessage,
          type: messageType,
          parentMessageId: replyingTo?._id
        },
        config
      );

      setNewMessage('');
      setMessageType('message');
      setReplyingTo(null);
      fetchMessages();

      // Refresh replies if replying to a message
      if (replyingTo) {
        fetchReplies(replyingTo._id);
      }
    } catch (error) {
      console.error('Error posting message:', error);
      alert(error.response?.data?.message || 'Failed to post message');
    }
  };

  // Add reaction
  const handleReaction = async (messageId, reactionType) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(
        `http://localhost:5000/api/forum/message/${messageId}/react`,
        { reactionType },
        config
      );
      fetchMessages();
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  // Remove reaction
  const handleRemoveReaction = async (messageId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(
        `http://localhost:5000/api/forum/message/${messageId}/react`,
        config
      );
      fetchMessages();
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  };

  // Pin message
  const handlePinMessage = async (messageId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(
        `http://localhost:5000/api/forum/message/${messageId}/pin`,
        {},
        config
      );
      fetchMessages();
    } catch (error) {
      console.error('Error pinning message:', error);
      alert(error.response?.data?.message || 'Failed to pin message');
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(
        `http://localhost:5000/api/forum/message/${messageId}`,
        config
      );
      fetchMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      alert(error.response?.data?.message || 'Failed to delete message');
    }
  };

  // Toggle replies visibility
  const toggleReplies = (messageId) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
      if (!replies[messageId]) {
        fetchReplies(messageId);
      }
    }
    setExpandedReplies(newExpanded);
  };

  useEffect(() => {
    if (user && eventId) {
      fetchMessages();

      // Poll for new messages every 10 seconds
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [user, eventId]);

  // Reaction emojis
  const reactionEmojis = {
    like: '👍',
    love: '❤️',
    helpful: '💡',
    question: '❓',
    celebrate: '🎉'
  };

  // Get author display name
  const getAuthorName = (author) => {
    if (author.role === 'Organizer') {
      return `${author.organizerName} (Organizer)`;
    }
    return `${author.firstName} ${author.lastName}`;
  };

  // Check if user reacted
  const getUserReaction = (message) => {
    return message.reactions?.find(r => r.userId._id === user._id);
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading forum...</div>;
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', borderBottom: '2px solid #f0f0f0', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#333' }}>
            💬 Discussion Forum
          </h2>
          {unreadCount > 0 && (
            <span style={{
              background: '#ff5252',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: 'bold'
            }}>
              {unreadCount} new
            </span>
          )}
        </div>
        <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '0.9rem' }}>
          Ask questions, share updates, and connect with other participants
        </p>
      </div>

      {/* New Message Form */}
      <form onSubmit={handlePostMessage} style={{ marginBottom: '24px' }}>
        {replyingTo && (
          <div style={{
            background: '#e3f2fd',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.9rem', color: '#1976d2' }}>
              💬 Replying to {getAuthorName(replyingTo.author)}
            </span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#1976d2',
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}
            >
              ×
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isOrganizer && !replyingTo && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="message"
                  checked={messageType === 'message'}
                  onChange={(e) => setMessageType(e.target.value)}
                />
                <span style={{ fontSize: '0.9rem' }}>💬 Message</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="announcement"
                  checked={messageType === 'announcement'}
                  onChange={(e) => setMessageType(e.target.value)}
                />
                <span style={{ fontSize: '0.9rem' }}>📢 Announcement</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="question"
                  checked={messageType === 'question'}
                  onChange={(e) => setMessageType(e.target.value)}
                />
                <span style={{ fontSize: '0.9rem' }}>❓ Question</span>
              </label>
            </div>
          )}

          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={replyingTo ? "Write your reply..." : "Share your thoughts, ask questions..."}
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '12px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
            maxLength={2000}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#999' }}>
              {newMessage.length}/2000
            </span>
            <button
              type="submit"
              disabled={!newMessage.trim()}
              style={{
                padding: '10px 24px',
                background: newMessage.trim() ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease'
              }}
            >
              {replyingTo ? '💬 Reply' : '📤 Post'}
            </button>
          </div>
        </div>
      </form>

      {/* Messages List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#999',
            fontSize: '0.95rem'
          }}>
            💬 No messages yet. Be the first to start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <MessageCard
              key={message._id}
              message={message}
              isOrganizer={isOrganizer}
              currentUserId={user._id}
              getAuthorName={getAuthorName}
              getUserReaction={getUserReaction}
              reactionEmojis={reactionEmojis}
              handleReaction={handleReaction}
              handleRemoveReaction={handleRemoveReaction}
              handlePinMessage={handlePinMessage}
              handleDeleteMessage={handleDeleteMessage}
              setReplyingTo={setReplyingTo}
              toggleReplies={toggleReplies}
              expandedReplies={expandedReplies}
              replies={replies}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Message Card Component
const MessageCard = ({
  message,
  isOrganizer,
  currentUserId,
  getAuthorName,
  getUserReaction,
  reactionEmojis,
  handleReaction,
  handleRemoveReaction,
  handlePinMessage,
  handleDeleteMessage,
  setReplyingTo,
  toggleReplies,
  expandedReplies,
  replies,
  isReply = false
}) => {
  const isAuthor = message.author._id === currentUserId;
  const userReaction = getUserReaction(message);

  const messageStyle = {
    background: message.isPinned ? '#fff9e6' : (message.type === 'announcement' ? '#e3f2fd' : '#fff'),
    border: message.isPinned ? '2px solid #ffd700' : '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '16px',
    marginLeft: isReply ? '40px' : '0',
    position: 'relative'
  };

  return (
    <div style={messageStyle}>
      {/* Pinned indicator */}
      {message.isPinned && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: '#ffd700',
          color: '#333',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 'bold'
        }}>
          📌 Pinned
        </div>
      )}

      {/* Type badge */}
      {message.type === 'announcement' && (
        <div style={{
          display: 'inline-block',
          background: '#1976d2',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>
          📢 Announcement
        </div>
      )}

      {message.type === 'question' && (
        <div style={{
          display: 'inline-block',
          background: '#ff9800',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>
          ❓ Question
        </div>
      )}

      {/* Author and timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '1.1rem'
        }}>
          {message.author.firstName?.[0] || message.author.organizerName?.[0] || '?'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#333' }}>
            {getAuthorName(message.author)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#999' }}>
            {new Date(message.createdAt).toLocaleString()}
            {message.editedAt && <span> (edited)</span>}
          </div>
        </div>

        {/* Actions dropdown */}
        {(isOrganizer || isAuthor) && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {isOrganizer && (
              <button
                onClick={() => handlePinMessage(message._id)}
                style={{
                  padding: '6px 12px',
                  background: 'none',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
                title={message.isPinned ? 'Unpin' : 'Pin'}
              >
                📌
              </button>
            )}
            {(isOrganizer || isAuthor) && (
              <button
                onClick={() => handleDeleteMessage(message._id)}
                style={{
                  padding: '6px 12px',
                  background: 'none',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: '#f44336'
                }}
                title="Delete"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{
        marginBottom: '12px',
        fontSize: '0.95rem',
        lineHeight: '1.6',
        color: '#333',
        whiteSpace: 'pre-wrap'
      }}>
        {message.content}
      </div>

      {/* Reactions */}
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #f0f0f0'
      }}>
        {/* Reaction buttons */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {Object.entries(reactionEmojis).map(([type, emoji]) => {
            const count = message.reactions?.filter(r => r.type === type).length || 0;
            const hasReacted = userReaction?.type === type;

            return (
              <button
                key={type}
                onClick={() => hasReacted ? handleRemoveReaction(message._id) : handleReaction(message._id, type)}
                style={{
                  padding: '4px 8px',
                  background: hasReacted ? '#667eea' : '#f5f5f5',
                  color: hasReacted ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.3s ease'
                }}
              >
                {emoji} {count > 0 && count}
              </button>
            );
          })}
        </div>

        {/* Reply button */}
        {!isReply && (
          <button
            onClick={() => setReplyingTo(message)}
            style={{
              padding: '4px 12px',
              background: 'none',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              color: '#667eea',
              fontWeight: 'bold'
            }}
          >
            💬 Reply {message.replyCount > 0 && `(${message.replyCount})`}
          </button>
        )}

        {/* View replies button */}
        {!isReply && message.replyCount > 0 && (
          <button
            onClick={() => toggleReplies(message._id)}
            style={{
              padding: '4px 12px',
              background: 'none',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              color: '#667eea'
            }}
          >
            {expandedReplies.has(message._id) ? '▼ Hide' : '▶ Show'} {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {/* Replies */}
      {expandedReplies.has(message._id) && replies[message._id] && (
        <div style={{ marginTop: '16px' }}>
          {replies[message._id].map(reply => (
            <MessageCard
              key={reply._id}
              message={reply}
              isOrganizer={isOrganizer}
              currentUserId={currentUserId}
              getAuthorName={getAuthorName}
              getUserReaction={getUserReaction}
              reactionEmojis={reactionEmojis}
              handleReaction={handleReaction}
              handleRemoveReaction={handleRemoveReaction}
              handlePinMessage={handlePinMessage}
              handleDeleteMessage={handleDeleteMessage}
              setReplyingTo={setReplyingTo}
              toggleReplies={toggleReplies}
              expandedReplies={expandedReplies}
              replies={replies}
              isReply={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscussionForum;

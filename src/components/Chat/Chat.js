// Chat.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import queryString from 'query-string';
import io from 'socket.io-client';
import './Chat.css';
import closeIcon from '../Icons/closeIcon.png';
import onlineIcon from '../Icons/onlineIcon.png';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import dayjs from 'dayjs';

const ENDPOINT = 'https://realtime-chat-application-4nji.onrender.com';

const Chat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const socketRef = useRef();

  // Manage typing state
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Initialize socket connection and join room
  useEffect(() => {
    const { name: queryName, room: queryRoom } = queryString.parse(location.search);

    if (!queryName || !queryRoom) {
      navigate('/');
      return;
    }

    const sanitizedName = queryName.trim();
    const sanitizedRoom = queryRoom.trim();

    setName(sanitizedName);
    setRoom(sanitizedRoom);

    // Initialize socket
    socketRef.current = io(ENDPOINT, {
      transports: ['websocket'], // Use WebSocket for better performance
    });

    // Emit join event with name and room
    socketRef.current.emit('join', { name: sanitizedName, room: sanitizedRoom }, (error) => {
      if (error) {
        alert(error);
        navigate('/');
      }
    });

    // Cleanup on unmount
    return () => {
      socketRef.current.disconnect();
      socketRef.current.off();
    };
  }, [location.search, navigate]);

  // Handle incoming socket events
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // Message received
    const handleMessage = (msg) => {
      console.log('Received message:', msg); // Debugging
      setMessages((prevMessages) => [...prevMessages, msg]);
    };

    // Room data updated
    const handleRoomData = ({ room: currentRoom, users: currentUsers }) => {
      setUsers(currentUsers);
    };

    // Typing indicator
    const handleTyping = ({ name: typingName }) => {
      if (typingName !== name && !typingUsers.includes(typingName)) {
        setTypingUsers((prev) => [...prev, typingName]);
      }
    };

    // Stop typing indicator
    const handleStopTyping = ({ name: typingName }) => {
      setTypingUsers((prev) => prev.filter((user) => user !== typingName));
    };

    // Chat history received
    const handleChatHistory = (history) => {
      console.log('Received chat history:', history); // Debugging
      setMessages(history);
    };

    // Register event listeners
    socket.on('message', handleMessage);
    socket.on('roomData', handleRoomData);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);
    socket.on('chatHistory', handleChatHistory);

    // Cleanup listeners on unmount or when dependencies change
    return () => {
      socket.off('message', handleMessage);
      socket.off('roomData', handleRoomData);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
      socket.off('chatHistory', handleChatHistory);
    };
  }, [typingUsers, name]);

  // Send message
  const sendMessage = useCallback(
    (e) => {
      e.preventDefault();

      const trimmedMessage = message.trim();
      if (trimmedMessage) {
        socketRef.current.emit('sendMessage', trimmedMessage, (error) => {
          if (error) {
            alert(error);
          }
          setMessage('');
          socketRef.current.emit('stopTyping', { name, room });
        });
      }
    },
    [message, name, room]
  );

  // Handle input change with typing indicator
  const handleInputChange = (e) => {
    setMessage(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing', { name, room });
    }

    // Debounce stop typing
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current.emit('stopTyping', { name, room });
    }, 1000);
  };

  // Add emoji to message
  const addEmoji = (emoji) => {
    setMessage((prev) => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  return (
    <div className='chatContainer'>
      {/* Chat Header */}
      <div className='chatHeader'>
        <img className='onlineIcon' src={onlineIcon} alt='Online Icon' />
        <h2>{room}</h2>
        <button
          className='closeButton'
          onClick={() => navigate('/')}
          aria-label='Close Chat'
        >
          <img src={closeIcon} alt='Close Icon' />
        </button>
      </div>

      {/* Chat Body */}
      <div className='chatBody'>
        {/* Messages */}
        <div className='chatMessages'>
          {messages.map((msg) => (
            <div
              key={msg.id || msg.time} // Ensure each message has a unique key
              className={`message ${msg.user === name.trim() ? 'ownMessage' : 'otherMessage'}`}
            >
              <p>
                <strong>{msg.user}</strong>{' '}
                <span className='timestamp'>{dayjs(msg.time).format('h:mm A')}</span>
                <br />
                {msg.text}
              </p>
            </div>
          ))}

          {/* Typing Indicators */}
          {typingUsers.length > 0 && (
            <div className='typingIndicator'>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}
        </div>

        {/* Users List */}
        <div className='userList'>
          <h3>Users Online</h3>
          <ul>
            {users.map((user) => (
              <li key={user.id}>
                <img src={onlineIcon} alt='Online' className='userIcon' />
                {user.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Chat Input */}
      <div className='chatInput'>
        <form onSubmit={sendMessage}>
          {/* Emoji Picker Toggle */}
          <button
            type='button'
            className='emojiButton'
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            aria-label='Toggle Emoji Picker'
          >
            😊
          </button>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className='emojiPicker'>
              <Picker data={data} onEmojiSelect={addEmoji} />
            </div>
          )}

          {/* Message Input */}
          <input
            type='text'
            placeholder='Type a message...'
            value={message}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                sendMessage(e);
              }
            }}
            aria-label='Type a message'
          />

          {/* Send Button */}
          <button type='submit' className='sendButton' aria-label='Send Message'>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;

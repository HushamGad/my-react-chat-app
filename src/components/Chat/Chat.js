// Chat.js
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import queryString from 'query-string';
import { io } from 'socket.io-client'; // Ensure correct import
import './Chat.css';
import closeIcon from '../Icons/closeIcon.png';
import onlineIcon from '../Icons/onlineIcon.png';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import dayjs from 'dayjs';

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

  useEffect(() => {
    const { name, room } = queryString.parse(location.search);

    if (!name || !room) {
      navigate('/');
      return;
    }

    setName(name);
    setRoom(room);

    // Initialize Socket.io client with environment variable
    socketRef.current = io(process.env.REACT_APP_BACKEND_URL, {
      transports: ['websocket'], // Optional: specify transport
      secure: true, // Optional: enforce secure connection
    });

    // Emit 'join' event to backend
    socketRef.current.emit('join', { name, room }, (error) => {
      if (error) {
        alert(error);
        navigate('/');
      }
    });

    // Cleanup on component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('stopTyping', { name, room }); // Ensure typing status is cleared
        socketRef.current.disconnect();
        socketRef.current.off();
      }
    };
  }, [location.search, navigate]);

  useEffect(() => {
    const socket = socketRef.current;

    if (socket) {
      // Handle incoming messages
      const handleMessage = (message) => {
        console.log('Received message:', message); // Debugging
        setMessages((msgs) => [...msgs, message]);
      };

      // Handle room data updates
      const handleRoomData = ({ users }) => {
        setUsers(users);
      };

      // Handle incoming typing indicators
      const handleTyping = ({ name: typingName }) => {
        if (typingName !== name) {
          setTypingUsers((prev) => {
            if (!prev.includes(typingName)) {
              return [...prev, typingName];
            }
            return prev;
          });
        }
      };

      // Handle stop typing indicators
      const handleStopTyping = ({ name: typingName }) => {
        setTypingUsers((prev) => prev.filter((user) => user !== typingName));
      };

      // Handle receiving chat history
      const handleChatHistory = (history) => {
        console.log('Received chat history:', history); // Debugging
        setMessages(history);
      };

      // Attach event listeners
      socket.on('message', handleMessage);
      socket.on('roomData', handleRoomData);
      socket.on('typing', handleTyping);
      socket.on('stopTyping', handleStopTyping);
      socket.on('chatHistory', handleChatHistory); // Listen for chat history

      // Cleanup event listeners on component unmount
      return () => {
        socket.off('message', handleMessage);
        socket.off('roomData', handleRoomData);
        socket.off('typing', handleTyping);
        socket.off('stopTyping', handleStopTyping);
        socket.off('chatHistory', handleChatHistory); // Clean up
      };
    }
  }, [name]); // Removed 'typingUsers' from dependencies

  const sendMessage = (e) => {
    e.preventDefault();

    if (message.trim()) {
      socketRef.current.emit('sendMessage', message, () => setMessage(''));
      socketRef.current.emit('stopTyping', { name, room });
    }
  };

  // Typing indicator logic
  const [typing, setTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const handleInputChange = (e) => {
    setMessage(e.target.value);

    if (!typing) {
      setTyping(true);
      socketRef.current.emit('typing', { name, room });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      socketRef.current.emit('stopTyping', { name, room });
    }, 1000);
  };

  // Emoji picker logic
  const addEmoji = (emoji) => {
    setMessage((prev) => prev + emoji.native); // Ensure correct emoji addition
    setShowEmojiPicker(false);
  };

  return (
    <div className='chatContainer'>
      <div className='chatHeader'>
        <img className="onlineIcon" src={onlineIcon} alt='Online Icon' />
        <h2>{room}</h2>
        <a href='/'><img src={closeIcon} alt='Close Icon' /></a>
      </div>
      <div className='chatBody'>
        <div className='chatMessage'>
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.user === name.trim() ? 'ownMessage' : ''}`}
            >
              <p>
                <strong>{msg.user}</strong> <span className="timestamp">{dayjs(msg.time).format('h:mm A')}</span>
                <br />
                {msg.text}
              </p>
            </div>
          ))}
          {typingUsers.length > 0 && (
            <div className='typingIndicator'>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}
        </div>
        <div className='userList'>
          <h3>Users Online</h3>
          <ul>
            {users.map((user, index) => (
              <li key={index}>
                <img src={onlineIcon} alt='Online' className='userIcon' />
                {user.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className='chatInput'>
        <form onSubmit={sendMessage}>
          <button type='button' className='emojiButton' onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
            😊
          </button>
          {showEmojiPicker && (
            <div className='emojiPicker'>
              <Picker data={data} onEmojiSelect={addEmoji} /> {/* Ensure correct prop usage */}
            </div>
          )}
          <input
            type='text'
            placeholder='Type a message...'
            value={message}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                sendMessage(e);
                e.preventDefault();
              }
            }}
          />
          <button type='submit' className='sendButton'>Send</button>
        </form>
      </div>
    </div>
  );
};

export default Chat;

import React, { useState } from 'react' // Importing React and the useState hook for managing state
import { useNavigate } from 'react-router-dom' // Importing Link from react-router-dom to handle navigation
import './Join.css' // Importing CSS file for styling

const Join = () => {
  // Defining state variables to store the name and room inputs
  const navigate = useNavigate();
  const [name, setName] = useState('') // 'name' state will store the user's name
  const [room, setRoom] = useState('') // 'room' state will store the room name
  const [error, setError] = useState('')

  const handleJoin = (e) => {
    e.preventDefault()
    if (!name.trim() || !room.trim()) {
      setError('Name and Room are required')
      return
    }
    // Navigate to chat with URL-enconded parameters
    navigate(`/chat?name=${encodeURIComponent(name)}&room=${encodeURIComponent(room)}`)
  }
  return (
    <div className='joinOuterContainer'>
      <div className='joinInnerContainer'>
        <h1 className='heading'>Join Chat</h1>
        <form onSubmit={handleJoin}>
          <div className='inputGroup'>
            <label htmlFor='name'>Name</label>
            <input
              id='name'
              className='joinInput'
              placeholder='Enter your name'
              type='text'
              value={name}
              onChange={e => setName(e.target.value)}// Update 'name' state when the input changes
              required
            />
          </div>
          <div className='inputGroup'>
            <label htmlFor='room'>Room</label>
            <input
              id='room'
              className='joinInput'
              placeholder='Enter room name' 
              type='text'
              value={room}
              onChange={e => setRoom(e.target.value)} // Update 'room' state when the input changes
              required
            />
          </div>
            {error && <div className='error'>{error}</div>}
            <button className='button mt-20' type='submit'>Sign In</button>
        </form>
      </div>
    </div>
  )
}
// Exporting the Join component for use in other parts of the application
export default Join

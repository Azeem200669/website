import { useState, useEffect } from "react";
import Dashboard from "../../components/common/Dashboard";
import { useUser } from "../../contexts/UserContext";
import { listenToEvents, createEvent, toggleEventAttendance, deleteEvent, updateEvent } from "../../services/eventService";
import { listenToSpaces, joinSpace } from "../../services/spaceService";
import "./events.css";

// ✅ Countdown Timer Component
const EventCountdown = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!targetDate) return;
    
    const calculateTime = () => {
      const now = new Date();
      const diff = targetDate - now;
      
      if (diff <= 0) {
        setTimeLeft("Live now");
        return clearInterval(timer);
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (days > 0) setTimeLeft(`${days}d ${hrs}h ${mins}m`);
      else if (hrs > 0) setTimeLeft(`${hrs}h ${mins}m ${secs}s`);
      else setTimeLeft(`${mins}m ${secs}s`);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;
  return <span className="countdown-timer">⏱️ Starts in {timeLeft}</span>;
};

// ✅ Helper to convert 24h (from DB) to 12h objects (for form)
const parseTimeToAmPm = (time24) => {
  if (!time24) return { hour: '12', minute: '00', ampm: 'AM' };
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return { hour: hour12.toString(), minute: m.toString().padStart(2, '0'), ampm };
};

// ✅ Helper to convert 12h objects to 24h string (for DB & Timer)
const convertTo24H = (hour, minute, ampm) => {
  let h = parseInt(hour);
  if (ampm === 'AM') {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${h.toString().padStart(2, '0')}:${minute}`;
};

export default function Events() {
  const { user } = useUser();
  const currentUserUid = user?.uid;

  const [events, setEvents] = useState([]);
  const [mySpaces, setMySpaces] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [editingEventId, setEditingEventId] = useState(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  
  // ✅ Split Time State into Hour, Minute, AM/PM
  const [timeHour, setTimeHour] = useState("12");
  const [timeMinute, setTimeMinute] = useState("00");
  const [timeAmPm, setTimeAmPm] = useState("AM");
  
  const [eventType, setEventType] = useState("in-person");
  const [venue, setVenue] = useState("");
  const [platform, setPlatform] = useState("Zoom");
  const [meetingLink, setMeetingLink] = useState("");
  const [hostType, setHostType] = useState("user");
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const unsub = listenToEvents(setEvents);
    return () => unsub();
  }, []);

    // Fetch Events
  useEffect(() => {
    if (!currentUserUid) return; // ✅ Wait for user to be authenticated
    const unsub = listenToEvents(setEvents);
    return () => unsub();
  }, [currentUserUid]);

  // Fetch User's Spaces for the Host Dropdown
  useEffect(() => {
    if (!currentUserUid) return; // ✅ Wait for user to be authenticated
    const unsub = listenToSpaces((allSpaces) => {
      const joined = allSpaces.filter(s => s.members?.includes(currentUserUid));
      setMySpaces(joined);
    });
    return () => unsub();
  }, [currentUserUid]);

  const resetForm = () => {
    setTitle(""); setDesc(""); setDate(""); 
    setTimeHour("12"); setTimeMinute("00"); setTimeAmPm("AM"); // ✅ Reset Time
    setEventType("in-person"); setVenue(""); setPlatform("Zoom"); setMeetingLink("");
    setHostType("user"); setSelectedSpaceId(""); setEditingEventId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  // ✅ Populate form with event data for editing
  const openEditModal = (e, event) => {
    e.stopPropagation();
    setEditingEventId(event.id);
    setTitle(event.title);
    setDesc(event.description || "");
    setDate(event.date);
    
    // ✅ Parse existing 24h time into 12h AM/PM state
    const { hour, minute, ampm } = parseTimeToAmPm(event.time);
    setTimeHour(hour);
    setTimeMinute(minute);
    setTimeAmPm(ampm);

    setEventType(event.locationType || 'in-person');
    setVenue(event.venue || "");
    setPlatform(event.platform || "Zoom");
    setMeetingLink(event.meetingLink || "");
    setHostType(event.hostType || 'user');
    setSelectedSpaceId(event.hostType === 'space' ? event.hostId : "");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !date.trim()) return;
    setIsCreating(true);

    try {
      let hostData = { hostType: 'user', hostId: currentUserUid, hostName: user?.name || 'You', hostAvatar: user?.avatar || null };

      if (hostType === 'space' && selectedSpaceId) {
        const space = mySpaces.find(s => s.id === selectedSpaceId);
        if (space) {
          hostData = { hostType: 'space', hostId: space.id, hostName: space.name, hostAvatar: space.avatar || null };
        }
      }

      // ✅ Convert AM/PM back to 24h string before saving
      const time24 = convertTo24H(timeHour, timeMinute, timeAmPm);

      const payload = {
        title, description: desc, date, time: time24,
        locationType: eventType,
        venue: eventType === 'in-person' ? venue : '',
        platform: eventType === 'online' ? platform : '',
        meetingLink: eventType === 'online' ? meetingLink : '',
        ...hostData
      };

      if (editingEventId) {
        await updateEvent(editingEventId, payload);
      } else {
        await createEvent(currentUserUid, payload, user);
      }

      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error("Error saving event:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleAttendance = async (e, event) => {
    e.stopPropagation();
    const isAttending = event.attendeeIds?.includes(currentUserUid);
    try {
      await toggleEventAttendance(event.id, currentUserUid, isAttending, user);
    } catch (error) { console.error("Error:", error); }
  };

  const handleDeleteEvent = async (e, eventId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to cancel and delete this event?")) {
      try {
        await deleteEvent(eventId);
      } catch (error) { console.error("Error deleting event:", error); }
    }
  };

  const handleJoinSpace = async (e, spaceId) => {
    e.stopPropagation();
    try {
      await joinSpace(spaceId, currentUserUid);
    } catch (error) { console.error("Error joining space:", error); }
  };

  const filteredEvents = events.filter(event => event.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const formatDate = (dateStr) => {
    if (!dateStr) return "TBD";
    try { return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); } 
    catch { return dateStr; }
  };

  // ✅ Generate arrays for time dropdowns
  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <Dashboard>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1>📅 Events</h1>
            <p className="subtitle">Discover upcoming events in your Orbit.</p>
          </div>
          <button className="create-btn" onClick={openCreateModal}>+ Create Event</button>
        </div>

        <div className="event-search-wrapper">
          <span className="search-icon-left">🔍</span>
          <input type="text" placeholder="Search events..." className="event-search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          {searchQuery && <button className="search-clear-btn" onClick={() => setSearchQuery("")}>✕</button>}
        </div>

        <div className="events-grid">
          {filteredEvents.map((event, index) => {
            const isAttending = event.attendeeIds?.includes(currentUserUid);
            const isCreator = event.createdBy === currentUserUid;
            const attendees = event.attendeesMap ? Object.values(event.attendeesMap) : [];
            const isOnline = event.locationType === 'online' || event.location?.toLowerCase() === 'online';
            
            // ✅ Timer Logic uses the 24h time string saved in DB
            const eventDateTime = event.date ? new Date(`${event.date}T${event.time || '23:59'}`) : null;
            const isUpcoming = eventDateTime ? eventDateTime > new Date() : false;
            const minutesUntil = eventDateTime ? (eventDateTime - new Date()) / 60000 : 0;
            const isMemberOfHostSpace = event.hostType === 'space' && mySpaces.some(s => s.id === event.hostId);

            return (
              <div key={event.id} className="event-card" style={{ animationDelay: `${index * 0.05}s` }}>
                
                <div className="card-actions-top">
                  {isCreator && (
                    <>
                      <button className="action-icon-btn" onClick={(e) => openEditModal(e, event)} title="Edit Event">✏️</button>
                      <button className="action-icon-btn" onClick={(e) => handleDeleteEvent(e, event.id)} title="Delete Event">🗑️</button>
                    </>
                  )}
                </div>

                <div className="event-date-badge">
                  <span className="event-month">{event.date ? new Date(event.date).toLocaleString('default', { month: 'short' }) : "TBD"}</span>
                  <span className="event-day">{event.date ? new Date(event.date).getDate() : "?"}</span>
                </div>

                <div className="event-content">
                  <h3>{event.title}</h3>
                  
                  <div className="event-host">
                    <img 
                      className="host-avatar"
                      src={event.hostAvatar || `https://ui-avatars.com/api/?name=${event.hostName}&background=7c3aed&color=fff`} 
                      alt="" 
                    />
                    <span>Hosted by <strong>{event.hostName}</strong></span>
                  </div>

                  {event.hostType === 'space' && !isCreator && !isMemberOfHostSpace && (
                    <button className="join-space-btn" onClick={(e) => handleJoinSpace(e, event.hostId)}>
                      Join {event.hostName}
                    </button>
                  )}

                  {isOnline ? (
                    <div className="event-meta online-meta">
                      <span>💻 {event.platform || 'Online Event'}</span>
                      {isUpcoming && minutesUntil > 15 ? (
                        <EventCountdown targetDate={eventDateTime} />
                      ) : event.meetingLink ? (
                        <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="join-meeting-btn" onClick={(e) => e.stopPropagation()}>
                          Join Link ↗
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <p className="event-meta">📍 {event.venue || event.location || "Location TBD"}</p>
                  )}

                  <p className="event-desc">{event.description || "Details coming soon."}</p>
                  
                  <div className="attendee-section">
                    <div className="attendee-avatars">
                      {attendees.slice(0, 5).map((a, i) => (
                        <img key={i} src={a.avatar || `https://ui-avatars.com/api/?name=${a.name}&background=random&color=fff`} alt={a.name} title={a.name} />
                      ))}
                      {attendees.length > 5 && <span className="more-attendees">+{attendees.length - 5}</span>}
                    </div>
                    <span className="attendee-count">{event.attendeeCount || 0} Going</span>
                  </div>

                  <div className="event-footer">
                    {!isCreator ? (
                      <button 
                        className={`join-btn ${isAttending ? 'active' : ''}`} 
                        onClick={(e) => handleToggleAttendance(e, event)}
                      >
                        {isAttending ? "✓ Going" : "Join Event"}
                      </button>
                    ) : (
                      <span className="creator-badge">Organizer</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{editingEventId ? 'Edit Event' : 'Host New Event'}</h2>
              <p className="modal-subtitle">{editingEventId ? 'Update your event details.' : 'Organize an event for yourself or a Space.'}</p>
              
              <form onSubmit={handleSubmit}>
                <div className="edit-group">
                  <label>Host As</label>
                  <select 
                    value={hostType === 'space' ? selectedSpaceId : 'user'} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'user') { setHostType('user'); setSelectedSpaceId(''); } 
                      else { setHostType('space'); setSelectedSpaceId(val); }
                    }} 
                    className="host-select"
                  >
                    <option value="user">Myself ({user?.name || 'Me'})</option>
                    {mySpaces.length > 0 && (
                      <optgroup label="Your Spaces">
                        {mySpaces.map(space => <option key={space.id} value={space.id}>{space.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="edit-group">
                  <label>Event Title</label>
                  <input type="text" placeholder="e.g. React Conf 2026" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>

                <div className="edit-group-row">
                  <div className="edit-group">
                    <label>Date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                  </div>
                  
                  {/* ✅ Custom Time Selector with AM/PM */}
                  <div className="edit-group">
                    <label>Time</label>
                    <div className="time-select-row">
                      <select value={timeHour} onChange={(e) => setTimeHour(e.target.value)} className="host-select time-select" required>
                        {hours.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <select value={timeMinute} onChange={(e) => setTimeMinute(e.target.value)} className="host-select time-select" required>
                        {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select value={timeAmPm} onChange={(e) => setTimeAmPm(e.target.value)} className="host-select time-select ampm-select" required>
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="edit-group">
                  <label>Location Type</label>
                  <div className="event-type-toggle">
                    <button type="button" className={eventType === 'in-person' ? 'active' : ''} onClick={() => setEventType('in-person')}>📍 In-Person</button>
                    <button type="button" className={eventType === 'online' ? 'active' : ''} onClick={() => setEventType('online')}>💻 Online</button>
                  </div>
                </div>

                {eventType === 'in-person' ? (
                  <div className="edit-group">
                    <label>Venue / City</label>
                    <input type="text" placeholder="e.g. San Francisco, CA" value={venue} onChange={(e) => setVenue(e.target.value)} />
                  </div>
                ) : (
                  <>
                    <div className="edit-group">
                      <label>Platform</label>
                      <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="host-select">
                        <option value="Zoom">Zoom</option>
                        <option value="Google Meet">Google Meet</option>
                        <option value="Microsoft Teams">Microsoft Teams</option>
                        <option value="Discord">Discord</option>
                        <option value="YouTube Live">YouTube Live</option>
                        <option value="Twitch">Twitch</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="edit-group">
                      <label>Meeting Link</label>
                      <input type="url" placeholder="https://zoom.us/j/..." value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} required={eventType === 'online'} />
                    </div>
                  </>
                )}

                <div className="edit-group">
                  <label>Description</label>
                  <textarea placeholder="What is this event about?" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
                </div>

                <div className="modal-actions">
                  <button type="button" className="modal-cancel" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                  <button type="submit" className="save-btn" disabled={isCreating}>
                    {isCreating ? "Saving..." : (editingEventId ? "Update Event" : "Create Event")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Dashboard>
  );
}
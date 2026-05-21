# Pause/Resume Feature Documentation

## Overview
The Focus Timer now includes pause/resume functionality that allows users to temporarily pause their focus sessions. **Pausing negatively impacts the focus score** to encourage continuous focus and discourage overuse of this feature.

## Features Implemented

### 1. Pause/Resume State Management
- **State Variables Added:**
  - `isPaused`: Boolean tracking if session is currently paused
  - `pauseCount`: Number of times the session has been paused
  - `totalPauseTime`: Total seconds the session has been paused
  - `pauseStartTime`: Timestamp when current pause started
  - `pauseTimeRef`: Ref tracking accumulated pause time in milliseconds

### 2. Focus Score Penalty System

The focus score is reduced based on pause behavior:

#### Pause Count Penalty
- **-5 points per pause**
- **Maximum penalty: -40 points** (capped at 8 pauses)
- Example: 3 pauses = -15 points

#### Pause Duration Penalty
- **-1 point per 30 seconds paused**
- **Maximum penalty: -20 points**
- Example: 5 minutes paused = -10 points

#### Total Maximum Pause Penalty
- Combined maximum: **-60 points** from pauses (40 from count + 20 from duration)
- This is in addition to any other penalties (timeout, distractions)

### 3. Timer Behavior

#### When Paused:
- Timer display stops counting down
- Active time tracking is finalized
- End time is extended by pause duration (so users get full session time)
- Yellow warning banner appears showing pause statistics
- Pause button changes to green "Resume" button

#### When Resumed:
- Timer resumes from where it left off
- Active time tracking restarts
- Pause duration is recorded
- Button changes back to yellow "Pause"

### 4. UI Controls

#### Button Controls
- **Pause Button**: Yellow button with pause icon (visible when running)
- **Resume Button**: Green button with play icon (visible when paused)
- Located between Start and End Session buttons

#### Warning Banner
When paused, a yellow animated banner displays:
- Current pause count
- Focus score penalty from pauses
- Total pause time accumulated

#### Keyboard Shortcuts
- **P**: Toggle pause/resume (when session is running)
- Works alongside existing shortcuts (S, E, M)

### 5. Session Analytics

Pause metrics are saved with each session:

```typescript
analytics: {
  focusScore: number,          // Reduced by pause penalties
  distractionCount: number,
  actualFocusTime: number,     // Seconds of actual focus (excludes pause time)
  plannedFocusTime: number,    // Original session duration
  focusEfficiency: number,     // Completion percentage
  timedOut: boolean,
  pauseCount: number,          // NEW: Number of pauses
  totalPauseTime: number,      // NEW: Total seconds paused
  pausePenalty: boolean        // NEW: Flag indicating pause penalty applied
}
```

### 6. Session History Integration

The Session History view now displays:
- **Pause count** for each session
- **Total pause time** in minutes and seconds
- **Detailed penalty breakdown** in expanded view
- **Combined interruption metrics** (distractions + pauses)

Focus score breakdown shows:
- Pause Penalty: -X points (from pause count)
- Pause Duration Penalty: -X points (from time paused)

## User Experience Flow

### Typical Session with Pause

1. **Start Session** → Timer begins counting down
2. **Need Break** → Click "Pause" or press P
3. **Yellow Banner Appears** → Shows penalty warning
4. **Take Break** → Timer remains frozen
5. **Return** → Click "Resume" or press P
6. **Timer Continues** → From where it left off
7. **Complete Session** → Focus score reflects pause penalties

### Visual Feedback

- **Running**: Yellow "Pause" button, normal timer display
- **Paused**: Green "Resume" button, yellow warning banner with pulse animation
- **Penalties**: Clearly shown in yellow banner and post-session analytics

## Best Practices Guidance

The UI educates users about pause impact:

1. **Keyboard Shortcuts Modal**
   - Shows pause penalty warning: "⚠️ Note: Pausing reduces your focus score"

2. **Pause Warning Banner**
   - Real-time penalty calculation displayed
   - Total pause time shown
   - Encourages quick return to work

3. **Session History**
   - Detailed breakdown shows exact penalty amounts
   - Helps users understand focus score calculation
   - Encourages better focus habits

## Technical Implementation Details

### Time Tracking Accuracy
- **Pause Time Excluded**: Only active focus time counts toward session duration
- **End Time Extension**: Timer end time is extended by pause duration
- **Tab Visibility**: Pause state is maintained even when tab is hidden
- **Accurate Recording**: Pause metrics are finalized even if session ends while paused

### Edge Cases Handled
1. **Ending while paused**: Pause time is properly finalized
2. **Multiple pauses**: Each pause is tracked and counted
3. **Tab switching during pause**: Pause time continues to accumulate
4. **Extension sync**: Pause state is synced with Chrome extension

## Future Enhancements

Potential improvements for consideration:
- Pause time limit (e.g., max 5 minutes per pause)
- Visual progress bar showing pause vs active time
- Pause reasons tracking (bathroom, emergency, etc.)
- Statistics showing average pause frequency
- Recommended pause intervals based on session type

## Migration Notes

- **Backward Compatible**: Old sessions without pause data will show 0 pauses
- **Default Values**: `pauseCount: 0`, `totalPauseTime: 0` for legacy sessions
- **Optional Fields**: Pause analytics fields are optional in session interface

## Testing Checklist

- [x] Pause button appears when session is running
- [x] Resume button appears when session is paused
- [x] Timer stops counting during pause
- [x] Pause count increments correctly
- [x] Pause time accumulates accurately
- [x] Focus score penalty applies correctly
- [x] Session can be completed while paused
- [x] Pause metrics save to database
- [x] Session history displays pause data
- [x] Keyboard shortcut (P) works
- [x] Warning banner displays correct information
- [x] Multiple pause/resume cycles work correctly

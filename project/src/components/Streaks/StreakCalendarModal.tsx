import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Flame, Calendar as CalendarIcon, Trophy } from 'lucide-react';

interface StreakCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakDates: string[];
  currentStreak: number;
  longestStreak: number;
}

export function StreakCalendarModal({
  isOpen,
  onClose,
  streakDates,
  currentStreak,
  longestStreak
}: StreakCalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const monthName = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  const hasFocusOnDate = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    return streakDates.includes(date.toDateString());
  };

  const isToday = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isFutureDate = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  const totalFocusDays = streakDates.length;

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'from-red-500 to-pink-600';
    if (streak >= 14) return 'from-orange-500 to-red-600';
    if (streak >= 7) return 'from-yellow-500 to-orange-600';
    if (streak >= 3) return 'from-green-500 to-yellow-600';
    return 'from-blue-500 to-green-600';
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalCells = 42;

    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - firstDayOfMonth + 1;
      const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;
      const hasFocus = isValidDay && hasFocusOnDate(dayNumber);
      const isCurrentDay = isValidDay && isToday(dayNumber);
      const isFuture = isValidDay && isFutureDate(dayNumber);

      days.push(
        <div
          key={i}
          className={`
            aspect-square rounded-lg flex flex-col items-center justify-center text-sm
            transition-all duration-300 relative
            ${!isValidDay ? 'invisible' : ''}
            ${isFuture ? 'text-gray-600 cursor-not-allowed' : ''}
            ${
              hasFocus && !isFuture
                ? 'bg-green-500/30 text-green-300 border border-green-500/50 animate-scale-in hover:scale-110 hover:bg-green-500/40'
                : isCurrentDay && !isFuture
                ? 'bg-blue-500/20 text-blue-300 border-2 border-blue-400 hover:bg-blue-500/30'
                : !isFuture
                ? 'bg-white/5 text-gray-400 hover:bg-white/10'
                : 'bg-white/5 text-gray-600'
            }
            ${!isFuture && 'cursor-pointer'}
          `}
          title={
            isValidDay && hasFocus
              ? `Focus session completed on ${new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth(),
                  dayNumber
                ).toLocaleDateString()}`
              : ''
          }
        >
          {isValidDay && (
            <>
              <span className="font-semibold">{dayNumber}</span>
              {hasFocus && !isFuture && (
                <span className="text-xs mt-0.5 animate-pulse">🔥</span>
              )}
            </>
          )}
        </div>
      );
    }
    return days;
  };

  return (
    <div
      className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white/10 backdrop-blur-lg rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/20 transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`bg-gradient-to-r ${getStreakColor(
            currentStreak
          )} p-4 sm:p-6 relative`}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors hover:scale-110"
            aria-label="Close calendar"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <CalendarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Focus Calendar</h2>
              <p className="text-sm text-white/90">Your consistency journey</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm">
              <Flame className="h-5 w-5 text-white mx-auto mb-1" />
              <div className="text-xl font-bold text-white">
                {currentStreak}
              </div>
              <div className="text-xs text-white/80">Current Streak</div>
            </div>

            <div className="bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm">
              <Trophy className="h-5 w-5 text-white mx-auto mb-1" />
              <div className="text-xl font-bold text-white">
                {longestStreak}
              </div>
              <div className="text-xs text-white/80">Best Streak</div>
            </div>

            <div className="bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm">
              <CalendarIcon className="h-5 w-5 text-white mx-auto mb-1" />
              <div className="text-xl font-bold text-white">
                {totalFocusDays}
              </div>
              <div className="text-xs text-white/80">Total Focus Days</div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={previousMonth}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all hover:scale-110"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>

            <div className="text-center">
              <h3 className="text-xl font-bold text-white">{monthName}</h3>
              <button
                onClick={goToCurrentMonth}
                className="text-xs text-blue-300 hover:text-blue-200 mt-1 transition-colors"
              >
                Go to today
              </button>
            </div>

            <button
              onClick={nextMonth}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all hover:scale-110"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-gray-400 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 mb-4">{renderCalendarDays()}</div>

          <div className="flex flex-wrap gap-3 justify-center items-center pt-4 border-t border-white/20">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500/30 border border-green-500/50 rounded"></div>
              <span className="text-sm text-gray-300">Focus Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500/20 border-2 border-blue-400 rounded"></div>
              <span className="text-sm text-gray-300">Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded"></div>
              <span className="text-sm text-gray-300">No Session</span>
            </div>
          </div>

          {currentStreak > 0 && (
            <div className="mt-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-3 text-center">
              <p className="text-green-200 text-xs">
                Keep it up! You're on a {currentStreak}-day streak. Complete a
                session today to continue!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

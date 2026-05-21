import { useState } from 'react';
import { Music, Minimize2 } from 'lucide-react';

interface SpotifyMusicWidgetProps {
  isMinimized?: boolean;
}

const focusPlaylists = [
  { id: '37i9dQZF1DX0XUsuxWHRQd', name: 'Deep Focus', description: 'Keep calm and focus with ambient and post-rock music.' },
  { id: '37i9dQZF1DX4sWSpwq3LiO', name: 'Peaceful Piano', description: 'Relax and indulge with beautiful piano pieces.' },
  { id: '37i9dQZF1DX3Ogo9pFvBkY', name: 'Lofi Hip Hop', description: 'The perfect study beats, twenty four seven.' },
  { id: '37i9dQZF1DWZeKCadgRdKQ', name: 'Instrumental Study', description: 'Focus with soft instrumental music in the background.' }
];

export function SpotifyMusicWidget({ isMinimized: initialMinimized = false }: SpotifyMusicWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  const [selectedPlaylist, setSelectedPlaylist] = useState(focusPlaylists[0]);

  return (
    <div className={`glass-card rounded-2xl border border-white/20 shadow-2xl transition-all duration-300 ${
      isMinimized ? 'w-16 h-16' : 'w-80 h-auto'
    }`}>
      {isMinimized ? (
        <div className="p-4 flex items-center justify-center">
          <button
            onClick={() => setIsMinimized(false)}
            className="text-white hover:text-blue-300 transition-colors"
          >
            <Music className="h-8 w-8" />
          </button>
        </div>
      ) : (
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 p-2 rounded-lg">
                <Music className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Focus Music</h3>
                <p className="text-xs text-gray-300">Spotify Playlists</p>
              </div>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Focus Playlist
            </label>
            <select
              value={selectedPlaylist.id}
              onChange={(e) => {
                const playlist = focusPlaylists.find(p => p.id === e.target.value);
                if (playlist) setSelectedPlaylist(playlist);
              }}
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {focusPlaylists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">{selectedPlaylist.description}</p>
          </div>

          <div className="mb-4">
            <iframe
              src={`https://open.spotify.com/embed/playlist/${selectedPlaylist.id}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-lg"
            />
          </div>

          <div className="pt-3 border-t border-white/20">
            <p className="text-xs text-gray-400 text-center">
              🎵 Spotify Focus Playlists
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
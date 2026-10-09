<template>
  <div class="app">
    <!-- Header -->
    <div class="header">
      <div v-if="detailView" class="header-back" @click="closeDetail()">
        <span class="back-arrow">←</span>
        <h1>{{ detailView.name }}</h1>
      </div>
      <template v-else>
        <h1>My Music</h1>
        <span class="song-count">{{ library.length }} songs</span>
      </template>
    </div>

    <!-- Tabs (hidden in detail view) -->
    <div v-if="!detailView" class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >{{ tab.label }}</button>
    </div>

    <!-- Search -->
    <div class="search-bar">
      <input
        v-model="search"
        type="text"
        :placeholder="searchPlaceholder"
        class="search-input"
      />
      <button v-if="search" class="clear-btn" @click="search = ''">×</button>
    </div>

    <!-- Content Area -->
    <div class="content-area">
      <div v-if="loading" class="loading">Scanning music library...</div>

      <!-- Detail View (album/artist/genre songs) -->
      <template v-else-if="detailView">
        <div class="detail-header-info">
          <div class="detail-meta">{{ detailView.songs.length }} songs</div>
          <div class="detail-actions">
            <button class="action-btn" @click="playAllDetail()">▶ Play All</button>
            <button class="action-btn" @click="shuffleDetail()">⇄ Shuffle</button>
          </div>
        </div>
        <div
          v-for="song in detailView.songs"
          :key="song.id"
          class="song-item"
          :class="{ active: currentTrack && currentTrack.id === song.id }"
          @click="playFromDetail(song)"
        >
          <div class="song-info">
            <div class="song-title">{{ song.title }}</div>
            <div class="song-artist">{{ detailView.type === 'artist' ? song.album : song.artist }}</div>
          </div>
          <div class="song-duration">{{ formatDuration(song.duration) }}</div>
        </div>
      </template>

      <!-- Songs Tab -->
      <template v-else-if="activeTab === 'songs'">
        <div v-if="filteredSongs.length === 0" class="empty">
          {{ search ? 'No matches found' : 'No music found on device' }}
        </div>
        <div
          v-for="song in filteredSongs"
          :key="song.id"
          class="song-item"
          :class="{ active: currentTrack && currentTrack.id === song.id }"
          @click="playSong(song)"
        >
          <div class="song-info">
            <div class="song-title">{{ song.title }}</div>
            <div class="song-artist">{{ song.artist || 'Unknown Artist' }}</div>
          </div>
          <div class="song-duration">{{ formatDuration(song.duration) }}</div>
        </div>
      </template>

      <!-- Albums Tab -->
      <template v-else-if="activeTab === 'albums'">
        <div v-if="filteredAlbums.length === 0" class="empty">
          {{ search ? 'No matches found' : 'No albums found' }}
        </div>
        <div
          v-for="album in filteredAlbums"
          :key="album.name"
          class="group-item"
          @click="openDetail('album', album.name, album.songs)"
        >
          <div class="group-icon album-icon">♫</div>
          <div class="group-info">
            <div class="group-name">{{ album.name }}</div>
            <div class="group-meta">{{ album.artist }} · {{ album.songs.length }} songs</div>
          </div>
          <div class="group-arrow">›</div>
        </div>
      </template>

      <!-- Artists Tab -->
      <template v-else-if="activeTab === 'artists'">
        <div v-if="filteredArtists.length === 0" class="empty">
          {{ search ? 'No matches found' : 'No artists found' }}
        </div>
        <div
          v-for="artist in filteredArtists"
          :key="artist.name"
          class="group-item"
          @click="openDetail('artist', artist.name, artist.songs)"
        >
          <div class="group-icon artist-icon">♪</div>
          <div class="group-info">
            <div class="group-name">{{ artist.name }}</div>
            <div class="group-meta">{{ artist.albumCount }} albums · {{ artist.songs.length }} songs</div>
          </div>
          <div class="group-arrow">›</div>
        </div>
      </template>

      <!-- Genres Tab -->
      <template v-else-if="activeTab === 'genres'">
        <div v-if="filteredGenres.length === 0" class="empty">
          {{ search ? 'No matches found' : 'No genres found' }}
        </div>
        <div
          v-for="genre in filteredGenres"
          :key="genre.name"
          class="group-item"
          @click="openDetail('genre', genre.name, genre.songs)"
        >
          <div class="group-icon genre-icon">♬</div>
          <div class="group-info">
            <div class="group-name">{{ genre.name }}</div>
            <div class="group-meta">{{ genre.artistCount }} artists · {{ genre.songs.length }} songs</div>
          </div>
          <div class="group-arrow">›</div>
        </div>
      </template>
    </div>

    <!-- Mini Player -->
    <div v-if="currentTrack" class="mini-player" @click="showNowPlaying = true">
      <div class="mini-progress" :style="{ width: progressPercent + '%' }"></div>
      <div class="mini-content">
        <div class="mini-info">
          <div class="mini-title">{{ currentTrack.title }}</div>
          <div class="mini-artist">{{ currentTrack.artist || 'Unknown Artist' }}</div>
        </div>
        <div class="mini-controls">
          <button class="ctrl-btn" @click.stop="prev()">⏮</button>
          <button class="ctrl-btn play-btn" @click.stop="togglePlayPause()">
            {{ isPlaying ? '⏸' : '▶' }}
          </button>
          <button class="ctrl-btn" @click.stop="next()">⏭</button>
        </div>
      </div>
    </div>

    <!-- Now Playing Overlay -->
    <div v-if="showNowPlaying && currentTrack" class="now-playing">
      <div class="np-header">
        <button class="np-close" @click="showNowPlaying = false">▼</button>
        <span class="np-label">Now Playing</span>
        <span></span>
      </div>

      <div class="np-art">
        <div class="np-disc" :class="{ spinning: isPlaying }">♫</div>
      </div>

      <div class="np-track-info">
        <div class="np-title">{{ currentTrack.title }}</div>
        <div class="np-artist">{{ currentTrack.artist || 'Unknown Artist' }}</div>
        <div class="np-album">{{ currentTrack.album || '' }}</div>
      </div>

      <div class="np-progress">
        <input
          type="range"
          class="seek-bar"
          min="0"
          :max="duration || 0"
          :value="progress"
          @input="seek(Number($event.target.value))"
        />
        <div class="np-times">
          <span>{{ formatTime(progress) }}</span>
          <span>{{ formatTime(duration) }}</span>
        </div>
      </div>

      <div class="np-controls">
        <button class="np-btn" :class="{ active: shuffled }" @click="toggleShuffle()">⇄</button>
        <button class="np-btn" @click="prev()">⏮</button>
        <button class="np-btn np-play" @click="togglePlayPause()">
          {{ isPlaying ? '⏸' : '▶' }}
        </button>
        <button class="np-btn" @click="next()">⏭</button>
        <button class="np-btn" :class="{ active: repeatMode !== 'off' }" @click="toggleRepeat()">
          {{ repeatMode === 'one' ? '🔂' : '🔁' }}
        </button>
      </div>

      <div class="np-volume">
        <span class="vol-icon">🔊</span>
        <input
          type="range"
          class="volume-bar"
          min="0"
          max="1"
          step="0.01"
          :value="volume"
          @input="setVolume(Number($event.target.value))"
        />
      </div>

      <!-- Queue preview -->
      <div class="np-queue-label" @click="showQueue = !showQueue">
        Up Next ({{ queue.length - currentIndex - 1 }}) {{ showQueue ? '▲' : '▼' }}
      </div>
      <div v-if="showQueue" class="np-queue">
        <div
          v-for="(track, i) in upNext"
          :key="track.id + '-' + i"
          class="np-queue-item"
          @click="jumpToQueue(i)"
        >
          <span class="np-queue-title">{{ track.title }}</span>
          <span class="np-queue-artist">{{ track.artist }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { usePlayer } from './composables/usePlayer.js'

const MusicPlugin = registerPlugin('MusicPlugin')

const {
  library, queue, currentTrack, currentIndex, isPlaying, progress, duration,
  shuffled, repeatMode, volume, loading,
  playAll, playTrackFromList, togglePlayPause, next, prev,
  seek, setVolume, toggleShuffle, toggleRepeat, formatTime,
  getDemoLibrary,
} = usePlayer()

const tabs = [
  { id: 'songs', label: 'Songs' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
  { id: 'genres', label: 'Genres' },
]
const activeTab = ref('songs')
const search = ref('')
const showNowPlaying = ref(false)
const showQueue = ref(false)
const detailView = ref(null) // { type, name, songs }

const searchPlaceholder = computed(() => {
  if (detailView.value) return 'Search in ' + detailView.value.name + '...'
  const labels = { songs: 'songs', albums: 'albums', artists: 'artists', genres: 'genres' }
  return 'Search ' + (labels[activeTab.value] || 'songs') + '...'
})

// === Computed: Songs ===
const filteredSongs = computed(() => {
  if (!search.value) return library.value
  const q = search.value.toLowerCase()
  return library.value.filter(s =>
    (s.title && s.title.toLowerCase().includes(q)) ||
    (s.artist && s.artist.toLowerCase().includes(q)) ||
    (s.album && s.album.toLowerCase().includes(q)) ||
    (s.genre && s.genre.toLowerCase().includes(q))
  )
})

// === Computed: Albums ===
const albums = computed(() => {
  const map = {}
  for (const s of library.value) {
    const key = s.album || 'Unknown Album'
    if (!map[key]) {
      map[key] = { name: key, artist: s.artist, songs: [], albumId: s.albumId }
    }
    map[key].songs.push(s)
    // Use most common artist
    if (map[key].artist !== s.artist) map[key].artist = 'Various Artists'
  }
  return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
})

const filteredAlbums = computed(() => {
  if (!search.value) return albums.value
  const q = search.value.toLowerCase()
  return albums.value.filter(a =>
    a.name.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)
  )
})

// === Computed: Artists ===
const artists = computed(() => {
  const map = {}
  for (const s of library.value) {
    const key = s.artist || 'Unknown Artist'
    if (!map[key]) {
      map[key] = { name: key, songs: [], albumSet: new Set() }
    }
    map[key].songs.push(s)
    map[key].albumSet.add(s.album)
  }
  return Object.values(map)
    .map(a => ({ name: a.name, songs: a.songs, albumCount: a.albumSet.size }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const filteredArtists = computed(() => {
  if (!search.value) return artists.value
  const q = search.value.toLowerCase()
  return artists.value.filter(a => a.name.toLowerCase().includes(q))
})

// === Computed: Genres ===
const genres = computed(() => {
  const map = {}
  for (const s of library.value) {
    const key = s.genre || 'Unknown'
    if (!map[key]) {
      map[key] = { name: key, songs: [], artistSet: new Set() }
    }
    map[key].songs.push(s)
    map[key].artistSet.add(s.artist)
  }
  return Object.values(map)
    .map(g => ({ name: g.name, songs: g.songs, artistCount: g.artistSet.size }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const filteredGenres = computed(() => {
  if (!search.value) return genres.value
  const q = search.value.toLowerCase()
  return genres.value.filter(g => g.name.toLowerCase().includes(q))
})

// === Computed: progress ===
const progressPercent = computed(() => {
  if (!duration.value) return 0
  return (progress.value / duration.value) * 100
})

// === Computed: up next queue ===
const upNext = computed(() => {
  if (currentIndex.value < 0) return []
  return queue.value.slice(currentIndex.value + 1, currentIndex.value + 21)
})

// === Methods ===
function formatDuration(ms) {
  if (!ms) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function playSong(song) {
  playTrackFromList(filteredSongs.value, song)
}

function openDetail(type, name, songs) {
  detailView.value = { type, name, songs: [...songs] }
  search.value = ''
}

function closeDetail() {
  detailView.value = null
  search.value = ''
}

function playFromDetail(song) {
  playTrackFromList(detailView.value.songs, song)
}

function playAllDetail() {
  if (detailView.value && detailView.value.songs.length) {
    playAll(detailView.value.songs, 0)
  }
}

function shuffleDetail() {
  if (detailView.value && detailView.value.songs.length) {
    const songs = [...detailView.value.songs]
    // Shuffle the array
    for (let i = songs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [songs[i], songs[j]] = [songs[j], songs[i]]
    }
    playAll(songs, 0)
  }
}

function jumpToQueue(offsetFromCurrent) {
  const idx = currentIndex.value + 1 + offsetFromCurrent
  if (idx < queue.value.length) {
    currentIndex.value = idx
    // Trigger play
    const track = queue.value[idx]
    if (track) {
      const audio = document.querySelector('audio') // won't exist, use playAll approach
    }
    // Re-use playAll logic by just updating index and calling play
    playAll(queue.value, idx)
  }
}

onMounted(async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      loading.value = true
      const result = await MusicPlugin.getLibrary()
      library.value = result.songs || []
      library.value.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    } catch (e) {
      console.error('Failed to load library:', e)
    } finally {
      loading.value = false
    }
  } else {
    // Dev mode: load demo data
    loading.value = true
    setTimeout(() => {
      library.value = getDemoLibrary()
      loading.value = false
    }, 500)
  }
})
</script>

<style>
:root {
  --bg: #0a0a0a;
  --bg-light: #141414;
  --bg-card: #1a1a1a;
  --bg-card-hover: #222;
  --pink: #ff1493;
  --pink-dim: rgba(255, 20, 147, 0.3);
  --text: #e5e5e5;
  --text-muted: #888;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  user-select: none;
  -webkit-user-select: none;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 8px;
  padding-top: calc(env(safe-area-inset-top, 16px) + 16px);
  flex-shrink: 0;
}
.header h1 {
  font-size: 24px;
  font-weight: 700;
  color: var(--pink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.header-back {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  min-width: 0;
}
.back-arrow {
  font-size: 22px;
  color: var(--pink);
  flex-shrink: 0;
}
.song-count {
  color: var(--text-muted);
  font-size: 14px;
  flex-shrink: 0;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  padding: 4px 16px 8px;
  flex-shrink: 0;
}
.tab {
  flex: 1;
  padding: 8px 0;
  background: var(--bg-card);
  border: 1px solid #333;
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.tab.active {
  background: var(--pink);
  border-color: var(--pink);
  color: white;
}

/* Search */
.search-bar {
  padding: 4px 20px 10px;
  position: relative;
  flex-shrink: 0;
}
.search-input {
  width: 100%;
  padding: 10px 36px 10px 14px;
  background: var(--bg-card);
  border: 1px solid #333;
  border-radius: 10px;
  color: var(--text);
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}
.search-input:focus {
  border-color: var(--pink);
}
.search-input::placeholder {
  color: #555;
}
.clear-btn {
  position: absolute;
  right: 28px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 20px;
  cursor: pointer;
}

/* Content */
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px;
  padding-bottom: 90px;
  -webkit-overflow-scrolling: touch;
}
.loading, .empty {
  text-align: center;
  color: var(--text-muted);
  padding: 60px 20px;
  font-size: 15px;
}

/* Detail header */
.detail-header-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 14px 12px;
}
.detail-meta {
  color: var(--text-muted);
  font-size: 13px;
}
.detail-actions {
  display: flex;
  gap: 8px;
}
.action-btn {
  padding: 6px 14px;
  background: var(--pink);
  border: none;
  border-radius: 20px;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.action-btn:active {
  opacity: 0.8;
}

/* Song items */
.song-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}
.song-item:active {
  background: var(--bg-card);
}
.song-item.active {
  background: var(--pink-dim);
}
.song-item.active .song-title {
  color: var(--pink);
}
.song-info {
  flex: 1;
  min-width: 0;
  margin-right: 12px;
}
.song-title {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text);
}
.song-artist {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.song-duration {
  font-size: 13px;
  color: var(--text-muted);
  flex-shrink: 0;
}

/* Group items (albums, artists, genres) */
.group-item {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
  gap: 14px;
}
.group-item:active {
  background: var(--bg-card);
}
.group-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.album-icon {
  background: linear-gradient(135deg, #2a1a2e, #1a1a2e);
  border: 1px solid #333;
}
.artist-icon {
  background: linear-gradient(135deg, #1a2e1a, #1a2a2e);
  border: 1px solid #333;
  border-radius: 50%;
}
.genre-icon {
  background: linear-gradient(135deg, #2e1a1a, #2e2a1a);
  border: 1px solid #333;
}
.group-info {
  flex: 1;
  min-width: 0;
}
.group-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.group-meta {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}
.group-arrow {
  font-size: 20px;
  color: #444;
  flex-shrink: 0;
}

/* Mini Player */
.mini-player {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-light);
  border-top: 1px solid #222;
  padding-bottom: var(--safe-bottom);
  z-index: 10;
  cursor: pointer;
}
.mini-progress {
  height: 2px;
  background: var(--pink);
  transition: width 0.3s linear;
}
.mini-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
}
.mini-info {
  flex: 1;
  min-width: 0;
  margin-right: 12px;
}
.mini-title {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mini-artist {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mini-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ctrl-btn {
  background: none;
  border: none;
  color: var(--text);
  font-size: 18px;
  cursor: pointer;
  padding: 6px;
  line-height: 1;
}
.play-btn {
  font-size: 22px;
}

/* Now Playing */
.now-playing {
  position: fixed;
  inset: 0;
  background: var(--bg);
  z-index: 100;
  display: flex;
  flex-direction: column;
  padding: 0 24px;
  padding-top: calc(env(safe-area-inset-top, 16px) + 8px);
  padding-bottom: calc(var(--safe-bottom) + 20px);
  animation: slideUp 0.25s ease-out;
  overflow-y: auto;
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.np-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  flex-shrink: 0;
}
.np-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
}
.np-label {
  font-size: 13px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.np-art {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
}
.np-disc {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
  border: 3px solid var(--pink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
  box-shadow: 0 0 40px rgba(255, 20, 147, 0.15);
}
.np-disc.spinning {
  animation: spin 4s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.np-track-info {
  text-align: center;
  padding: 8px 0;
  flex-shrink: 0;
}
.np-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.np-artist {
  font-size: 15px;
  color: var(--pink);
}
.np-album {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}

.np-progress {
  padding: 12px 0 4px;
  flex-shrink: 0;
}
.seek-bar {
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: #333;
  border-radius: 2px;
  outline: none;
}
.seek-bar::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--pink);
  cursor: pointer;
}
.np-times {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
}

.np-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 8px 0;
  flex-shrink: 0;
}
.np-btn {
  background: none;
  border: none;
  color: var(--text);
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
  line-height: 1;
  opacity: 0.8;
  transition: opacity 0.15s;
}
.np-btn:active {
  opacity: 1;
}
.np-btn.active {
  color: var(--pink);
  opacity: 1;
}
.np-play {
  font-size: 36px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--pink);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
}

.np-volume {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  flex-shrink: 0;
}
.vol-icon {
  font-size: 16px;
}
.volume-bar {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 3px;
  background: #333;
  border-radius: 2px;
  outline: none;
}
.volume-bar::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--pink);
  cursor: pointer;
}

/* Queue */
.np-queue-label {
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
  padding: 10px 0 4px;
  cursor: pointer;
  flex-shrink: 0;
}
.np-queue {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.np-queue-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 4px;
  border-bottom: 1px solid #1a1a1a;
  cursor: pointer;
}
.np-queue-item:active {
  background: var(--bg-card);
}
.np-queue-title {
  font-size: 13px;
  color: var(--text);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
}
.np-queue-artist {
  font-size: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
}

/* Scrollbar */
.content-area::-webkit-scrollbar,
.np-queue::-webkit-scrollbar {
  width: 4px;
}
.content-area::-webkit-scrollbar-thumb,
.np-queue::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 2px;
}
</style>

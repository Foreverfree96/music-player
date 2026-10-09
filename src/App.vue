<template>
  <div class="app">
    <!-- Header -->
    <div class="header">
      <h1>My Music</h1>
      <span class="song-count">{{ filteredSongs.length }} songs</span>
    </div>

    <!-- Search -->
    <div class="search-bar">
      <input
        v-model="search"
        type="text"
        placeholder="Search songs..."
        class="search-input"
      />
      <button v-if="search" class="clear-btn" @click="search = ''">×</button>
    </div>

    <!-- Song List -->
    <div class="song-list" ref="songListRef">
      <div v-if="loading" class="loading">Scanning music library...</div>
      <div v-else-if="filteredSongs.length === 0" class="empty">
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
    <div v-if="showNowPlaying && currentTrack" class="now-playing" @click.self="showNowPlaying = false">
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { usePlayer } from './composables/usePlayer.js'

const MusicPlugin = registerPlugin('MusicPlugin')

const {
  library, currentTrack, isPlaying, progress, duration,
  shuffled, repeatMode, volume, loading,
  playTrackFromList, togglePlayPause, next, prev,
  seek, setVolume, toggleShuffle, toggleRepeat, formatTime,
} = usePlayer()

const search = ref('')
const showNowPlaying = ref(false)
const songListRef = ref(null)

const filteredSongs = computed(() => {
  if (!search.value) return library.value
  const q = search.value.toLowerCase()
  return library.value.filter(s =>
    (s.title && s.title.toLowerCase().includes(q)) ||
    (s.artist && s.artist.toLowerCase().includes(q)) ||
    (s.album && s.album.toLowerCase().includes(q))
  )
})

const progressPercent = computed(() => {
  if (!duration.value) return 0
  return (progress.value / duration.value) * 100
})

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
    // Dev mode: empty library
    loading.value = false
  }
})
</script>

<style>
:root {
  --bg: #0a0a0a;
  --bg-light: #141414;
  --bg-card: #1a1a1a;
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
}
.header h1 {
  font-size: 24px;
  font-weight: 700;
  color: var(--pink);
}
.song-count {
  color: var(--text-muted);
  font-size: 14px;
}

/* Search */
.search-bar {
  padding: 8px 20px 12px;
  position: relative;
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

/* Song List */
.song-list {
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

/* Disc art placeholder */
.np-art {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}
.np-disc {
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
  border: 3px solid var(--pink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
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
  padding: 16px 0 8px;
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

/* Progress / Seek */
.np-progress {
  padding: 16px 0 8px;
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

/* Controls */
.np-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 12px 0;
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

/* Volume */
.np-volume {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
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

/* Scrollbar */
.song-list::-webkit-scrollbar {
  width: 4px;
}
.song-list::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 2px;
}
</style>
